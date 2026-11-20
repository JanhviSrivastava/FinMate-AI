import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { budgets, categoryBudgets, transactions } from '../db/schema.ts';
import {
  MONTH_FULL_NAMES,
  calculateCategoryBreakdown,
  calculateFinancialSummary,
  calculateMonthlyTrend,
  type TransactionRecord,
} from '../utils/finance.ts';
import type { UserFinancialContext } from './gemini.ts';

export async function getUserFinancialContext(
  userId: number,
  month: number,
  year: number
): Promise<UserFinancialContext> {
  try {
    const [txRows, budgetRows, catBudgetRows] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.date), desc(transactions.id)),
      db
        .select()
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)))
        .limit(1),
      db.select().from(categoryBudgets).where(eq(categoryBudgets.userId, userId)),
    ]);

    const mappedTransactions: TransactionRecord[] = txRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      type: row.type === 'income' ? 'income' : 'expense',
      amount: Number(row.amount),
      category: row.category,
      description: row.description,
      date: row.date,
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
    }));

    const monthlyBudget = budgetRows[0] ? Number(budgetRows[0].totalBudget) : null;
    const summary = calculateFinancialSummary(mappedTransactions, month, year, monthlyBudget);
    const categoryBreakdown = calculateCategoryBreakdown(
      mappedTransactions,
      catBudgetRows.map((c) => ({ category: c.category, monthlyLimit: Number(c.monthlyLimit) })),
      month,
      year
    );
    const monthlyTrend = calculateMonthlyTrend(mappedTransactions, month, year, 6);

    const monthTransactions = mappedTransactions.filter((t) => {
      const [y, m] = t.date.split('-').map(Number);
      return y === year && m === month;
    });

    return {
      month,
      year,
      monthLabel: MONTH_FULL_NAMES[month - 1] ?? 'Month',
      summary,
      categoryBreakdown,
      monthlyTrend,
      recentTransactions: monthTransactions.length > 0 ? monthTransactions : mappedTransactions.slice(0, 15),
    };
  } catch (error) {
    console.error('Database query failed in getUserFinancialContext:', error);
    throw new Error('Failed to load financial context from database.', { cause: error });
  }
}
