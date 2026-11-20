import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles, Trash2 } from 'lucide-react';
import { AppShell, type AppRoute } from '../components/AppShell';
import { apiFetch } from '../lib/api';
import type { ParsedTransactionDraft } from '../types/app';
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  getTodayISO,
} from '../utils/finance';

interface AddTransactionPageProps {
  navigate: (path: AppRoute) => void;
}

const EXAMPLE_PROMPTS = [
  'I spent 250 on food yesterday',
  'Paid 1200 for mobile recharge',
  'Got 5000 scholarship money today',
  'Spent 350 on Uber and 200 on coffee',
];

export function AddTransactionPage({ navigate }: AddTransactionPageProps) {
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');

  const [nlText, setNlText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [drafts, setDrafts] = useState<ParsedTransactionDraft[]>([]);
  const [savingDrafts, setSavingDrafts] = useState(false);

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Food');
  const [date, setDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [description, setDescription] = useState('');
  const [savingManual, setSavingManual] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExtractAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (nlText.trim().length < 3) {
      setError('Please describe your transaction, e.g. "I spent 250 on food yesterday".');
      return;
    }

    setExtracting(true);
    try {
      const res = await apiFetch<{
        drafts: Array<Omit<ParsedTransactionDraft, 'id'>>;
      }>('/api/ai/parse-transaction', {
        method: 'POST',
        body: JSON.stringify({ text: nlText.trim() }),
      });

      setDrafts(
        res.drafts.map((d, idx) => ({
          ...d,
          id: `${Date.now()}-${idx}`,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse text with Gemini AI.');
    } finally {
      setExtracting(false);
    }
  };

  const updateDraft = (id: string, patch: Partial<ParsedTransactionDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveDrafts = async () => {
    setError(null);
    setSuccess(null);
    if (drafts.length === 0) return;

    for (const d of drafts) {
      if (!Number.isFinite(Number(d.amount)) || Number(d.amount) <= 0) {
        setError('Each extracted transaction must have a positive amount.');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
        setError('Please provide a valid date (YYYY-MM-DD).');
        return;
      }
    }

    setSavingDrafts(true);
    try {
      await apiFetch('/api/transactions/batch', {
        method: 'POST',
        body: JSON.stringify({
          items: drafts.map((d) => ({
            type: d.type,
            amount: Number(d.amount),
            category: d.category,
            description: d.description,
            date: d.date,
            paymentMethod: d.paymentMethod,
          })),
        }),
      });
      const count = drafts.length;
      setDrafts([]);
      setNlText('');
      setSuccess(`Saved ${count} ${count === 1 ? 'transaction' : 'transactions'} to your ledger.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transactions.');
    } finally {
      setSavingDrafts(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount in INR.');
      return;
    }

    setSavingManual(true);
    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type,
          amount: numAmount,
          category,
          date,
          paymentMethod,
          description: description.trim(),
        }),
      });

      setAmount('');
      setDescription('');
      setSuccess(`${type === 'income' ? 'Income' : 'Expense'} entry saved successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSavingManual(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600';

  const compactInputClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600';

  return (
    <AppShell
      currentPath="/add"
      navigate={navigate}
      title="Add Transaction"
      subtitle="Log expenses or income using natural language AI or the structured form"
    >
      <div className="max-w-3xl space-y-6">
        {/* Mode Switcher */}
        <div
          className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg"
          role="tablist"
          aria-label="Entry Mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ai'}
            onClick={() => {
              setTab('ai');
              setError(null);
              setSuccess(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
              tab === 'ai'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>AI Natural Language</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            onClick={() => {
              setTab('manual');
              setError(null);
              setSuccess(null);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
              tab === 'manual'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Manual Entry
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-900 dark:text-emerald-200"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => navigate('/transactions')}
                className="text-emerald-800 dark:text-emerald-300 underline cursor-pointer"
              >
                View Transactions
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-emerald-800 dark:text-emerald-300 underline cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {tab === 'ai' ? (
          <div className="space-y-6">
            <form
              onSubmit={handleExtractAI}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="nl-input"
                  className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1.5"
                >
                  Describe your spending or income in plain English
                </label>
                <textarea
                  id="nl-input"
                  rows={3}
                  value={nlText}
                  onChange={(e) => setNlText(e.target.value)}
                  placeholder='e.g. "Spent 350 on Uber and 200 on coffee today"'
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setNlText(ex)}
                      className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors cursor-pointer text-left"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={extracting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{extracting ? 'Extracting details...' : 'Extract Details with AI'}</span>
                </button>
              </div>
            </form>

            {/* Editable Confirmation Cards */}
            {drafts.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      Confirm Extracted Details ({drafts.length})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Review or edit any field below before saving to your database.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 space-y-5">
                  {drafts.map((draft, idx) => (
                    <div key={draft.id} className={idx > 0 ? 'pt-5 space-y-4' : 'space-y-4'}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Entry #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDraft(draft.id)}
                          aria-label={`Remove extracted entry ${idx + 1}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label
                            htmlFor={`draft-type-${draft.id}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Type
                          </label>
                          <select
                            id={`draft-type-${draft.id}`}
                            value={draft.type}
                            onChange={(e) => {
                              const nextType = e.target.value === 'income' ? 'income' : 'expense';
                              updateDraft(draft.id, {
                                type: nextType,
                                category: nextType === 'income' ? 'Allowance' : 'Food',
                              });
                            }}
                            className={compactInputClass}
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`draft-amount-${draft.id}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Amount (₹)
                          </label>
                          <input
                            id={`draft-amount-${draft.id}`}
                            type="number"
                            step="0.01"
                            min="1"
                            value={draft.amount}
                            onChange={(e) => updateDraft(draft.id, { amount: Number(e.target.value) })}
                            className={`${compactInputClass} font-mono-nums`}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`draft-cat-${draft.id}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            {draft.type === 'income' ? 'Source' : 'Category'}
                          </label>
                          <select
                            id={`draft-cat-${draft.id}`}
                            value={draft.category}
                            onChange={(e) => updateDraft(draft.id, { category: e.target.value })}
                            className={compactInputClass}
                          >
                            {(draft.type === 'income' ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`draft-date-${draft.id}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Date
                          </label>
                          <input
                            id={`draft-date-${draft.id}`}
                            type="date"
                            value={draft.date}
                            onChange={(e) => updateDraft(draft.id, { date: e.target.value })}
                            className={compactInputClass}
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`draft-method-${draft.id}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Payment Method
                          </label>
                          <select
                            id={`draft-method-${draft.id}`}
                            value={draft.paymentMethod}
                            onChange={(e) => updateDraft(draft.id, { paymentMethod: e.target.value })}
                            className={compactInputClass}
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`draft-desc-${draft.id}`}
                            className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                          >
                            Description / Note
                          </label>
                          <input
                            id={`draft-desc-${draft.id}`}
                            type="text"
                            value={draft.description}
                            onChange={(e) => updateDraft(draft.id, { description: e.target.value })}
                            className={compactInputClass}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDrafts([])}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDrafts}
                    disabled={savingDrafts}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {savingDrafts ? 'Saving...' : 'Confirm & Save to Ledger'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleManualSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
            noValidate
          >
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Transaction Type
              </span>
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    setCategory('Food');
                    setPaymentMethod('UPI');
                  }}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    type === 'expense'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    setCategory('Allowance');
                    setPaymentMethod('Bank Transfer');
                  }}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                    type === 'income'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="manual-amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Amount (₹)
                </label>
                <input
                  id="manual-amount"
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className={`${inputClass} font-mono-nums`}
                />
              </div>

              <div>
                <label htmlFor="manual-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  {type === 'income' ? 'Income Source' : 'Expense Category'}
                </label>
                <select
                  id="manual-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  {(type === 'income' ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="manual-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Date
                </label>
                <input
                  id="manual-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="manual-payment" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <select
                  id="manual-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="manual-note" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Optional Note
              </label>
              <input
                id="manual-note"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'income' ? 'e.g. Semester merit scholarship' : 'e.g. Canteen lunch with friends'}
                className={inputClass}
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={savingManual}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {savingManual ? 'Saving...' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
