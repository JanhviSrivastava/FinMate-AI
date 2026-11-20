import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileBarChart2, Sparkles, Trash2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell, type AppRoute } from '../components/AppShell';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../lib/api';
import type { SavedMonthlyReport } from '../types/app';
import { MONTH_FULL_NAMES, formatINR } from '../utils/finance';

interface ReportsPageProps {
  navigate: (path: AppRoute) => void;
}

export function ReportsPage({ navigate }: ReportsPageProps) {
  const { isDark } = useTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [reports, setReports] = useState<SavedMonthlyReport[]>([]);
  const [activeReport, setActiveReport] = useState<SavedMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ reports: SavedMonthlyReport[] }>('/api/reports');
      setReports(res.reports);
      if (res.reports.length > 0 && !activeReport) {
        setActiveReport(res.reports[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, [activeReport]);

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch<{ report: SavedMonthlyReport }>('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });
      setReports((prev) => [res.report, ...prev]);
      setActiveReport(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate monthly report.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/reports/${id}`, { method: 'DELETE' });
      const remaining = reports.filter((r) => r.id !== id);
      setReports(remaining);
      if (activeReport?.id === id) {
        setActiveReport(remaining[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete report.');
    }
  };

  const content = activeReport?.content;
  const score = content?.financialHealthScore ?? 0;

  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const tickFillX = isDark ? '#94a3b8' : '#64748b';
  const tickFillY = isDark ? '#cbd5e1' : '#334155';
  const barFill = isDark ? '#60a5fa' : '#1e40af';
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
      currentPath="/reports"
      navigate={navigate}
      title="Monthly AI Report"
      subtitle="Generate a 10-point financial health analysis and action plan for any month"
      headerAction={
        <div className="flex flex-wrap items-center gap-2.5">
          <MonthYearSelector month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating Report...' : 'Generate Monthly Report'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Saved Reports Sidebar */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Saved Reports</h2>
            {loading ? (
              <div className="space-y-2" aria-busy="true">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4">
                No reports generated yet. Click “Generate Monthly Report” to create your first analysis.
              </p>
            ) : (
              <div className="space-y-1.5">
                {reports.map((rep) => {
                  const isActive = activeReport?.id === rep.id;
                  const repMonth = MONTH_FULL_NAMES[rep.month - 1] ?? `Month ${rep.month}`;
                  return (
                    <div
                      key={rep.id}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveReport(rep)}
                        className="flex-1 text-left cursor-pointer min-w-0"
                      >
                        <p className="text-xs font-semibold truncate">
                          {repMonth} {rep.year}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-nums">
                          Score: {rep.content?.financialHealthScore ?? '--'}/100
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rep.id)}
                        aria-label={`Delete ${repMonth} ${rep.year} report`}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-700 dark:hover:text-red-400 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Report View */}
          <div className="lg:col-span-9">
            {generating ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3" aria-busy="true">
                <Sparkles className="w-7 h-7 text-blue-700 dark:text-blue-400 mx-auto animate-pulse" />
                <p className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Analyzing your {MONTH_FULL_NAMES[month - 1]} {year} transactions...
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gemini is compiling your income, spending patterns, health score, and next-month plan.
                </p>
              </div>
            ) : !activeReport || !content ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-4">
                <FileBarChart2 className="w-9 h-9 text-slate-400 dark:text-slate-500 mx-auto" />
                <div className="space-y-1">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    Generate your Monthly Financial Report
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Select a month above and click “Generate Monthly Report” for a complete 10-section AI review with a financial health score out of 100.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Generate {MONTH_FULL_NAMES[month - 1]} {year} Report
                </button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-7">
                {/* Report Header + Financial Health Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div>
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                      FinMate AI Financial Report
                    </p>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {MONTH_FULL_NAMES[activeReport.month - 1]} {activeReport.year}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 max-w-xl">
                      {content.scoreRationale}
                    </p>
                  </div>

                  <div className="shrink-0 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center min-w-[150px]">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Financial Health Score</p>
                    <p
                      className={`font-mono-nums text-3xl font-extrabold mt-1 ${
                        score >= 75
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : score >= 50
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {score}
                      <span className="text-base font-medium text-slate-400 dark:text-slate-500">/100</span>
                    </p>
                  </div>
                </div>

                {/* 1, 2, 3: Summaries */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      01. Monthly Income Summary
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{content.incomeSummary}</p>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      02. Monthly Expense Summary
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{content.expenseSummary}</p>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      03. Total Savings or Deficit
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{content.savingsOrDeficit}</p>
                  </div>
                </div>

                {/* 4: Top Spending Categories Chart & List */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    04. Top Spending Categories
                  </h3>
                  {content.topSpendingCategories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      <div className="h-56 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={content.topSpendingCategories}
                            layout="vertical"
                            margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 11, fill: tickFillX }}
                              tickFormatter={(v) => `₹${v}`}
                            />
                            <YAxis
                              type="category"
                              dataKey="category"
                              width={90}
                              tick={{ fontSize: 12, fill: tickFillY }}
                            />
                            <Tooltip
                              contentStyle={tooltipStyle}
                              itemStyle={tooltipItemStyle}
                              cursor={{ fill: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(15,23,42,0.04)' }}
                              formatter={(value) => formatINR(Number(value ?? 0))}
                            />
                            <Bar dataKey="amount" fill={barFill} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {content.topSpendingCategories.map((cat) => (
                          <div key={cat.category} className="py-2.5 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">{cat.category}</span>
                              <span className="font-mono-nums font-semibold text-slate-900 dark:text-slate-100">
                                {formatINR(cat.amount)} ({cat.sharePercent}%)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cat.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No expense categories recorded in this period.</p>
                  )}
                </div>

                {/* 5 & 6: Budget Performance & Pattern Analysis */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      05. Budget Performance
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{content.budgetPerformance}</p>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      06. Spending Pattern Analysis
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{content.spendingPatternAnalysis}</p>
                  </div>
                </div>

                {/* 7 & 8: Reduction Areas & Savings Suggestions */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      07. Areas to Reduce Expenses
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
                      {content.expenseReductionAreas.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                      08. Practical Savings Suggestions
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
                      {content.practicalSavingsSuggestions.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 10: Next Month Action Plan */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-3">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    10. Personalized Action Plan for Next Month
                  </h3>
                  <div className="space-y-2">
                    {content.nextMonthActionPlan.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-800 dark:text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
