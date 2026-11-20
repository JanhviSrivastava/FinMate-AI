import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { and, desc, eq } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  budgets,
  categoryBudgets,
  chatMessages,
  reports,
  transactions,
  users,
} from './src/db/schema.ts';
import {
  hashPassword,
  requireAuth,
  signToken,
  verifyPassword,
  type AuthRequest,
} from './src/server/auth.ts';
import { getUserFinancialContext } from './src/server/context.ts';
import {
  chatWithFinMateCoach,
  extractGeminiErrorMessage,
  generateDashboardInsights,
  generateMonthlyFinancialReport,
  parseNaturalLanguageTransactions,
} from './src/server/gemini.ts';
import { ensureDemoStudentAccount } from './src/server/seed.ts';
import {
  EXPENSE_CATEGORIES,
  getTodayISO,
  validateTransactionInput,
} from './src/utils/finance.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

function parseMonthYear(queryMonth: unknown, queryYear: unknown): { month: number; year: number } {
  const now = new Date();
  const m = Number(queryMonth);
  const y = Number(queryYear);
  return {
    month: Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1,
    year: Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : now.getFullYear(),
  };
}

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const created = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      });

    const user = created[0];
    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Signup failed:', error);
    res.status(500).json({ error: 'Unable to create account right now. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = found[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Unable to log in right now. Please try again.' });
  }
});

app.post('/api/auth/demo', async (_req, res) => {
  try {
    const user = await ensureDemoStudentAccount();
    const token = signToken({ userId: user.id, email: user.email, name: user.name });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Demo login failed:', error);
    res.status(500).json({ error: 'Failed to prepare demo account.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const found = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!found[0]) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const txRows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    res.json({
      user: found[0],
      stats: {
        totalTransactions: txRows.length,
      },
    });
  } catch (error) {
    console.error('Profile fetch failed:', error);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

app.put('/api/auth/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      return;
    }

    const updates: { name: string; passwordHash?: string } = { name };
    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters.' });
        return;
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      });

    if (!updated[0]) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const token = signToken({
      userId: updated[0].id,
      email: updated[0].email,
      name: updated[0].name,
    });
    res.json({ user: updated[0], token });
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ==================== DASHBOARD ROUTE ====================

app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { month, year } = parseMonthYear(req.query.month, req.query.year);
    const context = await getUserFinancialContext(userId, month, year);
    res.json(context);
  } catch (error) {
    console.error('Dashboard fetch failed:', error);
    res.status(500).json({ error: 'Failed to load dashboard summary.' });
  }
});

// ==================== TRANSACTIONS ROUTES ====================

app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const typeFilter = typeof req.query.type === 'string' ? req.query.type : '';
    const categoryFilter = typeof req.query.category === 'string' ? req.query.category : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const monthParam = req.query.month ? Number(req.query.month) : null;
    const yearParam = req.query.year ? Number(req.query.year) : null;

    const allRows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date), desc(transactions.id));

    const filtered = allRows.filter((row) => {
      if (typeFilter === 'income' || typeFilter === 'expense') {
        if (row.type !== typeFilter) return false;
      }
      if (categoryFilter && categoryFilter !== 'All') {
        if (row.category !== categoryFilter) return false;
      }
      if (monthParam && yearParam) {
        const [y, m] = row.date.split('-').map(Number);
        if (y !== yearParam || m !== monthParam) return false;
      }
      if (search) {
        const haystack = `${row.description} ${row.category} ${row.paymentMethod} ${row.amount}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    res.json({
      transactions: filtered.map((row) => ({
        id: row.id,
        userId: row.userId,
        type: row.type,
        amount: Number(row.amount),
        category: row.category,
        description: row.description,
        date: row.date,
        paymentMethod: row.paymentMethod,
        createdAt: row.createdAt,
      })),
    });
  } catch (error) {
    console.error('Transactions list failed:', error);
    res.status(500).json({ error: 'Failed to load transactions.' });
  }
});

app.post('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const validation = validateTransactionInput(req.body ?? {});
    if (!validation.valid || !validation.normalized) {
      res.status(400).json({ error: validation.error || 'Invalid transaction data.' });
      return;
    }

    const inserted = await db
      .insert(transactions)
      .values({
        userId,
        type: validation.normalized.type,
        amount: validation.normalized.amount,
        category: validation.normalized.category,
        description: validation.normalized.description,
        date: validation.normalized.date,
        paymentMethod: validation.normalized.paymentMethod,
      })
      .returning();

    res.status(201).json({ transaction: inserted[0] });
  } catch (error) {
    console.error('Create transaction failed:', error);
    res.status(500).json({ error: 'Failed to save transaction.' });
  }
});

app.post('/api/transactions/batch', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length === 0 || items.length > 20) {
      res.status(400).json({ error: 'Provide between 1 and 20 transactions to save.' });
      return;
    }

    const validRecords = [];
    for (const item of items) {
      const validation = validateTransactionInput(item ?? {});
      if (!validation.valid || !validation.normalized) {
        res.status(400).json({ error: validation.error || 'Invalid transaction entry in batch.' });
        return;
      }
      validRecords.push({
        userId,
        type: validation.normalized.type,
        amount: validation.normalized.amount,
        category: validation.normalized.category,
        description: validation.normalized.description,
        date: validation.normalized.date,
        paymentMethod: validation.normalized.paymentMethod,
      });
    }

    const inserted = await db.insert(transactions).values(validRecords).returning();
    res.status(201).json({ transactions: inserted });
  } catch (error) {
    console.error('Batch create transactions failed:', error);
    res.status(500).json({ error: 'Failed to save transactions.' });
  }
});

app.put('/api/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid transaction ID.' });
      return;
    }

    const validation = validateTransactionInput(req.body ?? {});
    if (!validation.valid || !validation.normalized) {
      res.status(400).json({ error: validation.error || 'Invalid transaction data.' });
      return;
    }

    const updated = await db
      .update(transactions)
      .set({
        type: validation.normalized.type,
        amount: validation.normalized.amount,
        category: validation.normalized.category,
        description: validation.normalized.description,
        date: validation.normalized.date,
        paymentMethod: validation.normalized.paymentMethod,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    if (!updated[0]) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    res.json({ transaction: updated[0] });
  } catch (error) {
    console.error('Update transaction failed:', error);
    res.status(500).json({ error: 'Failed to update transaction.' });
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid transaction ID.' });
      return;
    }

    const deleted = await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning({ id: transactions.id });

    if (!deleted[0]) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }

    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete transaction failed:', error);
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
});

// ==================== BUDGETS ROUTES ====================

app.get('/api/budgets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { month, year } = parseMonthYear(req.query.month, req.query.year);
    const context = await getUserFinancialContext(userId, month, year);
    res.json({
      month,
      year,
      summary: context.summary,
      categoryBreakdown: context.categoryBreakdown,
    });
  } catch (error) {
    console.error('Budget fetch failed:', error);
    res.status(500).json({ error: 'Failed to load budget settings.' });
  }
});

app.put('/api/budgets/monthly', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { month, year } = parseMonthYear(req.body?.month, req.body?.year);
    const totalBudget = Number(req.body?.totalBudget);

    if (!Number.isFinite(totalBudget) || totalBudget <= 0 || totalBudget > 10000000) {
      res.status(400).json({ error: 'Monthly budget must be a positive amount in INR.' });
      return;
    }

    const existing = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.month, month), eq(budgets.year, year)))
      .limit(1);

    let saved;
    if (existing[0]) {
      const updated = await db
        .update(budgets)
        .set({ totalBudget })
        .where(eq(budgets.id, existing[0].id))
        .returning();
      saved = updated[0];
    } else {
      const inserted = await db
        .insert(budgets)
        .values({ userId, month, year, totalBudget })
        .returning();
      saved = inserted[0];
    }

    res.json({ budget: saved });
  } catch (error) {
    console.error('Monthly budget save failed:', error);
    res.status(500).json({ error: 'Failed to save monthly budget.' });
  }
});

app.put('/api/budgets/categories', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limits = Array.isArray(req.body?.limits) ? req.body.limits : [];

    for (const entry of limits) {
      const category = typeof entry?.category === 'string' ? entry.category.trim() : '';
      const limitVal = Number(entry?.monthlyLimit);

      if (!EXPENSE_CATEGORIES.includes(category as (typeof EXPENSE_CATEGORIES)[number])) {
        res.status(400).json({ error: `Invalid category: ${category}` });
        return;
      }

      if (!Number.isFinite(limitVal) || limitVal < 0) {
        res.status(400).json({ error: `Limit for ${category} must be 0 or positive.` });
        return;
      }

      if (limitVal === 0) {
        await db
          .delete(categoryBudgets)
          .where(and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.category, category)));
      } else {
        const existing = await db
          .select()
          .from(categoryBudgets)
          .where(and(eq(categoryBudgets.userId, userId), eq(categoryBudgets.category, category)))
          .limit(1);

        if (existing[0]) {
          await db
            .update(categoryBudgets)
            .set({ monthlyLimit: limitVal })
            .where(eq(categoryBudgets.id, existing[0].id));
        } else {
          await db.insert(categoryBudgets).values({
            userId,
            category,
            monthlyLimit: limitVal,
          });
        }
      }
    }

    const updatedRows = await db
      .select()
      .from(categoryBudgets)
      .where(eq(categoryBudgets.userId, userId));

    res.json({ categoryBudgets: updatedRows });
  } catch (error) {
    console.error('Category budget save failed:', error);
    res.status(500).json({ error: 'Failed to save category budget limits.' });
  }
});

// ==================== GEMINI AI ROUTES ====================

app.post('/api/ai/parse-transaction', requireAuth, async (req: AuthRequest, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (text.length < 3 || text.length > 500) {
      res.status(400).json({ error: 'Please enter a short description like "Spent 250 on food yesterday".' });
      return;
    }

    const todayIso = getTodayISO();
    const drafts = await parseNaturalLanguageTransactions(text, todayIso);
    res.json({ drafts });
  } catch (error) {
    console.error('AI parse transaction failed:', error);
    const mapped = extractGeminiErrorMessage(error);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

app.post('/api/ai/insights', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const { month, year } = parseMonthYear(req.body?.month, req.body?.year);
    const context = await getUserFinancialContext(userId, month, year);
    const insights = await generateDashboardInsights(context);
    res.json({ insights });
  } catch (error) {
    console.error('AI insights failed:', error);
    const mapped = extractGeminiErrorMessage(error);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

app.get('/api/ai/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.id);

    res.json({ messages: rows });
  } catch (error) {
    console.error('Chat history load failed:', error);
    res.status(500).json({ error: 'Failed to load chat history.' });
  }
});

app.post('/api/ai/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const userName = req.user!.name || 'Student';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

    if (!message || message.length > 1000) {
      res.status(400).json({ error: 'Please enter a question (up to 1000 characters).' });
      return;
    }

    const now = new Date();
    const { month, year } = parseMonthYear(req.body?.month ?? now.getMonth() + 1, req.body?.year ?? now.getFullYear());

    const [historyRows, context] = await Promise.all([
      db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(chatMessages.id),
      getUserFinancialContext(userId, month, year),
    ]);

    const reply = await chatWithFinMateCoach(userName, message, historyRows, context);

    const inserted = await db
      .insert(chatMessages)
      .values([
        { userId, role: 'user', message },
        { userId, role: 'assistant', message: reply },
      ])
      .returning();

    res.json({
      userMessage: inserted[0],
      assistantMessage: inserted[1],
    });
  } catch (error) {
    console.error('AI Coach chat failed:', error);
    const mapped = extractGeminiErrorMessage(error);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

app.delete('/api/ai/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
    res.json({ cleared: true });
  } catch (error) {
    console.error('Clear chat failed:', error);
    res.status(500).json({ error: 'Failed to clear conversation.' });
  }
});

// ==================== MONTHLY REPORT ROUTES ====================

app.get('/api/reports', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt), desc(reports.id));

    const formatted = rows.map((r) => {
      let parsedContent: unknown = null;
      try {
        parsedContent = JSON.parse(r.reportContent);
      } catch {
        parsedContent = null;
      }
      return {
        id: r.id,
        month: r.month,
        year: r.year,
        content: parsedContent,
        createdAt: r.createdAt,
      };
    });

    res.json({ reports: formatted });
  } catch (error) {
    console.error('List reports failed:', error);
    res.status(500).json({ error: 'Failed to load monthly reports.' });
  }
});

app.post('/api/reports/generate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const userName = req.user!.name || 'Student';
    const { month, year } = parseMonthYear(req.body?.month, req.body?.year);

    const context = await getUserFinancialContext(userId, month, year);
    const reportData = await generateMonthlyFinancialReport(userName, context);

    const inserted = await db
      .insert(reports)
      .values({
        userId,
        month,
        year,
        reportContent: JSON.stringify(reportData),
      })
      .returning();

    res.status(201).json({
      report: {
        id: inserted[0].id,
        month: inserted[0].month,
        year: inserted[0].year,
        content: reportData,
        createdAt: inserted[0].createdAt,
      },
      context,
    });
  } catch (error) {
    console.error('Generate monthly report failed:', error);
    const mapped = extractGeminiErrorMessage(error);
    res.status(mapped.status).json({ error: mapped.message });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid report ID.' });
      return;
    }

    const deleted = await db
      .delete(reports)
      .where(and(eq(reports.id, id), eq(reports.userId, userId)))
      .returning({ id: reports.id });

    if (!deleted[0]) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    res.json({ deletedId: deleted[0].id });
  } catch (error) {
    console.error('Delete report failed:', error);
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

// ==================== VITE / STATIC SERVING ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinMate AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
