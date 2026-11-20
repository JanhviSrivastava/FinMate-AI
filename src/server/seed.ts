import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { budgets, categoryBudgets, chatMessages, transactions, users } from '../db/schema.ts';
import { hashPassword } from './auth.ts';

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoPreviousMonth(monthsBack: number, dayOfMonth: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, dayOfMonth);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function ensureDemoStudentAccount() {
  const demoEmail = 'ananya.verma@campus.edu';
  const existing = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);

  let user = existing[0];
  if (!user) {
    const passwordHash = await hashPassword('Student@123');
    const inserted = await db
      .insert(users)
      .values({
        name: 'Ananya Verma',
        email: demoEmail,
        passwordHash,
      })
      .returning();
    user = inserted[0];
  }

  const existingTx = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, user.id))
    .limit(1);

  if (existingTx.length === 0) {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    await db.insert(transactions).values([
      {
        userId: user.id,
        type: 'income',
        amount: 10000,
        category: 'Allowance',
        description: 'Monthly pocket money from parents',
        date: isoDaysAgo(18),
        paymentMethod: 'Bank Transfer',
      },
      {
        userId: user.id,
        type: 'income',
        amount: 5000,
        category: 'Scholarship',
        description: 'Merit-cum-means semester stipend',
        date: isoDaysAgo(10),
        paymentMethod: 'Bank Transfer',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 3500,
        category: 'Rent',
        description: 'Hostel mess & room utility share',
        date: isoDaysAgo(17),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 1450,
        category: 'Food',
        description: 'Campus canteen, evening chai & group dinner',
        date: isoDaysAgo(12),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 1200,
        category: 'Books',
        description: 'Data Structures textbook & lab printouts',
        date: isoDaysAgo(9),
        paymentMethod: 'Debit Card',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 680,
        category: 'Travel',
        description: 'Metro card recharge & auto rides',
        date: isoDaysAgo(6),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 599,
        category: 'Recharge',
        description: 'Jio 84-day student mobile pack',
        date: isoDaysAgo(5),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 890,
        category: 'Food',
        description: 'Swiggy late-night exam snacks',
        date: isoDaysAgo(2),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 450,
        category: 'Entertainment',
        description: 'Weekend movie with hostel friends',
        date: isoDaysAgo(1),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'income',
        amount: 11000,
        category: 'Allowance',
        description: 'Monthly allowance',
        date: isoPreviousMonth(1, 3),
        paymentMethod: 'Bank Transfer',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 3500,
        category: 'Rent',
        description: 'Hostel fee share',
        date: isoPreviousMonth(1, 5),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 2600,
        category: 'Food',
        description: 'Canteen & tiffin',
        date: isoPreviousMonth(1, 14),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 1400,
        category: 'Shopping',
        description: 'Campus fest hoodie & stationery',
        date: isoPreviousMonth(1, 20),
        paymentMethod: 'Debit Card',
      },
      {
        userId: user.id,
        type: 'income',
        amount: 9500,
        category: 'Allowance',
        description: 'Monthly allowance',
        date: isoPreviousMonth(2, 2),
        paymentMethod: 'Bank Transfer',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 3500,
        category: 'Rent',
        description: 'Hostel fee share',
        date: isoPreviousMonth(2, 4),
        paymentMethod: 'UPI',
      },
      {
        userId: user.id,
        type: 'expense',
        amount: 2150,
        category: 'Food',
        description: 'Dining & snacks',
        date: isoPreviousMonth(2, 16),
        paymentMethod: 'UPI',
      },
    ]);

    await db
      .insert(budgets)
      .values({
        userId: user.id,
        month: curMonth,
        year: curYear,
        totalBudget: 10500,
      })
      .onConflictDoNothing();

    await db
      .insert(categoryBudgets)
      .values([
        { userId: user.id, category: 'Food', monthlyLimit: 2500 },
        { userId: user.id, category: 'Travel', monthlyLimit: 1000 },
        { userId: user.id, category: 'Books', monthlyLimit: 1500 },
        { userId: user.id, category: 'Recharge', monthlyLimit: 700 },
        { userId: user.id, category: 'Entertainment', monthlyLimit: 800 },
        { userId: user.id, category: 'Rent', monthlyLimit: 3500 },
      ])
      .onConflictDoNothing();

    await db.insert(chatMessages).values([
      {
        userId: user.id,
        role: 'assistant',
        message:
          'Hi Ananya! I am FinMate AI Coach. Ask me anything about your monthly spending, food delivery habits, or how to stretch your ₹15,000 income into steady student savings.',
      },
    ]);
  }

  return user;
}
