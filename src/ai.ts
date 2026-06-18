// ai.ts — the read-only tool surface "The Oracle" (in-app chat) exposes to Claude.
// Aggregates ONLY: every tool returns summaries, totals, trends and forecasts —
// never raw transaction rows or descriptions — so the least possible leaves the
// vessel. The agentic loop lives in the UI (ui/oracle.jsx); this module is the
// pure, testable definition of WHAT the model may ask for and HOW it's answered.
import type { Account, Category, Rule, Transaction } from './types.js';
import { summarize, monthlyTotals, byCategoryTotals, byCategoryOverTime, monthRange, expenseSplit, isDiscretionary } from './analyze.js';
import { merchantSummary } from './merchants.js';
import { cashflowForecast } from './cashflow.js';
import { wellbeing } from './wellbeing.js';
import { matchRule } from './categorize.js';
import { suggestMerchant } from './normalize.js';

export interface AiContext {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  rules: Rule[];
  currency: string;
}

/** Tool definitions in the Anthropic Messages `tools` shape. */
export const AI_TOOLS = [
  {
    name: 'overview',
    description: 'Top-level reckoning of the whole ledger: total income, expense, net, transaction count and date span; the financial-wellbeing (Augury) score with its parts (savings rate, emergency-buffer months, share of spend left uncategorised); and current net worth across all vaults. Call this first for any "how am I doing" question.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'monthly_trend',
    description: 'Income, expense and net (surplus/deficit) for each of the most recent months. Use for questions about how spending or saving has moved over time.',
    input_schema: {
      type: 'object',
      properties: { months: { type: 'integer', description: 'How many recent months to return (default 12).' } },
    },
  },
  {
    name: 'category_breakdown',
    description: 'Spending (or income) totalled by sigil/category, biggest first — the names and amounts only. Use for "where does my money go" and "what do I spend most on".',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['expense', 'income'], description: "Default 'expense'." },
        months: { type: 'integer', description: 'Limit to the most recent N months (omit for all history).' },
        top: { type: 'integer', description: 'How many categories to return (default 15).' },
      },
    },
  },
  {
    name: 'category_trend',
    description: "One category's monthly spend over time, to judge whether it is rising or falling. Omit the name to receive the list of available category names.",
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category/sigil name (case-insensitive, partial match allowed).' },
        kind: { type: 'string', enum: ['expense', 'income'] },
        months: { type: 'integer', description: 'How many recent months to return (default 12).' },
      },
    },
  },
  {
    name: 'merchant_spend',
    description: 'Spend grouped by merchant/payee (e.g. how much paid to Countdown), totals and counts only. Optionally filter by a name fragment.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Merchant name fragment to filter by (case-insensitive).' },
        top: { type: 'integer', description: 'How many merchants to return (default 15).' },
      },
    },
  },
  {
    name: 'find_transactions',
    description: 'List INDIVIDUAL transactions (date, amount, description, merchant, sigil, vault) matching filters — for questions about specific charges ("what was that $240 payment?", "show my Countdown transactions last month", "biggest expenses in May"). Returns matching rows (most recent or largest first), capped. Internal transfers are excluded unless includeTransfers is set.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Case-insensitive substring matched against the description / merchant.' },
        category: { type: 'string', description: 'Limit to a sigil/category name (partial, case-insensitive).' },
        type: { type: 'string', enum: ['expense', 'income', 'all'], description: "Default 'all'." },
        from: { type: 'string', description: 'Earliest date, ISO yyyy-mm-dd inclusive.' },
        to: { type: 'string', description: 'Latest date, ISO yyyy-mm-dd inclusive.' },
        minAmount: { type: 'number', description: 'Minimum absolute amount.' },
        maxAmount: { type: 'number', description: 'Maximum absolute amount.' },
        sort: { type: 'string', enum: ['recent', 'largest'], description: "Default 'recent'." },
        limit: { type: 'integer', description: 'Max rows to return (default 25, max 100).' },
        includeTransfers: { type: 'boolean', description: 'Include internal transfers (default false).' },
      },
    },
  },
  {
    name: 'forecast',
    description: 'Forward-looking surplus/deficit prophecy: forecasts the spend-to-income ratio, applies it to recent income, and returns projected net (with prediction intervals) per month. Defaults to CORE spending only (baseline/recurring — excludes discretionary one-offs like home improvement) so lumpy outlays don\'t skew the projection. Set coreOnly=false to project all spending. Use for "will I run a deficit", "what does next quarter look like".',
    input_schema: {
      type: 'object',
      properties: {
        horizon: { type: 'integer', description: 'Months ahead to project (default 3).' },
        coreOnly: { type: 'boolean', description: 'Project core/baseline spending only, excluding discretionary sigils (default true).' },
      },
    },
  },
] as const;

type ToolName = (typeof AI_TOOLS)[number]['name'];

const round = (n: number) => Math.round(n * 100) / 100;

/** Money that counts toward income/expense — internal transfers excluded, exactly
 *  as the rest of the app does (flagged, or in a transfer-kind category). */
function flowOf(transactions: Transaction[], categories: Category[]): Transaction[] {
  const transferKind = new Set(categories.filter(c => c.kind === 'transfer').map(c => c.id));
  return transactions.filter(t => !(t.transfer || (t.categoryId && transferKind.has(t.categoryId))));
}

function liquidBalance(accounts: Account[]): number {
  return accounts.filter(a => a.kind === 'spending' || a.kind === 'saving').reduce((s, a) => s + (a.balance || 0), 0);
}

/** Execute one tool call against live data. Returns a JSON-serialisable result. */
export function runAiTool(name: string, input: Record<string, unknown> | null | undefined, ctx: AiContext): unknown {
  const args = input || {};
  const flow = flowOf(ctx.transactions, ctx.categories);

  switch (name as ToolName) {
    case 'overview': {
      const s = summarize(flow);
      const liquid = liquidBalance(ctx.accounts);
      const netWorth = ctx.accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const wb = wellbeing(flow, liquid || netWorth || 0, ctx.categories);
      const months = monthRange(flow);
      const split = expenseSplit(flow, ctx.categories);
      const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
      return {
        currency: ctx.currency,
        income: round(s.income),
        expense: round(s.expense),
        coreExpense: round(sum(split.core)),
        discretionaryExpense: round(sum(split.discretionary)),
        net: round(s.net),
        transactionCount: s.count,
        firstDate: s.firstDate,
        lastDate: s.lastDate,
        monthsOfHistory: months.length,
        netWorth: round(netWorth),
        vaultCount: ctx.accounts.length,
        wellbeing: {
          score: wb.score,
          savingsRatePct: round(wb.savingsRate * 100),
          bufferMonths: round(wb.bufferMonths),
          uncategorisedSpendPct: round(wb.uncatFraction * 100),
        },
      };
    }

    case 'monthly_trend': {
      const n = Math.max(1, Number(args.months) || 12);
      const rows = monthlyTotals(flow).slice(-n);
      return {
        currency: ctx.currency,
        months: rows.map(m => ({ month: m.month, income: round(m.income), expense: round(m.expense), net: round(m.net) })),
      };
    }

    case 'category_breakdown': {
      const kind = args.kind === 'income' ? 'income' : 'expense';
      const top = Math.max(1, Number(args.top) || 15);
      let txns = flow;
      if (args.months) {
        const recent = new Set(monthRange(flow).slice(-Math.max(1, Number(args.months))));
        txns = flow.filter(t => recent.has(t.date.slice(0, 7)));
      }
      const rows = byCategoryTotals(txns, ctx.categories, kind).slice(0, top);
      const catById = new Map(ctx.categories.map(c => [c.id, c]));
      return {
        currency: ctx.currency, kind,
        categories: rows.map(r => ({ name: r.name, total: round(r.total), count: r.count, discretionary: isDiscretionary(catById.get(r.categoryId)) })),
      };
    }

    case 'category_trend': {
      const kind = args.kind === 'income' ? 'income' : 'expense';
      const n = Math.max(1, Number(args.months) || 12);
      const ot = byCategoryOverTime(flow, ctx.categories, kind);
      if (!args.category) {
        return { availableCategories: ot.series.map(s => s.name) };
      }
      const q = String(args.category).toLowerCase();
      const hit = ot.series.find(s => s.name.toLowerCase().includes(q));
      if (!hit) return { error: 'No such category', availableCategories: ot.series.map(s => s.name) };
      const months = ot.months.slice(-n);
      const amounts = hit.amounts.slice(-n).map(round);
      return { currency: ctx.currency, category: hit.name, kind, months, amounts };
    }

    case 'merchant_spend': {
      const top = Math.max(1, Number(args.top) || 15);
      let rows = merchantSummary(flow, ctx.rules);
      if (args.query) {
        const q = String(args.query).toUpperCase();
        rows = rows.filter(r => r.label.toUpperCase().includes(q));
      }
      return {
        currency: ctx.currency,
        merchants: rows.slice(0, top).map(r => ({ merchant: r.label, total: round(r.total), count: r.count, lastSeen: r.last, categorised: r.mapped })),
      };
    }

    case 'find_transactions': {
      const limit = Math.max(1, Math.min(100, Number(args.limit) || 25));
      const type = args.type === 'expense' ? 'expense' : args.type === 'income' ? 'income' : 'all';
      const q = args.query ? String(args.query).toLowerCase() : null;
      const catById = new Map(ctx.categories.map(c => [c.id, c]));
      let catId: string | null = null;
      if (args.category) {
        const cq = String(args.category).toLowerCase();
        const hit = ctx.categories.find(c => c.name.toLowerCase().includes(cq));
        if (!hit) return { matched: 0, returned: 0, transactions: [], note: 'No such category', availableCategories: ctx.categories.map(c => c.name) };
        catId = hit.id;
      }
      const transferKind = new Set(ctx.categories.filter(c => c.kind === 'transfer').map(c => c.id));
      const isXfer = (t: Transaction) => t.transfer || (t.categoryId != null && transferKind.has(t.categoryId));
      const minA = args.minAmount != null ? Number(args.minAmount) : null;
      const maxA = args.maxAmount != null ? Number(args.maxAmount) : null;
      const from = args.from ? String(args.from) : null;
      const to = args.to ? String(args.to) : null;
      const rows: Array<Record<string, unknown>> = [];
      for (const t of ctx.transactions) {
        if (!args.includeTransfers && isXfer(t)) continue;
        if (type === 'expense' && t.amount >= 0) continue;
        if (type === 'income' && t.amount < 0) continue;
        if (catId && t.categoryId !== catId) continue;
        if (from && t.date < from) continue;
        if (to && t.date > to) continue;
        const abs = Math.abs(t.amount);
        if (minA != null && abs < minA) continue;
        if (maxA != null && abs > maxA) continue;
        if (q && !((t.raw || '') + ' ' + (t.description || '')).toLowerCase().includes(q)) continue;
        const rule = matchRule(t.raw || t.description, ctx.rules);
        const merchant = rule ? rule.pattern.toUpperCase() : suggestMerchant(t.raw || t.description);
        rows.push({
          date: t.date,
          amount: round(t.amount),
          description: t.description,
          merchant,
          sigil: t.categoryId ? (catById.get(t.categoryId)?.name || null) : null,
          vault: t.account || null,
        });
      }
      rows.sort((a, b) => args.sort === 'largest'
        ? Math.abs(b.amount as number) - Math.abs(a.amount as number)
        : String(b.date).localeCompare(String(a.date)));
      return { currency: ctx.currency, matched: rows.length, returned: Math.min(rows.length, limit), truncated: rows.length > limit, transactions: rows.slice(0, limit) };
    }

    case 'forecast': {
      const horizon = Math.max(1, Math.min(12, Number(args.horizon) || 3));
      const coreOnly = args.coreOnly !== false; // default true
      const months = monthlyTotals(flow);
      const income = months.map(m => m.income);
      const split = expenseSplit(flow, ctx.categories);
      const expense = coreOnly ? split.core : split.core.map((c, i) => c + (split.discretionary[i] || 0));
      const recentN = Math.min(3, split.discretionary.length);
      const discRecent = split.discretionary.slice(-recentN);
      const excludedDiscretionaryMonthly = recentN ? discRecent.reduce((a, b) => a + b, 0) / recentN : 0;
      const cf = cashflowForecast(income, expense, horizon);
      return {
        currency: ctx.currency,
        basis: coreOnly ? 'core' : 'all',
        excludedDiscretionaryMonthly: coreOnly ? round(excludedDiscretionaryMonthly) : 0,
        verdict: cf.verdict,
        method: cf.method,
        recentMonthlyIncome: round(cf.recentIncome),
        projection: cf.net.point.map((p, i) => ({
          monthsAhead: i + 1,
          projectedNet: round(p),
          netLower: round(cf.net.lower[i]!),
          netUpper: round(cf.net.upper[i]!),
          projectedExpense: round(cf.expense.point[i]!),
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/** The Oracle's persona + grounding. Arcane voice, but numerically exact and
 *  bound to the tool data — it must never invent figures. */
export function aiSystemPrompt(opts: { currency: string; today?: string }): string {
  const today = opts.today ? `\nThe present date is ${opts.today}.` : '';
  return `You are The Oracle — a divining intelligence bound within Dollaz, "The Illuminated Ledger", a personal-finance grimoire. A seeker poses questions about their own coin, and you answer by gazing into their ledger through the rites (tools) granted to you.

Voice: speak in the hushed, arcane, gothic register of this grimoire — the seeker, their coin, sigils (categories), incantations (rules), vaults (accounts), the Bazaar (merchants), prophecy (forecast). Be atmospheric but never at the cost of clarity: a seeker must come away knowing exactly what is true of their money.

Iron laws:
- Ground EVERY figure in tool results. Never invent, estimate, or recall numbers from earlier turns that the rites did not return. If you lack the data, call the appropriate rite; if no rite can answer, say so plainly.
- Money flows by this sign: spending is outflow, income is inflow. Internal transfers between the seeker's own vaults are already set apart and excluded.
- Spending is divided into CORE (baseline, recurring: rent, groceries, utilities, debts, insurance) and DISCRETIONARY (one-off or indulgent: home improvement, feasting, revels). The forecast rite defaults to core only, so lumpy one-offs do not poison the prophecy. When counselling on a deficit, distinguish the two: a core deficit is grave; a discretionary overspend is a choice.
- Render all sums with the seeker's mark of coin: ${opts.currency}. Round to whole coin unless cents matter.
- Thou mayst read individual inscriptions when a question calls for it — the find-transactions rite returns specific charges with their dates, descriptions, merchants and sigils. Prefer the aggregate rites for broad questions ("how am I doing", "where does my money go"); reach for individual rows for the particular ("what was that $240 charge?", "list my Countdown visits"). Quote dates and amounts exactly as returned.
- Be concise. Lead with the answer, then the supporting figures. Use short tables or lists when comparing many sigils or months.
- When asked for counsel (where to cut, whether ruin looms), reason from the forecast and the breakdowns, and be candid about uncertainty — prophecies carry intervals, not certainties.${today}`;
}
