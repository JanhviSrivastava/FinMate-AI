import { GoogleGenAI, Type } from '@google/genai';
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  formatINR,
  type CategoryUsage,
  type FinancialSummary,
  type MonthlyTrendPoint,
  type TransactionRecord,
} from '../utils/finance.ts';

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withGeminiRetry<T>(fn: () => Promise<T>, maxRetries = 1): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('429');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

export interface UserFinancialContext {
  month: number;
  year: number;
  monthLabel: string;
  summary: FinancialSummary;
  categoryBreakdown: CategoryUsage[];
  monthlyTrend: MonthlyTrendPoint[];
  recentTransactions: TransactionRecord[];
}

export interface ParsedTransactionDraft {
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

export interface MonthlyReportData {
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

function buildContextBlock(ctx: UserFinancialContext): string {
  const topCategories = ctx.categoryBreakdown
    .filter((c) => c.spent > 0 || (c.limit !== null && c.limit > 0))
    .map((c) => {
      const limitPart = c.limit !== null ? ` / Limit ${formatINR(c.limit)} (${c.percentUsed}%) [${c.status}]` : '';
      return `- ${c.category}: Spent ${formatINR(c.spent)}${limitPart}`;
    })
    .join('\n');

  const recentLines = ctx.recentTransactions
    .slice(0, 25)
    .map(
      (t) =>
        `- [${t.date}] ${t.type.toUpperCase()} | ${formatINR(t.amount)} | ${t.category} | ${t.paymentMethod} | ${t.description || 'No note'}`
    )
    .join('\n');

  const trendLines = ctx.monthlyTrend
    .map((pt) => `- ${pt.label}: Income ${formatINR(pt.income)}, Expense ${formatINR(pt.expense)}`)
    .join('\n');

  return `
Target Period: ${ctx.monthLabel} ${ctx.year}
Currency: INR (₹)
Monthly Summary:
- Monthly Income: ${formatINR(ctx.summary.monthlyIncome)}
- Monthly Expense: ${formatINR(ctx.summary.monthlyExpense)}
- Monthly Net Savings/Deficit: ${formatINR(ctx.summary.monthlySavings)}
- All-Time Current Balance: ${formatINR(ctx.summary.currentBalance)}
- Monthly Budget: ${ctx.summary.monthlyBudget !== null ? formatINR(ctx.summary.monthlyBudget) : 'Not set'}
- Budget Remaining: ${ctx.summary.budgetRemaining !== null ? formatINR(ctx.summary.budgetRemaining) : 'N/A'}
- Budget Used: ${ctx.summary.monthlyBudget !== null ? `${ctx.summary.budgetPercentUsed}% (${ctx.summary.budgetStatus})` : 'N/A'}

Category Breakdown (${ctx.monthLabel} ${ctx.year}):
${topCategories || '- No expenses recorded for this month yet.'}

6-Month Income vs Expense Trend:
${trendLines}

Recent Transactions (up to 25 most recent):
${recentLines || '- No transactions recorded yet.'}
`.trim();
}

export async function parseNaturalLanguageTransactions(
  inputText: string,
  todayIso: string
): Promise<ParsedTransactionDraft[]> {
  const ai = getGeminiClient();

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Today's date is ${todayIso}. Extract all financial transactions from this college student's message:\n"${inputText}"`,
      config: {
        systemInstruction: [
          'You extract Indian college student income and expense entries from natural language.',
          `Expense categories MUST be strictly one of: ${EXPENSE_CATEGORIES.join(', ')}.`,
          `Income categories (sources) MUST be strictly one of: ${INCOME_SOURCES.join(', ')}.`,
          `Payment methods should be one of: ${PAYMENT_METHODS.join(', ')} (default to "UPI" for expenses or "Bank Transfer" for income if unspecified).`,
          'Resolve relative dates like "today", "yesterday", "2 days ago" accurately to YYYY-MM-DD based on today\'s date.',
          'If multiple transactions appear in one sentence (e.g. "Spent 350 on Uber and 200 on coffee"), return multiple items in the array.',
          'All amounts are in INR numbers without currency symbols.',
        ].join(' '),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: '"income" or "expense"' },
              amount: { type: Type.NUMBER, description: 'Positive numeric amount in INR' },
              category: { type: Type.STRING, description: 'Expense category or Income source' },
              description: { type: Type.STRING, description: 'Concise item description' },
              date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
              paymentMethod: { type: Type.STRING, description: 'Payment method used' },
            },
            required: ['type', 'amount', 'category', 'description', 'date', 'paymentMethod'],
          },
        },
      },
    })
  );

  const rawText = (response.text ?? '[]').trim();
  const parsed = JSON.parse(rawText) as Array<Partial<ParsedTransactionDraft>>;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Could not extract a transaction. Please mention an amount and item (e.g., "Spent 250 on lunch today").');
  }

  return parsed.map((item) => {
    const txType: 'income' | 'expense' = item.type === 'income' ? 'income' : 'expense';
    const rawCat = typeof item.category === 'string' ? item.category.trim() : 'Other';
    let category = rawCat;
    if (txType === 'expense') {
      const matched = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === rawCat.toLowerCase());
      category = matched ?? 'Other';
    } else {
      const matched = INCOME_SOURCES.find((s) => s.toLowerCase() === rawCat.toLowerCase());
      category = matched ?? (rawCat || 'Other');
    }

    const amount = Number(item.amount);
    const date = typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? item.date : todayIso;
    const paymentMethod =
      typeof item.paymentMethod === 'string' && item.paymentMethod.trim()
        ? item.paymentMethod.trim()
        : txType === 'income'
          ? 'Bank Transfer'
          : 'UPI';

    return {
      type: txType,
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : 0,
      category,
      description: typeof item.description === 'string' ? item.description.trim() : '',
      date,
      paymentMethod,
    };
  });
}

export async function generateDashboardInsights(ctx: UserFinancialContext): Promise<DashboardInsight[]> {
  const ai = getGeminiClient();
  const contextText = buildContextBlock(ctx);

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze this college student's financial snapshot and give 3 specific, practical insights in INR.\n\n${contextText}`,
      config: {
        systemInstruction:
          'You are FinMate AI, a sharp personal finance coach for Indian college students. Return exactly 3 concise, data-backed insights referencing exact INR amounts and categories from the provided data. Never invent transactions not in the data.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short 3-6 word insight title' },
              detail: { type: Type.STRING, description: '1-2 sentence actionable insight with INR figures' },
              severity: { type: Type.STRING, description: '"positive", "warning", or "info"' },
            },
            required: ['title', 'detail', 'severity'],
          },
        },
      },
    })
  );

  const rawText = (response.text ?? '[]').trim();
  const parsed = JSON.parse(rawText) as DashboardInsight[];
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.slice(0, 3).map((item) => ({
    title: String(item.title || 'Spending Observation'),
    detail: String(item.detail || ''),
    severity: item.severity === 'positive' || item.severity === 'warning' ? item.severity : 'info',
  }));
}

export async function chatWithFinMateCoach(
  userName: string,
  userMessage: string,
  history: Array<{ role: string; message: string }>,
  ctx: UserFinancialContext
): Promise<string> {
  const ai = getGeminiClient();
  const contextText = buildContextBlock(ctx);

  const recentHistory = history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'Student' : 'FinMate Coach'}: ${m.message}`)
    .join('\n');

  const prompt = `
${recentHistory ? `Recent conversation:\n${recentHistory}\n\n` : ''}Student (${userName}) asks: "${userMessage}"
`.trim();

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: [
          'You are "FinMate AI Coach", a friendly, practical financial mentor for Indian college students.',
          'Always use Indian Rupees (₹) and relatable campus-life context (mess vs canteen/delivery, metro/bus passes vs cabs, shared textbooks/PDFs, prepaid mobile plans, UPI micro-spends, emergency buffer).',
          'Ground every answer strictly in the logged-in student\'s real transaction and budget figures below. Quote exact amounts and categories.',
          'If they have no transactions or budgets yet, warmly guide them on how to start tracking and propose a starter student budget.',
          'Format clearly with short headings or bullet points when giving a savings plan or breakdown. Keep answers concise, encouraging, and directly actionable.',
          `\n--- LOGGED-IN STUDENT DATA ---\n${contextText}`,
        ].join('\n'),
      },
    })
  );

  const reply = (response.text ?? '').trim();
  if (!reply) {
    throw new Error('FinMate AI Coach returned an empty response. Please try again.');
  }
  return reply;
}

export async function generateMonthlyFinancialReport(
  userName: string,
  ctx: UserFinancialContext
): Promise<MonthlyReportData> {
  const ai = getGeminiClient();
  const contextText = buildContextBlock(ctx);

  const response = await withGeminiRetry(() =>
    ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate a comprehensive monthly financial report for ${userName} covering ${ctx.monthLabel} ${ctx.year}.\n\n${contextText}`,
      config: {
        systemInstruction: [
          'You are FinMate AI generating a thorough, honest monthly financial health report for an Indian college student.',
          'Use exact INR (₹) figures from the student\'s transactions and budgets.',
          'For topSpendingCategories, calculate real share percentages of total monthly expense.',
          'For financialHealthScore, provide an objective integer from 0 to 100 based on savings rate, budget adherence, and essential vs discretionary balance.',
          'Keep advice deeply practical for Indian college life.',
        ].join(' '),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            incomeSummary: { type: Type.STRING, description: '1. Monthly income summary paragraph' },
            expenseSummary: { type: Type.STRING, description: '2. Monthly expense summary paragraph' },
            savingsOrDeficit: { type: Type.STRING, description: '3. Total savings or deficit analysis' },
            topSpendingCategories: {
              type: Type.ARRAY,
              description: '4. Top spending categories with amount, sharePercent, and brief note',
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  sharePercent: { type: Type.NUMBER },
                  note: { type: Type.STRING },
                },
                required: ['category', 'amount', 'sharePercent', 'note'],
              },
            },
            budgetPerformance: { type: Type.STRING, description: '5. Budget performance assessment' },
            spendingPatternAnalysis: { type: Type.STRING, description: '6. Spending pattern analysis' },
            expenseReductionAreas: {
              type: Type.ARRAY,
              description: '7. Concrete areas where user can reduce expenses',
              items: { type: Type.STRING },
            },
            practicalSavingsSuggestions: {
              type: Type.ARRAY,
              description: '8. Practical savings suggestions for Indian college students',
              items: { type: Type.STRING },
            },
            financialHealthScore: { type: Type.INTEGER, description: '9. Financial health score out of 100' },
            scoreRationale: { type: Type.STRING, description: 'Short explanation for the score' },
            nextMonthActionPlan: {
              type: Type.ARRAY,
              description: '10. Short personalized action plan steps for next month',
              items: { type: Type.STRING },
            },
          },
          required: [
            'incomeSummary',
            'expenseSummary',
            'savingsOrDeficit',
            'topSpendingCategories',
            'budgetPerformance',
            'spendingPatternAnalysis',
            'expenseReductionAreas',
            'practicalSavingsSuggestions',
            'financialHealthScore',
            'scoreRationale',
            'nextMonthActionPlan',
          ],
        },
      },
    })
  );

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as MonthlyReportData;
  parsed.financialHealthScore = Math.max(0, Math.min(100, Math.round(Number(parsed.financialHealthScore) || 0)));
  return parsed;
}

export function extractGeminiErrorMessage(err: unknown): { status: number; message: string } {
  let msg = err instanceof Error ? err.message : String(err);

  // Unwrap JSON error payloads returned by SDK
  if (msg.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(msg) as { error?: { message?: string; code?: number } };
      if (parsed?.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      // Keep original string if not JSON
    }
  }

  if (msg.includes('GEMINI_API_KEY') || msg.includes('API_KEY_INVALID') || msg.includes('403')) {
    return {
      status: 503,
      message: 'Gemini AI key is missing or invalid on the server. Please configure GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'AI rate limit reached temporarily. Please wait a moment and try again.',
    };
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
    return {
      status: 503,
      message: 'Gemini AI is experiencing temporary high demand. Please try again in a few seconds.',
    };
  }
  return {
    status: 500,
    message: msg || 'AI service encountered an error. Please try again.',
  };
}
