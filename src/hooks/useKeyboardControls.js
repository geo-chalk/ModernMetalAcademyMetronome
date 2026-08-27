import {useEffect, useRef} from 'react';
import {BPM_STEP_LARGE, BPM_STEP_SMALL} from '../constants/bpm';

const isTypingTarget = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable === true;
};

/**
 * The app's single window-level keydown listener.
 *
 * @param onSpace  Space — start / stop.
 * @param onTap    T — tap tempo. `T` rather than a modifier: a modifier's
 *                 keydown fires *before* the key it modifies, so Shift+Tab or
 *                 Shift+Arrow would each inject a phantom tap, and deferring to
 *                 keyup to disambiguate would fold the whole press duration into
 *                 the rhythmic measurement. `T` is also the DAW convention.
 * @param onNudge  Arrows — called with a BPM delta. Left/Right step by
 *                 BPM_STEP_SMALL, Up/Down by BPM_STEP_LARGE, matching the
 *                 slider's -20/-5/+5/+20 quick-jump buttons.
 * @param onSnap   R — round the BPM onto the BPM_STEP_SMALL grid.
 */
export const useKeyboardControls = ({onSpace, onTap, onNudge, onSnap} = {}) => {
    // Handlers behind a ref so the listener binds exactly once. The previous
    // version listed onSpace as a dependency; because useMetronome's start/stop
    // aren't memoized, handleStop -> toggleMetronome changed identity on every
    // render and the listener was torn down and re-added every render. The BPM
    // handlers close over the current tempo, so they change every nudge — all
    // the more reason to keep them out of the listener's dependencies.
    const handlersRef = useRef({onSpace, onTap, onNudge, onSnap});
    useEffect(() => {
        handlersRef.current = {onSpace, onTap, onNudge, onSnap};
    }, [onSpace, onTap, onNudge, onSnap]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.isComposing) return;

            // Never steal a key from a field the user is typing in. activeElement
            // is checked as well as target because an open <select> dropdown can
            // retarget the event to the document.
            //
            // This also fixes an existing bug: Space used to start/stop the
            // metronome while a <select> (Count-in, time signature) had focus,
            // instead of opening its dropdown.
            if (isTypingTarget(event.target) || isTypingTarget(document.activeElement)) return;

            const {onSpace, onTap, onNudge, onSnap} = handlersRef.current;

            // Every shortcut below is a bare keypress; a modifier means the user
            // wants the browser's own binding (Cmd+R reload, Cmd+T new tab,
            // Alt+Arrow history, Shift+Arrow selection).
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            if (event.code === 'Space') {
                if (event.repeat) return;   // holding Space isn't start/stop/start/...
                event.preventDefault();     // page scroll, and re-activating a focused button
                onSpace?.();
                return;
            }

            // Arrow nudges. Auto-repeat is deliberately allowed here — holding an
            // arrow to ramp the tempo is the point, and it's no heavier than
            // dragging the slider, which already fires the setter every pointermove.
            const nudge = {
                ArrowRight: BPM_STEP_SMALL, ArrowLeft: -BPM_STEP_SMALL,
                ArrowUp: BPM_STEP_LARGE, ArrowDown: -BPM_STEP_LARGE
            }[event.key];
            if (nudge !== undefined && onNudge) {
                event.preventDefault();     // arrows would otherwise scroll the settings column
                onNudge(nudge);
                return;
            }

            // Mnemonic keys: match event.key (the printed cap) and event.code (the
            // physical position) so both layouts are covered; toLowerCase also lets
            // the shifted character through.
            const isKey = (letter, code) =>
                event.key?.toLowerCase() === letter || event.code === code;

            if (isKey('t', 'KeyT') && onTap) {
                if (event.repeat) return;   // auto-repeat would inject ~30 phantom taps/sec
                event.preventDefault();
                onTap(event);
                return;
            }

            if (isKey('r', 'KeyR') && onSnap) {
                if (event.repeat) return;   // snapping is idempotent; repeating is just churn
                event.preventDefault();
                onSnap();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
};
