import {useCallback, useEffect, useRef, useState} from 'react';

// Guessing a song's tempo from the file itself, for when typing or tapping it
// is a chore. Runs web-audio-beat-detector over a 40 s window from the middle
// of the track: the file is decoded once (the only time Track mode holds the
// whole thing in memory), analysed, and dropped again.
//
// The detector folds every result into the range it is given — its default of
// 90–180 turns a 200 BPM thrash tune into 100 — so the range is a choice here,
// and ×2 / ÷2 sit next to the result for the cases it still gets an octave out.

export const DETECT_RANGES = [
    {id: 'slow', label: 'Slow', min: 50, max: 110},
    {id: 'mid', label: 'Mid', min: 90, max: 180},
    {id: 'fast', label: 'Fast', min: 140, max: 260},
];

const WINDOW_SEC = 40;

export const useBpmDetection = ({getBlob, trackId}) => {
    const [status, setStatus] = useState('idle');   // idle | working | done | error
    const [result, setResult] = useState(null);     // {bpm, rangeId}
    const [error, setError] = useState(null);
    const runRef = useRef(0);

    // Another track makes the last answer meaningless; a run still in flight for
    // the old one is left to finish and ignored.
    useEffect(() => {
        runRef.current++;
        setStatus('idle');
        setResult(null);
        setError(null);
    }, [trackId]);

    useEffect(() => () => {
        runRef.current++;
    }, []);

    // Resolves to the rounded BPM, or null when it failed or was superseded.
    const detect = useCallback(async (range) => {
        const blob = getBlob?.();
        if (!blob) return null;
        const run = ++runRef.current;
        setStatus('working');
        setError(null);
        let ctx = null;
        try {
            const [{guess}, bytes] = await Promise.all([import('web-audio-beat-detector'), blob.arrayBuffer()]);
            const Ctx = window.AudioContext || window.webkitAudioContext;
            ctx = new Ctx();
            const buffer = await ctx.decodeAudioData(bytes);
            const windowSec = Math.min(WINDOW_SEC, buffer.duration);
            const offset = Math.max(0, (buffer.duration - windowSec) / 2);
            const {bpm} = await guess(buffer, offset, windowSec, {minTempo: range.min, maxTempo: range.max});
            if (run !== runRef.current) return null;
            const rounded = Math.round(bpm);
            setResult({bpm: rounded, rangeId: range.id});
            setStatus('done');
            return rounded;
        } catch {
            if (run === runRef.current) {
                setError('Could not work out the tempo from this file. Type it, or tap it along to the preview.');
                setStatus('error');
            }
            return null;
        } finally {
            ctx?.close().catch(() => {});
        }
    }, [getBlob]);

    return {status, result, error, detect};
};
