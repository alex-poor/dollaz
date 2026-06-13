import { describe, it, expect } from 'vitest';
import { forecast } from '../src/index.js';

describe('forecast', () => {
  it('captures a 12-month seasonal pattern with >= 2 years of data', () => {
    // 36 months: flat level 1000 + strong seasonal bump every December (index 5,17,29…)
    const season = (i: number) => (i % 12 === 5 ? 600 : 0);
    const y = Array.from({ length: 36 }, (_, i) => 1000 + season(i));
    const f = forecast(y, 12, { period: 12 });
    expect(f.method).toBe('seasonal');
    // the 12-step forecast should contain the seasonal peak (~1600) and normal months (~1000)
    expect(Math.max(...f.point)).toBeGreaterThan(1400);
    expect(Math.min(...f.point)).toBeLessThan(1200);
  });

  it('uses damped trend for short series and does not run away in a straight line', () => {
    const y = [100, 120, 140, 160, 180, 200]; // strong linear rise, 6 pts
    const f = forecast(y, 6);
    expect(f.method).toBe('trend');
    // a naive linear extrapolation would reach 200 + 6*20 = 320; damping keeps it below
    expect(f.point[5]!).toBeLessThan(320);
    expect(f.point[5]!).toBeGreaterThan(200);
  });

  it('produces widening, non-negative prediction intervals', () => {
    const y = [500, 520, 480, 510, 530, 495, 505, 515];
    const f = forecast(y, 3, { level: 80 });
    for (let h = 0; h < 3; h++) {
      expect(f.upper[h]!).toBeGreaterThanOrEqual(f.point[h]!);
      expect(f.point[h]!).toBeGreaterThanOrEqual(f.lower[h]!);
      expect(f.lower[h]!).toBeGreaterThanOrEqual(0);
    }
    expect(f.upper[2]! - f.lower[2]!).toBeGreaterThan(f.upper[0]! - f.lower[0]!); // widens
  });

  it('falls back to mean for tiny series without throwing', () => {
    const f = forecast([300, 320], 3);
    expect(f.method).toBe('mean');
    expect(f.point.length).toBe(3);
    expect(f.point.every(v => v >= 0)).toBe(true);
  });

  it('higher confidence → wider band', () => {
    const y = [500, 520, 480, 510, 530, 495, 505, 515];
    const f80 = forecast(y, 3, { level: 80 });
    const f95 = forecast(y, 3, { level: 95 });
    expect(f95.upper[0]! - f95.lower[0]!).toBeGreaterThan(f80.upper[0]! - f80.lower[0]!);
  });
});
