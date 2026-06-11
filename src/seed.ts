// seed.ts — default categories and a few starter rules for first run.
import type { Category, Rule } from './types.js';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c-income',    name: 'Income',        kind: 'income',   color: '#2dbd7e' },
  { id: 'c-groceries', name: 'Groceries',     kind: 'expense',  color: '#3b82f6' },
  { id: 'c-dining',    name: 'Dining & Cafes', kind: 'expense', color: '#f59e0b' },
  { id: 'c-transport', name: 'Transport',     kind: 'expense',  color: '#8b5cf6' },
  { id: 'c-utilities', name: 'Utilities',     kind: 'expense',  color: '#06b6d4' },
  { id: 'c-rent',      name: 'Rent & Housing', kind: 'expense', color: '#ef4444' },
  { id: 'c-health',    name: 'Health',        kind: 'expense',  color: '#ec4899' },
  { id: 'c-shopping',  name: 'Shopping',      kind: 'expense',  color: '#14b8a6' },
  { id: 'c-entertainment', name: 'Entertainment', kind: 'expense', color: '#f97316' },
  { id: 'c-transfer',  name: 'Transfers',     kind: 'transfer', color: '#9aa0a6' },
];

export const DEFAULT_RULES: Rule[] = [
  { id: 'r-1', pattern: 'WOOLWORTHS', categoryId: 'c-groceries', createdAt: 0 },
  { id: 'r-2', pattern: 'COLES', categoryId: 'c-groceries', createdAt: 0 },
  { id: 'r-3', pattern: 'ALDI', categoryId: 'c-groceries', createdAt: 0 },
  { id: 'r-4', pattern: 'UBER EATS', categoryId: 'c-dining', createdAt: 0 },
  { id: 'r-5', pattern: 'MCDONALD', categoryId: 'c-dining', createdAt: 0 },
  { id: 'r-6', pattern: 'UBER', categoryId: 'c-transport', createdAt: 0 },
  { id: 'r-7', pattern: 'BP ', categoryId: 'c-transport', createdAt: 0 },
  { id: 'r-8', pattern: 'NETFLIX', categoryId: 'c-entertainment', createdAt: 0 },
  { id: 'r-9', pattern: 'SPOTIFY', categoryId: 'c-entertainment', createdAt: 0 },
];
