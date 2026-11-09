import {useCallback, useMemo} from 'react';
import {useLocalStorage} from './useLocalStorage';
import {clampField} from '../constants/presets';
import {BPM_MAX, BPM_MIN, clampBpm} from '../constants/bpm';
import {
    PCT_MAX, PCT_MIN, RATE_MAX, RATE_MIN, TRACK_FIELDS, TRACK_UNITS,
    bpmToPct, isValidBpm, pctToBpm, rateLadder
} from '../constants/track';

// Every Track-mode setting, as flat localStorage keys like the rest of the app,
// kept here so App.jsx doesn't grow another block of useLocalStorage lines.
//
// Two things live side by side:
//  - the drill (unit, range, step, rest, lock final) — what a preset captures;
//  - the tracks (`meta`, keyed by file id): name, size, length and the song's
//    own tempo. The tempo belongs to the file, not the drill, so it survives a
//    preset load and comes back when the same file is uploaded again.
//
// Percent and BPM are the same quantity (a rate), so both sets are stored and
// switching the unit converts one into the other when the song's tempo is known.

const restoreField = (key) => (v) => clampField(v, TRACK_FIELDS[key]);
const restoreUnit = (u) => (TRACK_UNITS.includes(u) ? u : 'percent');
const restoreVolume = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : 80);
const restoreMeta = (m) => (m && typeof m === 'object' && !Array.isArray(m) ? m : {});
const restoreId = (v) => (typeof v === 'string' && v ? v : null);

const MAX_REMEMBERED_TRACKS = 50;

export const useTrackSettings = () => {
    const [unit, setUnitRaw] = useLocalStorage('metronome_track_range_unit', 'percent', restoreUnit);
    const [startPct, setStartPct] = useLocalStorage('metronome_track_start_pct', 70, restoreField('startPct'));
    const [endPct, setEndPct] = useLocalStorage('metronome_track_end_pct', 100, restoreField('endPct'));
    const [stepPct, setStepPctRaw] = useLocalStorage('metronome_track_step_pct', 5, restoreField('stepPct'));
    const [negStepPct, setNegStepPct] = useLocalStorage('metronome_track_neg_step_pct', 0, restoreField('negStepPct'));
    const [startBpm, setStartBpm] = useLocalStorage('metronome_track_start_bpm', 120, restoreField('startBpm'));
    const [endBpm, setEndBpm] = useLocalStorage('metronome_track_end_bpm', 160, restoreField('endBpm'));
    const [stepBpm, setStepBpmRaw] = useLocalStorage('metronome_track_step_bpm', 4, restoreField('stepBpm'));
    const [negStepBpm, setNegStepBpm] = useLocalStorage('metronome_track_neg_step_bpm', 0, restoreField('negStepBpm'));
    const [restSeconds, setRestSeconds] = useLocalStorage('metronome_track_rest_seconds', 0, restoreField('restSeconds'));
    const [lockFinal, setLockFinal] = useLocalStorage('metronome_track_lock_final', false, v => v === true);
    const [volume, setVolume] = useLocalStorage('metronome_track_volume', 80, restoreVolume);
    const [currentId, setCurrentId] = useLocalStorage('metronome_track_current', null, restoreId);
    const [meta, setMeta] = useLocalStorage('metronome_track_meta', {}, restoreMeta);

    const track = currentId ? (meta[currentId] ?? null) : null;
    const originalBpm = isValidBpm(track?.originalBpm) ? track.originalBpm : null;

    // Metadata outlives the file: replacing a track deletes its blob, not its
    // entry, so its tempo is there if it is picked again. Pruned to the most
    // recently used so the map can't grow without bound.
    const rememberTrack = useCallback((id, info) => {
        setMeta(prev => {
            const all = restoreMeta(prev);
            const next = {...all, [id]: {...(all[id] ?? {}), ...info, lastUsed: Date.now()}};
            const ids = Object.keys(next).sort((a, b) => (next[b].lastUsed ?? 0) - (next[a].lastUsed ?? 0));
            return Object.fromEntries(ids.slice(0, MAX_REMEMBERED_TRACKS).map(k => [k, next[k]]));
        });
    }, [setMeta]);

    const forgetTrack = useCallback((id) => {
        setMeta(prev => {
            const next = {...restoreMeta(prev)};
            delete next[id];
            return next;
        });
    }, [setMeta]);

    // `source` records how the tempo was found (typed / tapped), for the UI.
    const setOriginalBpm = useCallback((bpm, source = 'manual') => {
        if (!currentId) return;
        rememberTrack(currentId, {originalBpm: clampBpm(bpm), bpmSource: source});
    }, [currentId, rememberTrack]);

    // The see-saw never lowers the net speed: the negative step is capped by
    // the positive one, the same invariant as the Trainer's handleIncrementChange.
    const setStepPct = useCallback((val) => {
        setStepPctRaw(val);
        setNegStepPct(prev => Math.min(prev, val));
    }, [setStepPctRaw, setNegStepPct]);
    const setStepBpm = useCallback((val) => {
        setStepBpmRaw(val);
        setNegStepBpm(prev => Math.min(prev, val));
    }, [setStepBpmRaw, setNegStepBpm]);

    // Switching unit keeps the range where it is: 70–100% of a 140 BPM song
    // becomes 98–140 BPM, and back. Without a known tempo there is nothing to
    // convert with, so the BPM unit is unavailable (the toggle is disabled).
    const setUnit = useCallback((next) => {
        if (!TRACK_UNITS.includes(next) || next === unit) return;
        if (next === 'bpm') {
            if (!originalBpm) return;
            setStartBpm(pctToBpm(startPct, originalBpm));
            setEndBpm(pctToBpm(endPct, originalBpm));
            const step = clampField(Math.round(stepPct / 100 * originalBpm), TRACK_FIELDS.stepBpm);
            setStepBpmRaw(step);
            setNegStepBpm(Math.min(step, clampField(Math.round(negStepPct / 100 * originalBpm), TRACK_FIELDS.negStepBpm)));
        } else if (originalBpm) {
            setStartPct(bpmToPct(startBpm, originalBpm));
            setEndPct(bpmToPct(endBpm, originalBpm));
            const step = clampField(Math.round(stepBpm / originalBpm * 100), TRACK_FIELDS.stepPct);
            setStepPctRaw(step);
            setNegStepPct(Math.min(step, clampField(Math.round(negStepBpm / originalBpm * 100), TRACK_FIELDS.negStepPct)));
        }
        setUnitRaw(next);
    }, [unit, originalBpm, startPct, endPct, stepPct, negStepPct, startBpm, endBpm, stepBpm, negStepBpm,
        setStartBpm, setEndBpm, setStepBpmRaw, setNegStepBpm, setStartPct, setEndPct, setStepPctRaw, setNegStepPct, setUnitRaw]);

    // The sliders for whichever unit is active, with their bounds. In the BPM
    // unit the range spans RATE_MIN..RATE_MAX of the song's tempo.
    const range = useMemo(() => {
        if (unit === 'bpm') {
            const min = originalBpm ? clampBpm(originalBpm * RATE_MIN) : BPM_MIN;
            const max = originalBpm ? clampBpm(originalBpm * RATE_MAX) : BPM_MAX;
            return {
                start: startBpm, end: endBpm, step: stepBpm, negStep: negStepBpm,
                setStart: setStartBpm, setEnd: setEndBpm, setStep: setStepBpm, setNegStep: setNegStepBpm,
                min, max, stepMin: TRACK_FIELDS.stepBpm.min, stepMax: TRACK_FIELDS.stepBpm.max, unitLabel: 'bpm'
            };
        }
        return {
            start: startPct, end: endPct, step: stepPct, negStep: negStepPct,
            setStart: setStartPct, setEnd: setEndPct, setStep: setStepPct, setNegStep: setNegStepPct,
            min: PCT_MIN, max: PCT_MAX, stepMin: TRACK_FIELDS.stepPct.min, stepMax: TRACK_FIELDS.stepPct.max, unitLabel: '%'
        };
    }, [unit, originalBpm, startBpm, endBpm, stepBpm, negStepBpm, startPct, endPct, stepPct, negStepPct,
        setStartBpm, setEndBpm, setStepBpm, setNegStepBpm, setStartPct, setEndPct, setStepPct, setNegStepPct]);

    const rates = useMemo(() => rateLadder({
        unit, startPct, endPct, stepPct, negStepPct, startBpm, endBpm, stepBpm, negStepBpm, originalBpm
    }), [unit, startPct, endPct, stepPct, negStepPct, startBpm, endBpm, stepBpm, negStepBpm, originalBpm]);

    // What a preset snapshots, and how one is applied.
    const presetState = {
        unit, startPct, endPct, stepPct, negStepPct, startBpm, endBpm, stepBpm, negStepBpm, restSeconds, lockFinal
    };
    const applyPreset = useCallback((p) => {
        setStartPct(p.startPct); setEndPct(p.endPct); setStepPctRaw(p.stepPct); setNegStepPct(p.negStepPct);
        setStartBpm(p.startBpm); setEndBpm(p.endBpm); setStepBpmRaw(p.stepBpm); setNegStepBpm(p.negStepBpm);
        setRestSeconds(p.restSeconds);
        setLockFinal(p.lockFinal);
        // A BPM drill needs a tempo to mean anything; fall back to percent without one.
        setUnitRaw(p.unit === 'bpm' && !originalBpm ? 'percent' : p.unit);
    }, [originalBpm, setStartPct, setEndPct, setStepPctRaw, setNegStepPct, setStartBpm, setEndBpm, setStepBpmRaw,
        setNegStepBpm, setRestSeconds, setLockFinal, setUnitRaw]);

    return {
        unit, setUnit, range, rates,
        restSeconds, setRestSeconds, lockFinal, setLockFinal, volume, setVolume,
        currentId, setCurrentId, meta, track, originalBpm, setOriginalBpm, rememberTrack, forgetTrack,
        presetState, applyPreset
    };
};
