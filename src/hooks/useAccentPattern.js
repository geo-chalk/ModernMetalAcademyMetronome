import {useCallback, useMemo} from 'react';
import {useLocalStorage} from './useLocalStorage';
import {cycleBeat as cycle, defaultPatternFor, isDefaultPattern, normalisePattern, sigKey} from '../constants/accents';

const STORAGE_KEY = 'metronome_accent_pattern';

/**
 * The beat pattern of the current bar — which beats are accented and which are
 * muted — editable by clicking the beat bars.
 *
 * Stored as a map of signature -> {accents, muted} rather than one flat pattern,
 * so a 7/8 grouping you worked out survives a trip through 4/4 and back. A
 * signature only gets an entry once you've actually changed it; everything else
 * resolves to its default on read, which keeps the store small and means a
 * build that changes a default is picked up by anyone who never overrode it.
 *
 * Entries written before muting existed are bare arrays of accented beats;
 * normalisePattern reads those as-is, so the upgrade loses nothing.
 */
export const useAccentPattern = (timeSigTop, timeSigBottom) => {
    const [store, setStore] = useLocalStorage(STORAGE_KEY, {});
    const key = sigKey(timeSigTop, timeSigBottom);

    const pattern = useMemo(
        () => normalisePattern(store?.[key] ?? defaultPatternFor(timeSigTop, timeSigBottom), timeSigTop, timeSigBottom),
        [store, key, timeSigTop, timeSigBottom]
    );

    // Functional updates throughout: the next pattern is computed from the
    // store as it is when the write lands, not from the render that queued it,
    // so two clicks that arrive before a re-render still count as two steps.
    const write = useCallback((entryKey, next, top, bottom) => {
        setStore(prev => {
            const base = prev && typeof prev === 'object' ? prev : {};
            const current = normalisePattern(base[entryKey] ?? defaultPatternFor(top, bottom), top, bottom);
            const value = typeof next === 'function' ? next(current) : next;
            return {...base, [entryKey]: normalisePattern(value, top, bottom)};
        });
    }, [setStore]);

    // accentsEnabled is the Accents switch: off, the cycle skips the accented
    // state (see constants/accents.js).
    const cycleBeat = useCallback((beat, accentsEnabled = true) => {
        write(key, current => cycle(current, beat, accentsEnabled, timeSigTop), timeSigTop, timeSigBottom);
    }, [key, timeSigTop, timeSigBottom, write]);

    // The signature is passed in rather than taken from the current render:
    // loading a preset sets the meter and the pattern in the same batch, so the
    // key closed over above would still be the meter we're leaving.
    const setPatternForSig = useCallback((top, bottom, next) => {
        write(sigKey(top, bottom), next, top, bottom);
    }, [write]);

    // Reset removes the entry rather than writing the default into it: a
    // missing entry resolves to the default on read, so a reset meter also
    // picks up any later change to its default, which a written copy wouldn't.
    const resetPattern = useCallback(() => {
        setStore(prev => {
            if (!prev || typeof prev !== 'object' || !(key in prev)) return prev;
            const {[key]: _, ...rest} = prev;
            return rest;
        });
    }, [setStore, key]);

    const isDefault = useMemo(
        () => isDefaultPattern(pattern, timeSigTop, timeSigBottom),
        [pattern, timeSigTop, timeSigBottom]
    );

    return {pattern, cycleBeat, setPatternForSig, resetPattern, isDefault};
};
