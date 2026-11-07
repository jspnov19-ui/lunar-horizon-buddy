import { describe, expect, test } from 'bun:test';
import { customSite, nextTransition, rankSites } from './planning';
import { sampleSite } from './analysis';
import { SITES } from './sites';

describe('mission planning rules', () => {
  test('custom coordinates cover the lunar sphere and reject out-of-range values', () => {
    expect(customSite('Pole', -90, 180, 0).lat).toBe(-90);
    expect(() => customSite('Invalid', -91, 0, 0)).toThrow();
    expect(() => customSite('Invalid', 0, 181, 0)).toThrow();
  });
  test('custom horizon uses the entered angle in all twelve sectors', () => {
    expect(customSite('Ridge', -88, 30, 3).horizon).toEqual(Array(12).fill(3));
    expect(() => customSite('Invalid', 0, 0, -1)).toThrow();
  });
  test('power and communication priorities produce opposite trade-off rankings', () => {
    const base = sampleSite(SITES[0], Date.UTC(2026, 2, 1), 7, 24);
    const power = { ...base, illumination: 1, earthVisibility: 0 };
    const comms = { ...base, illumination: 0, earthVisibility: 1 };
    expect(rankSites([comms, power], 'power')[0]).toBe(power);
    expect(rankSites([power, comms], 'comms')[0]).toBe(comms);
  });
  test('next event uses the next state change and never invents an event outside the window', () => {
    const base = sampleSite(SITES[0], Date.UTC(2026, 2, 1), 7, 24);
    const a = { ...base, samples: base.samples.slice(0, 3).map((s, i) => ({ ...s, t: i * 3600000, sunUp: i < 2 })) };
    expect(nextTransition(a, 0, 'sun')).toBe('≈ 2h 00m');
    expect(nextTransition(a, 2, 'sun')).toBe('Beyond this window');
  });
});