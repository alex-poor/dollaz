// scenario.ts — "what-if": apportion the forecast total spend across categories
// by their recent share, then scale each by an adjustment factor to see the
// impact on projected surplus/deficit. Powers Auguries' Crossroads.

export interface Share { id: string; name: string; color: string; share: number; }
export interface SeriesCat { id: string; name: string; color: string; values: number[]; }

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

/** Recent expense share per category (+ an 'Unnamed & sundry' remainder) over the
 *  last `window` months. `totalExpense` is per-month total expense aligned to the
 *  same months. Shares sum to 1 when total > 0. */
export function expenseShares(cats: SeriesCat[], totalExpense: number[], window = 6): Share[] {
  const w = Math.min(window, totalExpense.length) || 1;
  const tail = (arr: number[]) => arr.slice(arr.length - w);
  const total = sum(tail(totalExpense)) || 1;
  const shares: Share[] = cats.map(c => ({ id: c.id, name: c.name, color: c.color, share: sum(tail(c.values)) / total }));
  const named = shares.reduce((s, x) => s + x.share, 0);
  const other = Math.max(0, 1 - named);
  if (other > 0.0001) shares.push({ id: '__other__', name: 'Unnamed & sundry', color: '#9aa0a6', share: other });
  return shares;
}

export interface ScenarioRow { id: string; name: string; color: string; share: number; factor: number; baseMonthly: number; scenMonthly: number; saving: number; }
export interface ScenarioResult {
  mult: number;            // blended expense multiplier (1 = unchanged)
  baseNet: number[];       // baseline net per month (income − expense)
  scenNet: number[];       // scenario net per month
  baseTotalNet: number;
  scenTotalNet: number;
  monthlySaving: number;   // average monthly expense reduction
  rows: ScenarioRow[];
}

/**
 * @param recentIncome    per-month income baseline
 * @param expenseForecast per-month projected total expense (e.g. cashflow.expense.point)
 * @param shares          from expenseShares()
 * @param adjustments     { [catId]: factor } — 1 unchanged, 0 stopped, 0.7 = −30%
 */
export function applyScenario(recentIncome: number, expenseForecast: number[], shares: Share[], adjustments: Record<string, number>): ScenarioResult {
  const mult = shares.reduce((m, s) => m + s.share * (adjustments[s.id] ?? 1), 0);
  const baseNet = expenseForecast.map(e => recentIncome - e);
  const scenNet = expenseForecast.map(e => recentIncome - e * mult);
  const avgExp = sum(expenseForecast) / (expenseForecast.length || 1);
  const rows: ScenarioRow[] = shares.map(s => {
    const factor = adjustments[s.id] ?? 1;
    const baseMonthly = s.share * avgExp;
    return { id: s.id, name: s.name, color: s.color, share: s.share, factor, baseMonthly, scenMonthly: baseMonthly * factor, saving: baseMonthly * (1 - factor) };
  });
  return { mult, baseNet, scenNet, baseTotalNet: sum(baseNet), scenTotalNet: sum(scenNet), monthlySaving: avgExp * (1 - mult), rows };
}
