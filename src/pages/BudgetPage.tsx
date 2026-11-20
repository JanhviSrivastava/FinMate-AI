import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AppShell, type AppRoute } from '../components/AppShell';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { apiFetch } from '../lib/api';
import {
  MONTH_FULL_NAMES,
  formatINR,
  type CategoryUsage,
  type FinancialSummary,
} from '../utils/finance';

interface BudgetPageProps {
  navigate: (path: AppRoute) => void;
}

export function BudgetPage({ navigate }: BudgetPageProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [categories, setCategories] = useState<CategoryUsage[]>([]);
  const [monthlyInput, setMonthlyInput] = useState('');
  const [catInputs, setCatInputs] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [savingMonthly, setSavingMonthly] = useState(false);
  const [savingCats, setSavingCats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{
        summary: FinancialSummary;
        categoryBreakdown: CategoryUsage[];
      }>(`/api/budgets?month=${month}&year=${year}`);

      setSummary(res.summary);
      setCategories(res.categoryBreakdown);
      setMonthlyInput(res.summary.monthlyBudget ? String(res.summary.monthlyBudget) : '');

      const nextInputs: Record<string, string> = {};
      for (const c of res.categoryBreakdown) {
        nextInputs[c.category] = c.limit ? String(c.limit) : '';
      }
      setCatInputs(nextInputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleSaveMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const val = Number(monthlyInput);
    if (!Number.isFinite(val) || val <= 0) {
      setError('Please enter a valid positive monthly budget in INR.');
      return;
    }

    setSavingMonthly(true);
    try {
      await apiFetch('/api/budgets/monthly', {
        method: 'PUT',
        body: JSON.stringify({ month, year, totalBudget: val }),
      });
      await loadBudgets();
      setSuccess(`Monthly budget updated to ${formatINR(val)} for ${MONTH_FULL_NAMES[month - 1]} ${year}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update monthly budget.');
    } finally {
      setSavingMonthly(false);
    }
  };

  const handleSaveCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const limits = categories.map((c) => {
      const raw = (catInputs[c.category] || '').trim();
      const parsed = raw === '' ? 0 : Number(raw);
      return {
        category: c.category,
        monthlyLimit: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
      };
    });

    setSavingCats(true);
    try {
      await apiFetch('/api/budgets/categories', {
        method: 'PUT',
        body: JSON.stringify({ limits }),
      });
      await loadBudgets();
      setSuccess('Category-wise budget limits saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category limits.');
    } finally {
      setSavingCats(false);
    }
  };

  const monthLabel = MONTH_FULL_NAMES[month - 1];

  return (
    <AppShell
      currentPath="/budget"
      navigate={navigate}
      title="Budget Management"
      subtitle={`Set monthly limits and track category usage for ${monthLabel} ${year}`}
      headerAction={
        <MonthYearSelector
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
            setSuccess(null);
          }}
        />
      }
    >
      {loading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="h-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
          <div className="h-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="space-y-6">
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
              className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-900 dark:text-emerald-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-medium">{success}</span>
            </div>
          )}

          {summary && summary.budgetStatus === 'exceeded' && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
            >
              <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Budget Exceeded Alert</p>
                <p className="mt-0.5">
                  Your spending of {formatINR(summary.monthlyExpense)} has crossed your{' '}
                  {formatINR(summary.monthlyBudget ?? 0)} limit ({summary.budgetPercentUsed}% used).
                </p>
              </div>
            </div>
          )}

          {summary && summary.budgetStatus === 'warning' && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">80% Budget Warning</p>
                <p className="mt-0.5">
                  You have used {summary.budgetPercentUsed}% of your {monthLabel} budget. Remaining:{' '}
                  {formatINR(summary.budgetRemaining ?? 0)}.
                </p>
              </div>
            </div>
          )}

          {/* Monthly Overall Budget Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Overall Monthly Budget ({monthLabel} {year})
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Monitor total spending against your monthly student allowance cap.
                </p>
              </div>

              <form onSubmit={handleSaveMonthly} className="flex items-end gap-2.5">
                <div>
                  <label
                    htmlFor="monthly-budget-input"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Monthly Limit (₹)
                  </label>
                  <input
                    id="monthly-budget-input"
                    type="number"
                    min="1"
                    step="1"
                    value={monthlyInput}
                    onChange={(e) => setMonthlyInput(e.target.value)}
                    placeholder="e.g. 10500"
                    className="w-40 px-3 py-2 text-sm font-mono-nums bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingMonthly}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  {savingMonthly ? 'Saving...' : 'Save Budget'}
                </button>
              </form>
            </div>

            {summary && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Budget</p>
                    <p className="font-mono-nums text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {summary.monthlyBudget !== null ? formatINR(summary.monthlyBudget) : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Spent Amount</p>
                    <p className="font-mono-nums text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {formatINR(summary.monthlyExpense)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                    <p
                      className={`font-mono-nums text-lg font-bold mt-0.5 ${
                        (summary.budgetRemaining ?? 0) < 0
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {summary.budgetRemaining !== null ? formatINR(summary.budgetRemaining) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Percentage Used</p>
                    <p
                      className={`font-mono-nums text-lg font-bold mt-0.5 ${
                        summary.budgetStatus === 'exceeded'
                          ? 'text-red-700 dark:text-red-400'
                          : summary.budgetStatus === 'warning'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {summary.monthlyBudget !== null ? `${summary.budgetPercentUsed}%` : '—'}
                    </p>
                  </div>
                </div>

                {summary.monthlyBudget !== null && (
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        summary.budgetStatus === 'exceeded'
                          ? 'bg-red-600 dark:bg-red-500'
                          : summary.budgetStatus === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600 dark:bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, summary.budgetPercentUsed)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category-Wise Budgets */}
          <form
            onSubmit={handleSaveCategories}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Category-wise Budget Limits
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Set monthly caps per category (leave blank or 0 to remove a cap).
                </p>
              </div>
              <button
                type="submit"
                disabled={savingCats}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer disabled:opacity-60"
              >
                {savingCats ? 'Saving Limits...' : 'Save Category Limits'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => {
                const statusText =
                  cat.status === 'exceeded'
                    ? `Exceeded (${cat.percentUsed}%)`
                    : cat.status === 'warning'
                      ? `Warning (${cat.percentUsed}%)`
                      : cat.limit
                        ? `Healthy (${cat.percentUsed}%)`
                        : 'No cap set';

                return (
                  <div
                    key={cat.category}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {cat.category}
                        </p>
                        <p
                          className={`text-xs font-medium mt-0.5 ${
                            cat.status === 'exceeded'
                              ? 'text-red-700 dark:text-red-400'
                              : cat.status === 'warning'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Spent {formatINR(cat.spent)} · {statusText}
                        </p>
                      </div>

                      <div className="w-28 shrink-0">
                        <label htmlFor={`cat-limit-${cat.category}`} className="sr-only">
                          Monthly limit for {cat.category}
                        </label>
                        <input
                          id={`cat-limit-${cat.category}`}
                          type="number"
                          min="0"
                          step="1"
                          value={catInputs[cat.category] ?? ''}
                          onChange={(e) =>
                            setCatInputs((prev) => ({
                              ...prev,
                              [cat.category]: e.target.value,
                            }))
                          }
                          placeholder="Limit ₹"
                          className="w-full px-2.5 py-1.5 text-sm font-mono-nums bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    {cat.limit !== null && cat.limit > 0 && (
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cat.status === 'exceeded'
                                ? 'bg-red-600 dark:bg-red-500'
                                : cat.status === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600 dark:bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, cat.percentUsed)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {(cat.remaining ?? 0) >= 0
                            ? `${formatINR(cat.remaining ?? 0)} left of ${formatINR(cat.limit)}`
                            : `Over by ${formatINR(Math.abs(cat.remaining ?? 0))} (limit ${formatINR(cat.limit)})`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
