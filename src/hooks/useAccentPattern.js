import {useCallback, useMemo} from 'react';
import {useLocalStorage} from './useLocalStorage';
import {defaultAccentsFor, normaliseAccents, sigKey} from '../constants/accents';

const STORAGE_KEY = 'metronome_accent_pattern';

/**
 * The accented beats of the current bar, editable by clicking the beat bars.
 *
 * Stored as a map of signature -> beats rather than one flat array, so a 7/8
 * grouping you worked out survives a trip through 4/4 and back. A signature
 * only gets an entry once you've actually changed it; everything else resolves
 * to its default on read, which keeps the store small and means a build that
 * changes a default is picked up by anyone who never overrode it.
 */
export const useAccentPattern = (timeSigTop, timeSigBottom) => {
    const [store, setStore] = useLocalStorage(STORAGE_KEY, {});
    const key = sigKey(timeSigTop, timeSigBottom);

    const accents = useMemo(
        () => normaliseAccents(store?.[key] ?? defaultAccentsFor(timeSigTop, timeSigBottom), timeSigTop),
        [store, key, timeSigTop, timeSigBottom]
    );

    const write = useCallback((entryKey, beats, top) => {
        setStore(prev => ({
            ...(prev && typeof prev === 'object' ? prev : {}),
            [entryKey]: normaliseAccents(beats, top)
        }));
    }, [setStore]);

    const toggleAccent = useCallback((beat) => {
        const base = normaliseAccents(
            store?.[key] ?? defaultAccentsFor(timeSigTop, timeSigBottom), timeSigTop);
        write(key, base.includes(beat) ? base.filter(b => b !== beat) : [...base, beat], timeSigTop);
    }, [store, key, timeSigTop, timeSigBottom, write]);

    // The signature is passed in rather than taken from the current render:
    // loading a preset sets the meter and the pattern in the same batch, so the
    // key closed over above would still be the meter we're leaving.
    const setAccentsForSig = useCallback((top, bottom, beats) => {
        write(sigKey(top, bottom), beats, top);
    }, [write]);

    return {accents, toggleAccent, setAccentsForSig};
};
