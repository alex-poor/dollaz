// seed.ts — default categories ("sigils") and starter rules ("incantations").
// Names use the Dollaz arcane register; colours are the Pre-Raphaelite jewel palette.
import type { Category, Rule } from './types.js';

export const DEFAULT_CATEGORIES: Category[] = [
  // `core: false` marks discretionary sigils (excluded from the core forecast).
  { id: 'income',    name: 'Tithes',         kind: 'income',   color: '#5fae84' },
  { id: 'groceries', name: 'Provisions',     kind: 'expense',  color: '#4f79ad', core: true },
  { id: 'dining',    name: 'Feasting',       kind: 'expense',  color: '#c9a23f', core: false },
  { id: 'transport', name: 'Passage',        kind: 'expense',  color: '#8f6fb5', core: true },
  { id: 'utilities', name: 'Hearth & Light', kind: 'expense',  color: '#3f968f', core: true },
  { id: 'rent',      name: 'Shelter',        kind: 'expense',  color: '#b0403a', core: true },
  { id: 'health',    name: 'Flesh & Bone',   kind: 'expense',  color: '#c06a8e', core: true },
  { id: 'shopping',  name: 'Trinkets',       kind: 'expense',  color: '#c47a3f', core: false },
  { id: 'fun',       name: 'Revels',         kind: 'expense',  color: '#3fa0a0', core: false },
  { id: 'savings',   name: 'The Hoard',      kind: 'transfer', color: '#5a5bb0' },
];

export const DEFAULT_RULES: Rule[] = [
  { id: 'r1',  pattern: 'COUNTDOWN',  categoryId: 'groceries', createdAt: 0 },
  { id: 'r2',  pattern: 'PAKNSAVE',   categoryId: 'groceries', createdAt: 0 },
  { id: 'r3',  pattern: 'PAK N SAVE', categoryId: 'groceries', createdAt: 0 },
  { id: 'r4',  pattern: 'NEW WORLD',  categoryId: 'groceries', createdAt: 0 },
  { id: 'r5',  pattern: 'Z ENERGY',   categoryId: 'transport', createdAt: 0 },
  { id: 'r6',  pattern: 'BP ',        categoryId: 'transport', createdAt: 0 },
  { id: 'r7',  pattern: 'AT HOP',     categoryId: 'transport', createdAt: 0 },
  { id: 'r8',  pattern: 'UBER EATS',  categoryId: 'dining',    createdAt: 0 },
  { id: 'r9',  pattern: 'MOJO',       categoryId: 'dining',    createdAt: 0 },
  { id: 'r10', pattern: 'NETFLIX',    categoryId: 'fun',       createdAt: 0 },
  { id: 'r11', pattern: 'SPOTIFY',    categoryId: 'fun',       createdAt: 0 },
  { id: 'r12', pattern: 'GENESIS',    categoryId: 'utilities', createdAt: 0 },
  { id: 'r13', pattern: 'SPARK',      categoryId: 'utilities', createdAt: 0 },
  { id: 'r14', pattern: 'BARFOOT',    categoryId: 'rent',      createdAt: 0 },
  { id: 'r15', pattern: 'UNICHEM',    categoryId: 'health',    createdAt: 0 },
  { id: 'r16', pattern: 'KMART',      categoryId: 'shopping',  createdAt: 0 },
  { id: 'r17', pattern: 'WAREHOUSE',  categoryId: 'shopping',  createdAt: 0 },
  { id: 'r18', pattern: 'SIMPLICITY', categoryId: 'savings',   createdAt: 0 },
  { id: 'r19', pattern: 'SALARY',     categoryId: 'income',    createdAt: 0 },
  { id: 'r20', pattern: 'PAYROLL',    categoryId: 'income',    createdAt: 0 },
];
