// project.ts — basic forecasting for category / total spend over time.

export type ProjectionMethod = 'avg' | 'linear';

/** Least-squares fit of y = slope*x + intercept over equally spaced x = 0..n-1. */
export function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0]! };
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += ys[i]!; sxx += i * i; sxy += i * ys[i]!;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export interface Projection {
  history: number[];     // the input series (echoed for charting)
  forecast: number[];    // `periods` projected values
  method: ProjectionMethod;
  monthlyAverage: number; // mean of the trailing window used
}

/**
 * Project a monthly series forward `periods` months.
 * - 'avg': flat line at the mean of the last `window` months (default 3).
 * - 'linear': extrapolate the least-squares trend; clamped at 0 (spend can't go negative).
 */
export function project(series: number[], periods = 6, method: ProjectionMethod = 'avg', window = 3): Projection {
  const n = series.length;
  const tail = series.slice(Math.max(0, n - window));
  const monthlyAverage = tail.length ? tail.reduce((s, v) => s + v, 0) / tail.length : 0;

  let forecast: number[] = [];
  if (method === 'linear' && n >= 2) {
    const { slope, intercept } = linearRegression(series);
    for (let k = 0; k < periods; k++) {
      forecast.push(Math.max(0, slope * (n + k) + intercept));
    }
  } else {
    forecast = Array.from({ length: periods }, () => Math.max(0, monthlyAverage));
  }
  return { history: series, forecast, method, monthlyAverage };
}
