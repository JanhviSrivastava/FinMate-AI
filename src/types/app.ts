import type {
  CategoryUsage,
  FinancialSummary,
  MonthlyTrendPoint,
  TransactionRecord,
} from '../utils/finance';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface DashboardData {
  month: number;
  year: number;
  monthLabel: string;
  summary: FinancialSummary;
  categoryBreakdown: CategoryUsage[];
  monthlyTrend: MonthlyTrendPoint[];
  recentTransactions: TransactionRecord[];
}

export interface ParsedTransactionDraft {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  paymentMethod: string;
}

export interface DashboardInsight {
  title: string;
  detail: string;
  severity: 'positive' | 'warning' | 'info';
}

export interface ChatMessageRecord {
  id: number;
  userId: number;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
}

export interface MonthlyReportContent {
  incomeSummary: string;
  expenseSummary: string;
  savingsOrDeficit: string;
  topSpendingCategories: Array<{
    category: string;
    amount: number;
    sharePercent: number;
    note: string;
  }>;
  budgetPerformance: string;
  spendingPatternAnalysis: string;
  expenseReductionAreas: string[];
  practicalSavingsSuggestions: string[];
  financialHealthScore: number;
  scoreRationale: string;
  nextMonthActionPlan: string[];
}

export interface SavedMonthlyReport {
  id: number;
  month: number;
  year: number;
  content: MonthlyReportContent | null;
  createdAt: string;
}
