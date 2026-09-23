import {useCallback, useEffect, useRef, useState} from 'react';
import {clampBpm} from '../constants/bpm';

// --- Tuning ---------------------------------------------------------------

// 2000 ms == 30 BPM, below the app's 40 BPM minimum. A gap this long is a new
// attempt, not a very slow beat.
const RESET_MS = 2000;

// 100 ms == 600 BPM, twice the app maximum. Anything faster is a stray
// double-fire (key auto-repeat, a second finger, a compatibility mouse event),
// so it's dropped without disturbing the sequence.
const MIN_INTERVAL_MS = 100;

// 3 taps == 2 intervals. One interval is too noisy to act on: at 150 BPM
// (400 ms) a 20 ms hand error is already +/- 7 BPM.
export const MIN_TAPS = 3;

// 8 taps == 7 intervals == two bars of 4/4 (~3.5 s at 120 BPM). Long enough to
// average out hand jitter, short enough to follow a real tempo change.
const MAX_TAPS = 8;

// An interval this far from the running median isn't jitter.
const OUTLIER_LO = 0.55;
const OUTLIER_HI = 1.80;

// event.timeStamp shares performance.now()'s time origin in every current
// browser, and is stamped when the browser created the event rather than when
// React got round to running our handler. That matters here: the app already
// runs a requestAnimationFrame loop plus a 25 ms scheduler interval, so handler
// entry can lag actual input by tens of milliseconds — exactly the jitter we're
// trying to average out. Guard against legacy epoch-based timeStamps by
// checking the value is plausibly on our origin.
// Deliberately not Tone.now(): different origin, block-quantised, and it would
// make tap tempo depend on an initialised AudioContext.
// Deliberately not Date.now(): coarse and subject to wall-clock adjustment.
const eventTime = (event) => {
    const now = performance.now();
    const ts = event?.timeStamp;
    if (typeof ts === 'number' && ts > 0 && Math.abs(ts - now) < 5000) return ts;
    return now;
};

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Least-squares fit of tap index -> tap time; the slope is the period in ms.
//
// Why regression and not the mean of the intervals: the mean of a window of
// intervals collapses algebraically to (last - first) / (n - 1), which throws
// every interior tap away and is fully hostage to one bad endpoint. For n taps
// with per-tap noise variance s^2, the regression slope has variance
// 12*s^2 / (n*(n^2 - 1)) versus 2*s^2 / (n - 1)^2 for the mean — about 1.7x
// tighter at n = 8. And it degrades gracefully: at n = 3 the two are
// algebraically identical, so a short window needs no special case.
//
// Why not the median of intervals: robust to a single outlier, but with only
// 2-7 intervals it's effectively one sampled interval, and its variance for
// Gaussian noise is ~1.57x the mean's. Robustness is handled separately, by
// gating outliers before they enter the window.
const periodFromTaps = (taps) => {
    const n = taps.length;
    const meanIndex = (n - 1) / 2;
    let meanTime = 0;
    for (let i = 0; i < n; i++) meanTime += taps[i];
    meanTime /= n;

    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
        const di = i - meanIndex;
        num += di * (taps[i] - meanTime);
        den += di * di;
    }
    return den > 0 ? num / den : 0;
};

// --- Hook -----------------------------------------------------------------

/**
 * Shared tap-tempo engine. Both the pointer surface and the keyboard shortcut
 * call the same `tap`.
 *
 * @param onTempo  called with a clamped, rounded BPM once the window holds
 *                 MIN_TAPS entries, and on every tap after that.
 * @param enabled  false suppresses taps and clears the window (Trainer lock).
 * @returns {{tap, reset, tapCount, tapPulse}} `tap` also returns the BPM it
 *          emitted, or null.
 */
export const useTapTempo = (onTempo, {enabled = true} = {}) => {
    // Tap times must live in a ref, not state: two taps can land inside one
    // React batch, and a state read would be a tap stale.
    const tapsRef = useRef([]);
    const intervalsRef = useRef([]);
    const timerRef = useRef(null);
    const onTempoRef = useRef(onTempo);
    const enabledRef = useRef(enabled);

    // Only what the UI renders is state, and only cheap integers.
    const [tapCount, setTapCount] = useState(0);
    const [tapPulse, setTapPulse] = useState(0);

    // Keep the callback fresh without listing it as a dependency anywhere:
    // App's displaySetter changes identity whenever mode/isActive change, and
    // we don't want that churning the window key listener.
    useEffect(() => {
        onTempoRef.current = onTempo;
    }, [onTempo]);

    const reset = useCallback(() => {
        tapsRef.current = [];
        intervalsRef.current = [];
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setTapCount(0);
    }, []);

    useEffect(() => {
        enabledRef.current = enabled;
        if (!enabled) reset();
    }, [enabled, reset]);

    // Timers are the only thing to clean up.
    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    const tap = useCallback((eventOrTime) => {
        if (!enabledRef.current) return null;

        const now = typeof eventOrTime === 'number' ? eventOrTime : eventTime(eventOrTime);
        const taps = tapsRef.current;
        const last = taps.length ? taps[taps.length - 1] : null;
        const dt = last === null ? null : now - last;

        // Stray double-fire: ignore entirely, leave the sequence untouched.
        if (dt !== null && dt < MIN_INTERVAL_MS) return null;

        if (dt === null || dt > RESET_MS) {
            // First tap, or the sequence went stale. Checking the gap here rather
            // than trusting the timer keeps this correct even if the tab was
            // backgrounded and timers were throttled.
            tapsRef.current = [now];
            intervalsRef.current = [];
        } else {
            const intervals = intervalsRef.current;
            const ratio = intervals.length >= 2 ? dt / median(intervals) : 1;

            if (ratio < OUTLIER_LO || ratio > OUTLIER_HI) {
                // Not jitter: either the user changed tempo or fumbled a tap, and
                // those are indistinguishable from a single sample. Re-seeding from
                // the last two taps handles both — a deliberate change is honoured
                // immediately and re-converges in two more taps; a fumble costs the
                // same two taps. Averaging the outlier in would instead poison the
                // estimate for the whole window.
                //
                // Deliberately no half/double-time snapping (ratio near 2.0 or 0.5).
                // It's tempting, but a musician who taps half time should get half
                // time rather than be argued with.
                tapsRef.current = [last, now];
                intervalsRef.current = [dt];
            } else {
                tapsRef.current = [...taps, now].slice(-MAX_TAPS);
                intervalsRef.current = [...intervals, dt].slice(-(MAX_TAPS - 1));
            }
        }

        setTapCount(tapsRef.current.length);
        setTapPulse((p) => p + 1);

        // Re-arm the idle reset. Purely cosmetic — it clears the on-screen
        // counter; the gap check above is what makes the estimate correct.
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            reset();
        }, RESET_MS);

        if (tapsRef.current.length < MIN_TAPS) return null;

        const period = periodFromTaps(tapsRef.current);
        if (period <= 0) return null;

        const bpm = clampBpm(60000 / period);
        onTempoRef.current?.(bpm);
        return bpm;
    }, [reset]);

    return {tap, reset, tapCount, tapPulse};
};
