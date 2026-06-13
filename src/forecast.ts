// forecast.ts — statistical forecasting via exponential smoothing (ETS):
//  - additive Holt-Winters with a 12-month seasonal component when there are
//    >= 2 full seasons of history;
//  - damped-trend Holt when there's enough to estimate a trend (no runaway line);
//  - mean otherwise.
// Smoothing parameters are chosen by a small grid search minimising one-step
// in-sample error. Prediction intervals come from the residual standard
// deviation, widening with the horizon (σ·√h), clamped at zero (spend ≥ 0).

export type ForecastMethod = 'seasonal' | 'trend' | 'mean';

export interface Forecast {
  method: ForecastMethod;
  period: number;       // seasonal period used (12), 0 if non-seasonal
  level: number;        // prediction-interval confidence, e.g. 80 or 95
  sigma: number;        // residual standard deviation
  point: number[];      // h-step point forecasts
  lower: number[];      // lower prediction bound
  upper: number[];      // upper prediction bound
}

const Z: Record<number, number> = { 50: 0.674, 80: 1.2816, 90: 1.6449, 95: 1.96 };
const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const clamp0 = (x: number) => (x < 0 ? 0 : x);

interface Fit { point: (h: number) => number; sse: number; resid: number[]; }

// Additive Holt-Winters. Returns a fitted model + in-sample one-step errors.
function fitSeasonal(y: number[], m: number, a: number, b: number, g: number): Fit {
  const n = y.length;
  let lev = mean(y.slice(0, m));
  let tr = (mean(y.slice(m, 2 * m)) - mean(y.slice(0, m))) / m;
  const seas: number[] = [];
  for (let i = 0; i < m; i++) seas[i] = y[i]! - lev; // initial seasonal indices
  const resid: number[] = [];
  let sse = 0;
  for (let t = 0; t < n; t++) {
    const sIdx = t % m;
    const yhat = lev + tr + seas[sIdx]!;
    const e = y[t]! - yhat;
    if (t >= m) { resid.push(e); sse += e * e; }
    const prevLev = lev;
    lev = a * (y[t]! - seas[sIdx]!) + (1 - a) * (lev + tr);
    tr = b * (lev - prevLev) + (1 - b) * tr;
    seas[sIdx] = g * (y[t]! - lev) + (1 - g) * seas[sIdx]!;
  }
  const baseIdx = n % m;
  return { sse, resid, point: (h) => lev + h * tr + seas[(baseIdx + h - 1) % m]! };
}

// Damped-trend Holt (no seasonality).
function fitTrend(y: number[], a: number, b: number, phi: number): Fit {
  const n = y.length;
  let lev = y[0]!;
  let tr = n > 1 ? y[1]! - y[0]! : 0;
  const resid: number[] = [];
  let sse = 0;
  for (let t = 1; t < n; t++) {
    const yhat = lev + phi * tr;
    const e = y[t]! - yhat;
    resid.push(e); sse += e * e;
    const prevLev = lev;
    lev = a * y[t]! + (1 - a) * (lev + phi * tr);
    tr = b * (lev - prevLev) + (1 - b) * phi * tr;
  }
  return { sse, resid, point: (h) => lev + tr * dampSum(phi, h) };
}
// φ + φ² + … + φ^h
function dampSum(phi: number, h: number): number { let s = 0, p = phi; for (let k = 0; k < h; k++) { s += p; p *= phi; } return s; }

function residSigma(resid: number[]): number {
  if (resid.length < 2) return 0;
  return Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / resid.length);
}

const GRID = [0.1, 0.2, 0.3, 0.4, 0.5];
const PHIS = [0.8, 0.85, 0.9, 0.95]; // always damped (< 1) so trends flatten, never run away

export function forecast(series: number[], periods = 3, opts: { level?: number; period?: number } = {}): Forecast {
  const level = opts.level ?? 80;
  const z = Z[level] ?? Z[80]!;
  const m = opts.period ?? 12;
  const n = series.length;

  let best: Fit | null = null;
  let method: ForecastMethod = 'mean';
  let period = 0;

  if (n >= 2 * m) {
    method = 'seasonal'; period = m;
    for (const a of GRID) for (const b of GRID) for (const g of GRID) {
      const f = fitSeasonal(series, m, a, b, g);
      if (!best || f.sse < best.sse) best = f;
    }
  } else if (n >= 4) {
    method = 'trend';
    for (const a of GRID) for (const b of GRID) for (const phi of PHIS) {
      const f = fitTrend(series, a, b, phi);
      if (!best || f.sse < best.sse) best = f;
    }
  }

  if (!best) {
    // Too little history: hold at the recent mean with a flat interval.
    const tail = series.slice(Math.max(0, n - 3));
    const mu = mean(tail);
    const sd = n > 1 ? Math.sqrt(series.reduce((s, x) => s + (x - mean(series)) ** 2, 0) / n) : 0;
    const point: number[] = [], lower: number[] = [], upper: number[] = [];
    for (let h = 1; h <= periods; h++) { point.push(clamp0(mu)); const w = z * sd * Math.sqrt(h); lower.push(clamp0(mu - w)); upper.push(clamp0(mu + w)); }
    return { method: 'mean', period: 0, level, sigma: sd, point, lower, upper };
  }

  const sigma = residSigma(best.resid);
  const point: number[] = [], lower: number[] = [], upper: number[] = [];
  for (let h = 1; h <= periods; h++) {
    const p = clamp0(best.point(h));
    const w = z * sigma * Math.sqrt(h);
    point.push(p); lower.push(clamp0(p - w)); upper.push(clamp0(p + w));
  }
  return { method, period, level, sigma, point, lower, upper };
}
