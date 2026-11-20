import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell, type AppRoute } from '../components/AppShell';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../lib/api';
import type { DashboardData, DashboardInsight } from '../types/app';
import { formatIndianDate, formatINR } from '../utils/finance';

const CHART_COLORS_LIGHT = [
  '#1e40af',
  '#059669',
  '#d97706',
  '#0284c7',
  '#7c3aed',
  '#dc2626',
  '#0d9488',
  '#475569',
  '#ca8a04',
  '#64748b',
];

const CHART_COLORS_DARK = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#38bdf8',
  '#a78bfa',
  '#f87171',
  '#2dd4bf',
  '#94a3b8',
  '#facc15',
  '#cbd5e1',
];

interface DashboardPageProps {
  navigate: (path: AppRoute) => void;
}

export function DashboardPage({ navigate }: DashboardPageProps) {
  const { isDark } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsGenerated, setInsightsGenerated] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<DashboardData>(`/api/dashboard?month=${month}&year=${year}`);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await apiFetch<{ insights: DashboardInsight[] }>('/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });
      setInsights(res.insights || []);
      setInsightsGenerated(true);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Unable to generate AI insights.');
    } finally {
      setInsightsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    if (data && data.recentTransactions.length > 0 && !insightsGenerated && !insightsLoading && !insightsError) {
      fetchInsights();
    }
  }, [data, insightsGenerated, insightsLoading, insightsError, fetchInsights]);

  const summary = data?.summary;
  const activeCategories = (data?.categoryBreakdown || []).filter((c) => c.spent > 0);
  const categoryAlerts = (data?.categoryBreakdown || []).filter(
    (c) => c.status === 'warning' || c.status === 'exceeded'
  );

  const chartColors = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const tickFill = isDark ? '#94a3b8' : '#64748b';
  const tooltipStyle: React.CSSProperties = isDark
    ? {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderRadius: '8px',
        color: '#f1f5f9',
      }
    : {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderRadius: '8px',
        color: '#0f172a',
      };
  const tooltipItemStyle: React.CSSProperties = {
    color: isDark ? '#e2e8f0' : '#0f172a',
  };

  return (
    <AppShell
      currentPath="/dashboard"
      navigate={navigate}
      title="Dashboard"
      subtitle={data ? `${data.monthLabel} ${data.year} financial overview` : 'Monthly financial overview'}
      headerAction={
        <div className="flex flex-wrap items-center gap-2.5">
          <MonthYearSelector
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
              setInsightsGenerated(false);
              setInsights([]);
            }}
          />
          <button
            type="button"
            onClick={() => navigate('/add')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
            <div className="h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : data && summary ? (
        <div className="space-y-6">
          {/* Budget Alerts */}
          {(summary.budgetStatus === 'exceeded' || summary.budgetStatus === 'warning' || categoryAlerts.length > 0) && (
            <div className="space-y-2.5">
              {summary.budgetStatus === 'exceeded' && (
                <div
                  role="alert"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-200"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold">Monthly Budget Exceeded: </span>
                      <span>
                        You have spent {formatINR(summary.monthlyExpense)} against your{' '}
                        {formatINR(summary.monthlyBudget ?? 0)} limit ({summary.budgetPercentUsed}% used).
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/budget')}
                    className="text-xs font-semibold text-red-800 dark:text-red-300 underline underline-offset-4 whitespace-nowrap self-start sm:self-center cursor-pointer"
                  >
                    Adjust Budget
                  </button>
                </div>
              )}

              {summary.budgetStatus === 'warning' && (
                <div
                  role="alert"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold">Approaching Monthly Limit: </span>
                      <span>
                        You have used {summary.budgetPercentUsed}% of your monthly budget with{' '}
                        {formatINR(summary.budgetRemaining ?? 0)} remaining.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/coach')}
                    className="text-xs font-semibold text-amber-900 dark:text-amber-300 underline underline-offset-4 whitespace-nowrap self-start sm:self-center cursor-pointer"
                  >
                    Ask AI Coach
                  </button>
                </div>
              )}

              {categoryAlerts.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Category Alerts:</span>
                  {categoryAlerts.map((cat) => (
                    <span
                      key={cat.category}
                      className={
                        cat.status === 'exceeded'
                          ? 'text-red-700 dark:text-red-400 font-medium'
                          : 'text-amber-800 dark:text-amber-400 font-medium'
                      }
                    >
                      {cat.category} ({cat.percentUsed}% · {formatINR(cat.spent)} / {formatINR(cat.limit ?? 0)})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Income ({data.monthLabel})</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="font-mono-nums text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatINR(summary.monthlyIncome)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Allowance, scholarships & stipends</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Expense ({data.monthLabel})</span>
                <ArrowDownRight className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="font-mono-nums text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatINR(summary.monthlyExpense)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Net this month:{' '}
                <span
                  className={
                    summary.monthlySavings >= 0
                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-red-700 dark:text-red-400 font-medium'
                  }
                >
                  {summary.monthlySavings >= 0 ? '+' : ''}
                  {formatINR(summary.monthlySavings)}
                </span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Current Balance</span>
              </div>
              <p
                className={`font-mono-nums text-2xl font-bold ${
                  summary.currentBalance >= 0
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {formatINR(summary.currentBalance)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">All-time income minus expenses</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Monthly Budget</span>
                {summary.monthlyBudget !== null && (
                  <span
                    className={`font-mono-nums font-semibold ${
                      summary.budgetStatus === 'exceeded'
                        ? 'text-red-700 dark:text-red-400'
                        : summary.budgetStatus === 'warning'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {summary.budgetPercentUsed}% used
                  </span>
                )}
              </div>
              {summary.monthlyBudget !== null ? (
                <>
                  <p className="font-mono-nums text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(summary.monthlyBudget)}
                  </p>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(summary.budgetRemaining ?? 0) >= 0
                      ? `${formatINR(summary.budgetRemaining ?? 0)} remaining`
                      : `Exceeded by ${formatINR(Math.abs(summary.budgetRemaining ?? 0))}`}
                  </p>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-300">No monthly limit set</p>
                  <button
                    type="button"
                    onClick={() => navigate('/budget')}
                    className="text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Set Monthly Budget →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category-wise Expense Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    Category-wise Expenses
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {data.monthLabel} {data.year} spending split
                  </p>
                </div>
              </div>

              {activeCategories.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No expenses logged for {data.monthLabel} yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/add')}
                    className="text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Log your first expense →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="h-60 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={activeCategories}
                          dataKey="spent"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={84}
                          paddingAngle={2}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                        >
                          {activeCategories.map((entry, idx) => (
                            <Cell key={entry.category} fill={chartColors[idx % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          itemStyle={tooltipItemStyle}
                          formatter={(value) => formatINR(Number(value ?? 0))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activeCategories
                      .slice()
                      .sort((a, b) => b.spent - a.spent)
                      .map((cat) => (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{
                                backgroundColor:
                                  chartColors[activeCategories.indexOf(cat) % chartColors.length],
                              }}
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                              {cat.category}
                            </span>
                          </div>
                          <span className="font-mono-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                            {formatINR(cat.spent)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Income vs Expense Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Monthly Income vs Expense
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">6-month cashflow comparison (INR)</p>
              </div>
              <div className="h-60 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11, fill: tickFill }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipItemStyle}
                      cursor={{ fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.04)' }}
                      formatter={(value) => formatINR(Number(value ?? 0))}
                    />
                    <Bar dataKey="income" name="Income" fill={isDark ? '#10b981' : '#059669'} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill={isDark ? '#60a5fa' : '#1e40af'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Transactions & AI Financial Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Recent Transactions
                </h2>
                <a
                  href="/transactions"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/transactions');
                  }}
                  className="text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline"
                >
                  View all →
                </a>
              </div>

              {data.recentTransactions.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No transactions recorded yet.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/add')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg cursor-pointer"
                  >
                    Log First Transaction
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentTransactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {tx.description || tx.category}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {tx.category} · {tx.paymentMethod} · {formatIndianDate(tx.date)}
                        </p>
                      </div>
                      <span
                        className={`font-mono-nums text-sm font-semibold shrink-0 ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    AI Financial Insights
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={fetchInsights}
                  disabled={insightsLoading}
                  aria-label="Refresh AI insights"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? 'animate-spin' : ''}`} />
                  <span>{insightsLoading ? 'Analyzing...' : 'Refresh'}</span>
                </button>
              </div>

              {insightsLoading ? (
                <div className="space-y-3" aria-busy="true">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : insightsError ? (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 space-y-2">
                  <p className="text-xs text-red-800 dark:text-red-200">{insightsError}</p>
                  <button
                    type="button"
                    onClick={fetchInsights}
                    className="text-xs font-semibold text-red-900 dark:text-red-300 underline cursor-pointer"
                  >
                    Try again
                  </button>
                </div>
              ) : insights.length === 0 ? (
                <div className="py-8 text-center space-y-2.5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Add transactions to receive personalized Gemini spending insights.
                  </p>
                  <button
                    type="button"
                    onClick={fetchInsights}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg cursor-pointer"
                  >
                    Generate Insights
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {insights.map((ins, i) => (
                    <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {ins.severity === 'positive' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : ins.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                        )}
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {ins.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-5.5">
                        {ins.detail}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
