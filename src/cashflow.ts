// cashflow.ts — forecast surplus/deficit. Raw income and spend are noisy, so we
// forecast the more stable expense÷income RATIO, hold income at its recent level,
// and project net = income·(1 − ratio). Negative net = projected deficit.
import { forecast, type Forecast } from './forecast.js';

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export interface CashflowForecast {
  recentIncome: number;        // income level the projection is applied to (trailing mean)
  method: Forecast['method'];
  ratio: Forecast;             // forecast of expense/income ratio (point/lower/upper)
  expense: { point: number[]; lower: number[]; upper: number[] };
  net: { point: number[]; lower: number[]; upper: number[] }; // surplus(+) / deficit(−)
  verdict: 'surplus' | 'deficit' | 'even';
}

/**
 * @param income   monthly income series (aligned with `expenses`)
 * @param expenses monthly expense series (positive numbers)
 * @param incomeWindow how many recent months to average for the income baseline
 */
export function cashflowForecast(income: number[], expenses: number[], horizon = 3, opts: { level?: number; incomeWindow?: number } = {}): CashflowForecast {
  const win = opts.incomeWindow ?? 3;
  const ratios: number[] = [];
  const incomes: number[] = [];
  for (let i = 0; i < income.length; i++) {
    if (income[i]! > 0) { ratios.push(expenses[i]! / income[i]!); incomes.push(income[i]!); }
  }
  const recentIncome = incomes.length ? mean(incomes.slice(-win)) : 0;
  const ratio = forecast(ratios.length ? ratios : [0], horizon, { level: opts.level ?? 80 });

  const expense = { point: [] as number[], lower: [] as number[], upper: [] as number[] };
  const net = { point: [] as number[], lower: [] as number[], upper: [] as number[] };
  for (let h = 0; h < horizon; h++) {
    const rp = ratio.point[h]!, rl = ratio.lower[h]!, ru = ratio.upper[h]!;
    expense.point.push(rp * recentIncome);
    expense.lower.push(rl * recentIncome);
    expense.upper.push(ru * recentIncome);
    // higher spend ratio → lower net, so net bounds invert the ratio bounds
    net.point.push(recentIncome * (1 - rp));
    net.lower.push(recentIncome * (1 - ru));
    net.upper.push(recentIncome * (1 - rl));
  }
  const avgNet = mean(net.point);
  const verdict = avgNet > recentIncome * 0.01 ? 'surplus' : avgNet < -recentIncome * 0.01 ? 'deficit' : 'even';
  return { recentIncome, method: ratio.method, ratio, expense, net, verdict };
}
