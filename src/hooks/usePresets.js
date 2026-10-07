import {useCallback} from 'react';
import {useLocalStorage} from './useLocalStorage';
import {MAX_PRESETS, TRAINER_PRESETS, normalisePresetName} from '../constants/presets';

const makeId = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Saved drills, newest last. Takes the storage key and the capture / repair pair, so
 * the Trainer and Sequence each keep their own list (defaults to the Trainer's).
 *
 * Presets live on the device, like every other setting. There's no account and no
 * server to sync to — this is a static bundle — so a preset saved here is saved
 * here only. That's the trade for needing no backend at all; an export/import of
 * this same array would be the cheapest way to move them between devices later.
 *
 * Every read goes through validatePreset, not just the writes: the store is
 * localStorage, so its contents can be stale, hand-edited, or written by a build
 * that had different slider bounds. Repairing on the way out means a bad entry
 * costs one wrong-looking value instead of a blank screen.
 */
export const usePresets = ({key, capture, validate} = TRAINER_PRESETS) => {
    const [stored, setStored] = useLocalStorage(key, []);
    const presets = Array.isArray(stored) ? stored : [];

    const save = useCallback((name, state) => {
        const cleanName = normalisePresetName(name);
        if (!cleanName) return null;

        const preset = {id: makeId(), name: cleanName, ...capture(state)};
        setStored(prev => {
            const list = Array.isArray(prev) ? prev : [];
            // Same name overwrites rather than accumulating near-duplicates —
            // "save" on an existing name is almost always an update.
            const existing = list.findIndex(p => p.name === cleanName);
            if (existing !== -1) {
                const next = [...list];
                next[existing] = {...preset, id: list[existing].id};
                return next;
            }
            return [...list, preset].slice(-MAX_PRESETS);
        });
        return preset;
    }, [setStored, capture]);

    // Returns the repaired values for the caller to apply, or null if the id is
    // gone (deleted in another tab, say).
    const load = useCallback((id) => {
        const found = presets.find(p => p.id === id);
        return found ? validate(found) : null;
    }, [presets, validate]);

    const remove = useCallback((id) => {
        setStored(prev => (Array.isArray(prev) ? prev : []).filter(p => p.id !== id));
    }, [setStored]);

    const rename = useCallback((id, name) => {
        const cleanName = normalisePresetName(name);
        if (!cleanName) return;
        setStored(prev => (Array.isArray(prev) ? prev : [])
            .map(p => (p.id === id ? {...p, name: cleanName} : p)));
    }, [setStored]);

    return {presets, save, load, remove, rename, isFull: presets.length >= MAX_PRESETS};
};
