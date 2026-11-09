import {describe, expect, it} from 'vitest';
import {
    MAX_PASSES, bpmToPct, pctToBpm, rateLadder, rateToBpm, trackSessionSeconds, validateTrackPreset
} from './track';

const pct = (overrides) => rateLadder({
    unit: 'percent', startPct: 70, endPct: 100, stepPct: 10, negStepPct: 0, ...overrides
});

describe('rateLadder', () => {
    it('walks start to end and lands exactly on the end', () => {
        expect(pct({})).toEqual([0.7, 0.8, 0.9, 1]);
    });

    it('clips an overshooting last step to the end', () => {
        expect(pct({stepPct: 7})).toEqual([0.7, 0.77, 0.84, 0.91, 0.98, 1]);
    });

    it('gives a single pass when start equals end', () => {
        expect(pct({endPct: 70})).toEqual([0.7]);
    });

    it('walks down for a descending range', () => {
        expect(pct({startPct: 100, endPct: 80})).toEqual([1, 0.9, 0.8]);
    });

    it('see-saws up and down, starting with an up-step', () => {
        expect(pct({stepPct: 10, negStepPct: 5, endPct: 90})).toEqual([0.7, 0.8, 0.75, 0.85, 0.8, 0.9]);
    });

    it('caps a see-saw that never arrives', () => {
        const rates = pct({stepPct: 10, negStepPct: 10});
        expect(rates).toHaveLength(MAX_PASSES);
    });

    it('never lets the negative step exceed the positive one', () => {
        expect(pct({stepPct: 10, negStepPct: 50, endPct: 90})).toEqual(pct({stepPct: 10, negStepPct: 10, endPct: 90}));
    });

    it('clamps rates to the supported range', () => {
        expect(pct({startPct: 10, endPct: 200, stepPct: 50})).toEqual([0.5, 1, 1.5]);
    });

    it('converts BPM through the original tempo', () => {
        const rates = rateLadder({unit: 'bpm', startBpm: 100, endBpm: 120, stepBpm: 10, originalBpm: 100});
        expect(rates).toEqual([1, 1.1, 1.2]);
    });

    it('is empty in the BPM unit without an original tempo', () => {
        expect(rateLadder({unit: 'bpm', startBpm: 100, endBpm: 120, stepBpm: 10, originalBpm: null})).toEqual([]);
    });
});

describe('trackSessionSeconds', () => {
    it('sums each pass at its rate plus the rests in between', () => {
        // 100 s file: 200 + 100 s of playing, two rests of 10 s.
        expect(trackSessionSeconds([0.5, 1], 100, 10)).toBeCloseTo(310);
        expect(trackSessionSeconds([0.5, 1, 1], 100, 10)).toBeCloseTo(420);
    });

    it('is zero without a duration or without passes', () => {
        expect(trackSessionSeconds([1], 0)).toBe(0);
        expect(trackSessionSeconds([], 100)).toBe(0);
    });
});

describe('conversions', () => {
    it('round-trips percent and BPM through the original tempo', () => {
        expect(pctToBpm(70, 140)).toBe(98);
        expect(bpmToPct(98, 140)).toBe(70);
        expect(rateToBpm(0.75, 120)).toBe(90);
        expect(rateToBpm(0.75, null)).toBeNull();
    });
});

describe('validateTrackPreset', () => {
    it('repairs a stored preset rather than rejecting it', () => {
        const p = validateTrackPreset({startPct: 999, stepPct: 5, negStepPct: 50, unit: 'nope', lockFinal: 'yes'});
        expect(p.startPct).toBe(150);
        expect(p.endPct).toBe(100);          // missing → fallback
        expect(p.negStepPct).toBe(5);        // capped at the positive step
        expect(p.unit).toBe('percent');
        expect(p.lockFinal).toBe(false);
    });

    it('rejects non-objects', () => {
        expect(validateTrackPreset(null)).toBeNull();
    });
});
