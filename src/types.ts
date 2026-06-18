// types.ts — canonical data model for Dollaz.
// Sign convention everywhere: amount < 0 = money OUT (expense),
// amount > 0 = money IN (income). All money is stored in the account's major
// unit (e.g. dollars) as a plain number.

export type CategoryKind = 'expense' | 'income' | 'transfer';

export type AccountKind = 'spending' | 'saving' | 'credit' | 'retire';

/** A user-maintained account ("vault"). Balances are entered manually; net
 *  worth is the sum across all accounts (credit balances are negative). */
export interface Account {
  id: string;
  name: string;
  inst: string;            // institution
  kind: AccountKind;
  balance: number;         // current balance; credit cards are negative
  color: string;           // jewel hex
  icon: string;            // ICONS name: card | piggy | growth | bank | coins
  num?: string;            // masked number, e.g. "•• 4021"
  goal?: number | null;    // saving target
  rate?: number | null;    // saving interest % p.a.
  limit?: number | null;   // credit limit
  contrib?: number | null; // retire contribution %
  returns12?: number | null; // retire 12-mo return %
  balanceDate?: string | null; // ISO date the balance was last synced from an import
  auto?: boolean;          // created automatically from an imported account id
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string; // hex, used in charts
  /** Baseline/recurring essential (core) vs one-off/discretionary spend.
   *  Undefined or true = core; false = discretionary. Discretionary expense is
   *  excluded from the (core) cashflow forecast so lumpy one-offs don't skew it. */
  core?: boolean;
}

/** A retained merchant→category mapping. `pattern` is matched as a
 *  case-insensitive substring against a transaction's normalised description. */
export interface Rule {
  id: string;
  pattern: string;       // stored normalised (uppercased, trimmed)
  categoryId: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  date: string;          // ISO yyyy-mm-dd
  amount: number;        // signed; <0 outflow, >0 inflow
  description: string;   // cleaned/normalised-for-display
  raw: string;           // original description as imported
  account: string;       // account label (may be '')
  categoryId: string | null;
  importId: string;      // which import batch introduced it
  fitid?: string;        // bank's unique transaction id (OFX only); used for dedupe
  transfer?: boolean;    // internal transfer between own accounts — excluded from income/expense
}

/** How incoming CSV columns map onto the canonical fields.
 *  Amount can come from a single signed column OR a debit/credit pair. */
export interface ColumnMapping {
  date: string | null;
  description: string | null;
  amount: string | null;     // single signed column (mutually exclusive with debit/credit)
  debit: string | null;      // outflow column (positive numbers → negated)
  credit: string | null;     // inflow column
  account: string | null;
  /** Flip the sign of a single signed `amount` column (some banks use +ve for spend). */
  flipSign: boolean;
  /** Date interpretation for ambiguous numeric dates. */
  dateFormat: DateFormat;
  /** Whether the first CSV row is a header row. */
  hasHeader: boolean;
}

export type DateFormat = 'auto' | 'DMY' | 'MDY' | 'YMD';

/** A remembered import layout, keyed by a signature of the file's header row,
 *  so the same bank export auto-maps on the next import. */
export interface ImportFormat {
  id: string;
  name: string;          // user-facing label, e.g. "CommBank"
  signature: string;     // header signature this layout applies to
  mapping: ColumnMapping;
}

/** A group of still-uncategorised transactions sharing a suggested merchant,
 *  surfaced in the import flow so the user can map them in one action. */
export interface UnmappedGroup {
  merchant: string;      // suggested display label
  pattern: string;       // normalised substring proposed as the rule pattern
  count: number;
  total: number;         // signed sum
  sampleRaw: string;     // one example raw description
  txnIds: string[];
}
