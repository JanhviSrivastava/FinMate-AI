import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { AppShell, type AppRoute } from '../components/AppShell';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { apiFetch } from '../lib/api';
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  formatIndianDate,
  formatINR,
  type TransactionRecord,
} from '../utils/finance';

interface TransactionsPageProps {
  navigate: (path: AppRoute) => void;
}

export function TransactionsPage({ navigate }: TransactionsPageProps) {
  const now = new Date();
  const [allMonths, setAllMonths] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [search, setSearch] = useState('');

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingTx, setEditingTx] = useState<TransactionRecord | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (categoryFilter !== 'All') params.set('category', categoryFilter);
      if (!allMonths) {
        params.set('month', String(month));
        params.set('year', String(year));
      }
      if (search.trim()) params.set('search', search.trim());

      const res = await apiFetch<{ transactions: TransactionRecord[] }>(
        `/api/transactions?${params.toString()}`
      );
      setTransactions(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, allMonths, month, year, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTransactions();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [loadTransactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setEditError(null);

    if (!Number.isFinite(Number(editingTx.amount)) || Number(editingTx.amount) <= 0) {
      setEditError('Amount must be a positive number.');
      return;
    }

    setEditSaving(true);
    try {
      const res = await apiFetch<{ transaction: TransactionRecord }>(`/api/transactions/${editingTx.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          type: editingTx.type,
          amount: Number(editingTx.amount),
          category: editingTx.category,
          date: editingTx.date,
          paymentMethod: editingTx.paymentMethod,
          description: editingTx.description,
        }),
      });
      setTransactions((prev) => prev.map((t) => (t.id === res.transaction.id ? res.transaction : t)));
      setEditingTx(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update transaction.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  const allCategoryOptions = useMemo(() => {
    const set = new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_SOURCES]);
    return ['All', ...Array.from(set)];
  }, []);

  const fieldClass =
    'w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600';

  return (
    <AppShell
      currentPath="/transactions"
      navigate={navigate}
      title="Transactions"
      subtitle="Search, filter, edit, and manage all your income and expense entries"
      headerAction={
        <button
          type="button"
          onClick={() => navigate('/add')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Transaction</span>
        </button>
      }
    >
      <div className="space-y-5">
        {/* Filters Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['all', 'expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <MonthYearSelector
              month={month}
              year={year}
              includeAllOption
              isAllSelected={allMonths}
              onSelectAll={() => setAllMonths(true)}
              onChange={(m, y) => {
                setAllMonths(false);
                setMonth(m);
                setYear(y);
              }}
            />

            <label htmlFor="filter-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="filter-category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {allCategoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="tx-search" className="sr-only">
              Search transactions
            </label>
            <input
              id="tx-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search note, category, UPI..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtered Income</span>
            <span className="font-mono-nums text-base font-bold text-emerald-700 dark:text-emerald-400">
              {formatINR(totals.income)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Filtered Expense</span>
            <span className="font-mono-nums text-base font-bold text-slate-900 dark:text-slate-100">
              {formatINR(totals.expense)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Balance</span>
            <span
              className={`font-mono-nums text-base font-bold ${
                totals.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
              }`}
            >
              {totals.net >= 0 ? '+' : ''}
              {formatINR(totals.net)}
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {/* Ledger Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                No matching transactions found.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try adjusting your filters or log a new expense or income entry.
              </p>
              <button
                type="button"
                onClick={() => navigate('/add')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Add Transaction
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {transactions.map((tx) => {
                    const label = tx.description || tx.category;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatIndianDate(tx.date)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {label}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {tx.category} · {tx.type === 'income' ? 'Income' : 'Expense'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {tx.paymentMethod}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono-nums font-semibold whitespace-nowrap ${
                            tx.type === 'income'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatINR(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditError(null);
                                setEditingTx({ ...tx });
                              }}
                              aria-label={`Edit transaction ${label}`}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-800 dark:hover:text-blue-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tx.id)}
                              disabled={deletingId === tx.id}
                              aria-label={`Delete transaction ${label}`}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTx && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-tx-title"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 id="edit-tx-title" className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                Edit Transaction
              </h2>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                aria-label="Close edit modal"
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-200"
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-type" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Type
                  </label>
                  <select
                    id="edit-type"
                    value={editingTx.type}
                    onChange={(e) => {
                      const nextType = e.target.value === 'income' ? 'income' : 'expense';
                      setEditingTx({
                        ...editingTx,
                        type: nextType,
                        category: nextType === 'income' ? 'Allowance' : 'Food',
                      });
                    }}
                    className={fieldClass}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-amount" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    value={editingTx.amount}
                    onChange={(e) => setEditingTx({ ...editingTx, amount: Number(e.target.value) })}
                    className={`${fieldClass} font-mono-nums`}
                  />
                </div>

                <div>
                  <label htmlFor="edit-cat" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {editingTx.type === 'income' ? 'Source' : 'Category'}
                  </label>
                  <select
                    id="edit-cat"
                    value={editingTx.category}
                    onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                    className={fieldClass}
                  >
                    {(editingTx.type === 'income' ? INCOME_SOURCES : EXPENSE_CATEGORIES).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editingTx.date}
                    onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-method" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Payment Method
                  </label>
                  <select
                    id="edit-method"
                    value={editingTx.paymentMethod}
                    onChange={(e) => setEditingTx({ ...editingTx, paymentMethod: e.target.value })}
                    className={fieldClass}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="edit-desc" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Description
                  </label>
                  <input
                    id="edit-desc"
                    type="text"
                    value={editingTx.description}
                    onChange={(e) => setEditingTx({ ...editingTx, description: e.target.value })}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
