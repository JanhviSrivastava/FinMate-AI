import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCategoryBreakdown,
  calculateFinancialSummary,
  calculateMonthlyTrend,
  formatIndianDate,
  formatINR,
  getBudgetStatus,
  validateTransactionInput,
} from './finance';

test('formatINR formats Indian numbering and rupee symbol', () => {
  assert.equal(formatINR(250), '₹250');
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatINR(1250.5), '₹1,250.50');
});

test('formatIndianDate formats YYYY-MM-DD as DD MMM YYYY', () => {
  assert.equal(formatIndianDate('2026-11-20'), '20 Nov 2026');
  assert.equal(formatIndianDate('2026-01-05'), '05 Jan 2026');
});

test('getBudgetStatus detects healthy, 80% warning, and exceeded thresholds', () => {
  assert.equal(getBudgetStatus(500, null), 'none');
  assert.equal(getBudgetStatus(799, 1000), 'healthy');
  assert.equal(getBudgetStatus(800, 1000), 'warning');
  assert.equal(getBudgetStatus(1000, 1000), 'warning');
  assert.equal(getBudgetStatus(1001, 1000), 'exceeded');
});

test('calculateFinancialSummary aggregates monthly and all-time totals', () => {
  const txs = [
    { type: 'income' as const, amount: 10000, date: '2026-11-01' },
    { type: 'expense' as const, amount: 4500, date: '2026-11-05' },
    { type: 'expense' as const, amount: 3600, date: '2026-11-10' },
    { type: 'income' as const, amount: 5000, date: '2026-10-15' },
    { type: 'expense' as const, amount: 2000, date: '2026-10-20' },
  ];

  const summary = calculateFinancialSummary(txs, 11, 2026, 10000);
  assert.equal(summary.totalIncomeAllTime, 15000);
  assert.equal(summary.totalExpenseAllTime, 10100);
  assert.equal(summary.currentBalance, 4900);
  assert.equal(summary.monthlyIncome, 10000);
  assert.equal(summary.monthlyExpense, 8100);
  assert.equal(summary.monthlySavings, 1900);
  assert.equal(summary.budgetRemaining, 1900);
  assert.equal(summary.budgetPercentUsed, 81);
  assert.equal(summary.budgetStatus, 'warning');
});

test('calculateCategoryBreakdown computes per-category usage and exceeded alert', () => {
  const txs = [
    { type: 'expense' as const, amount: 1200, category: 'Food', date: '2026-11-02' },
    { type: 'expense' as const, amount: 1500, category: 'Food', date: '2026-11-08' },
    { type: 'expense' as const, amount: 400, category: 'Travel', date: '2026-11-09' },
  ];
  const limits = [
    { category: 'Food', monthlyLimit: 2500 },
    { category: 'Travel', monthlyLimit: 1000 },
  ];

  const breakdown = calculateCategoryBreakdown(txs, limits, 11, 2026);
  const food = breakdown.find((c) => c.category === 'Food');
  const travel = breakdown.find((c) => c.category === 'Travel');

  assert.equal(food?.spent, 2700);
  assert.equal(food?.remaining, -200);
  assert.equal(food?.status, 'exceeded');
  assert.equal(travel?.spent, 400);
  assert.equal(travel?.status, 'healthy');
});

test('calculateMonthlyTrend returns 6 chronologically ordered months', () => {
  const txs = [
    { type: 'income' as const, amount: 8000, date: '2026-11-01' },
    { type: 'expense' as const, amount: 2500, date: '2026-11-03' },
    { type: 'expense' as const, amount: 1200, date: '2026-06-15' },
  ];

  const trend = calculateMonthlyTrend(txs, 11, 2026, 6);
  assert.equal(trend.length, 6);
  assert.equal(trend[0].month, 6);
  assert.equal(trend[0].expense, 1200);
  assert.equal(trend[5].month, 11);
  assert.equal(trend[5].income, 8000);
  assert.equal(trend[5].expense, 2500);
});

test('validateTransactionInput rejects invalid amounts and accepts valid transactions', () => {
  const invalid = validateTransactionInput({
    type: 'expense',
    amount: -50,
    category: 'Food',
    date: '2026-11-20',
  });
  assert.equal(invalid.valid, false);

  const valid = validateTransactionInput({
    type: 'expense',
    amount: '250.5',
    category: 'Food',
    description: 'Canteen lunch',
    date: '2026-11-20',
    paymentMethod: 'UPI',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized?.amount, 250.5);
  assert.equal(valid.normalized?.category, 'Food');
});
