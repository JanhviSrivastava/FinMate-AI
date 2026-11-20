export const EXPENSE_CATEGORIES = [
  'Food',
  'Travel',
  'Books',
  'Recharge',
  'Entertainment',
  'Shopping',
  'Bills',
  'Health',
  'Rent',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const INCOME_SOURCES = [
  'Allowance',
  'Scholarship',
  'Internship',
  'Freelance',
  'Part-time Job',
  'Gift',
  'Other',
] as const;

export type IncomeSource = (typeof INCOME_SOURCES)[number];

export const PAYMENT_METHODS = [
  'UPI',
  'Debit Card',
  'Credit Card',
  'Cash',
  'Net Banking',
  'Wallet',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TransactionType = 'income' | 'expense';

export interface TransactionRecord {
  id: number;
  userId?: number;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  createdAt?: string;
}

export interface CategoryBudgetRecord {
  id?: number;
  category: string;
  monthlyLimit: number;
}

export type BudgetStatus = 'none' | 'healthy' | 'warning' | 'exceeded';

export interface FinancialSummary {
  totalIncomeAllTime: number;
  totalExpenseAllTime: number;
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  monthlyBudget: number | null;
  budgetRemaining: number | null;
  budgetPercentUsed: number;
  budgetStatus: BudgetStatus;
}

export interface CategoryUsage {
  category: string;
  spent: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  status: BudgetStatus;
}

export interface MonthlyTrendPoint {
  label: string;
  month: number;
  year: number;
  income: number;
  expense: number;
}

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const MONTH_FULL_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasDecimals = Math.abs(safe % 1) > 0.001;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatIndianDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const monthLabel = MONTH_SHORT_NAMES[m - 1] ?? '';
  return `${String(d).padStart(2, '0')} ${monthLabel} ${y}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getMonthYearFromDate(isoDate: string): { month: number; year: number } {
  const parts = isoDate.split('-');
  if (parts.length !== 3) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  return {
    month: Number.isFinite(month) ? month : 1,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
  };
}

export function getBudgetStatus(spent: number, limit: number | null): BudgetStatus {
  if (!limit || limit <= 0) return 'none';
  const ratio = spent / limit;
  if (ratio > 1) return 'exceeded';
  if (ratio >= 0.8) return 'warning';
  return 'healthy';
}

export function calculateFinancialSummary(
  transactions: Pick<TransactionRecord, 'type' | 'amount' | 'date'>[],
  month: number,
  year: number,
  monthlyBudget: number | null
): FinancialSummary {
  let totalIncomeAllTime = 0;
  let totalExpenseAllTime = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    const txMY = getMonthYearFromDate(tx.date);
    const inTargetMonth = txMY.month === month && txMY.year === year;

    if (tx.type === 'income') {
      totalIncomeAllTime += amt;
      if (inTargetMonth) monthlyIncome += amt;
    } else if (tx.type === 'expense') {
      totalExpenseAllTime += amt;
      if (inTargetMonth) monthlyExpense += amt;
    }
  }

  const currentBalance = roundCurrency(totalIncomeAllTime - totalExpenseAllTime);
  const monthlySavings = roundCurrency(monthlyIncome - monthlyExpense);
  const hasBudget = monthlyBudget !== null && monthlyBudget > 0;
  const budgetRemaining = hasBudget ? roundCurrency(monthlyBudget - monthlyExpense) : null;
  const budgetPercentUsed = hasBudget
    ? Math.round((monthlyExpense / monthlyBudget) * 1000) / 10
    : 0;
  const budgetStatus = getBudgetStatus(monthlyExpense, monthlyBudget);

  return {
    totalIncomeAllTime: roundCurrency(totalIncomeAllTime),
    totalExpenseAllTime: roundCurrency(totalExpenseAllTime),
    currentBalance,
    monthlyIncome: roundCurrency(monthlyIncome),
    monthlyExpense: roundCurrency(monthlyExpense),
    monthlySavings,
    monthlyBudget: hasBudget ? roundCurrency(monthlyBudget) : null,
    budgetRemaining,
    budgetPercentUsed,
    budgetStatus,
  };
}

export function calculateCategoryBreakdown(
  transactions: Pick<TransactionRecord, 'type' | 'amount' | 'category' | 'date'>[],
  categoryBudgets: Pick<CategoryBudgetRecord, 'category' | 'monthlyLimit'>[],
  month: number,
  year: number
): CategoryUsage[] {
  const spentMap = new Map<string, number>();
  for (const cat of EXPENSE_CATEGORIES) {
    spentMap.set(cat, 0);
  }

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const txMY = getMonthYearFromDate(tx.date);
    if (txMY.month !== month || txMY.year !== year) continue;
    const key = EXPENSE_CATEGORIES.includes(tx.category as ExpenseCategory)
      ? tx.category
      : 'Other';
    spentMap.set(key, (spentMap.get(key) ?? 0) + (Number(tx.amount) || 0));
  }

  const limitMap = new Map<string, number>();
  for (const cb of categoryBudgets) {
    if (cb.monthlyLimit > 0) {
      limitMap.set(cb.category, cb.monthlyLimit);
    }
  }

  return EXPENSE_CATEGORIES.map((category) => {
    const spent = roundCurrency(spentMap.get(category) ?? 0);
    const limit = limitMap.get(category) ?? null;
    const remaining = limit !== null ? roundCurrency(limit - spent) : null;
    const percentUsed = limit && limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
    const status = getBudgetStatus(spent, limit);
    return {
      category,
      spent,
      limit,
      remaining,
      percentUsed,
      status,
    };
  });
}

export function calculateMonthlyTrend(
  transactions: Pick<TransactionRecord, 'type' | 'amount' | 'date'>[],
  endMonth: number,
  endYear: number,
  count = 6
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = endMonth - i;
    let y = endYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    points.push({
      label: `${MONTH_SHORT_NAMES[m - 1]} ${String(y).slice(-2)}`,
      month: m,
      year: y,
      income: 0,
      expense: 0,
    });
  }

  const indexMap = new Map<string, MonthlyTrendPoint>();
  for (const pt of points) {
    indexMap.set(`${pt.year}-${pt.month}`, pt);
  }

  for (const tx of transactions) {
    const { month, year } = getMonthYearFromDate(tx.date);
    const target = indexMap.get(`${year}-${month}`);
    if (!target) continue;
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      target.income = roundCurrency(target.income + amt);
    } else if (tx.type === 'expense') {
      target.expense = roundCurrency(target.expense + amt);
    }
  }

  return points;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface TransactionInputValidation {
  valid: boolean;
  error?: string;
  normalized?: {
    type: TransactionType;
    amount: number;
    category: string;
    description: string;
    date: string;
    paymentMethod: string;
  };
}

export function validateTransactionInput(input: {
  type?: unknown;
  amount?: unknown;
  category?: unknown;
  description?: unknown;
  date?: unknown;
  paymentMethod?: unknown;
}): TransactionInputValidation {
  const type = input.type;
  if (type !== 'income' && type !== 'expense') {
    return { valid: false, error: 'Transaction type must be income or expense.' };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    return { valid: false, error: 'Amount must be a positive number up to ₹1,00,00,000.' };
  }

  const category = typeof input.category === 'string' ? input.category.trim() : '';
  if (!category) {
    return { valid: false, error: type === 'income' ? 'Please select an income source.' : 'Please select an expense category.' };
  }
  if (type === 'expense' && !EXPENSE_CATEGORIES.includes(category as ExpenseCategory)) {
    return { valid: false, error: 'Invalid expense category selected.' };
  }

  const date = typeof input.date === 'string' ? input.date.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format.' };
  }

  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 240) : '';
  const paymentMethodRaw = typeof input.paymentMethod === 'string' ? input.paymentMethod.trim() : '';
  const paymentMethod = paymentMethodRaw || (type === 'income' ? 'Bank Transfer' : 'UPI');

  return {
    valid: true,
    normalized: {
      type,
      amount: roundCurrency(amount),
      category,
      description,
      date,
      paymentMethod,
    },
  };
}
