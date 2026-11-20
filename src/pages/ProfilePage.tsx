import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { AppShell, type AppRoute } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { UserProfile } from '../types/app';
import { formatIndianDate } from '../utils/finance';

interface ProfilePageProps {
  navigate: (path: AppRoute) => void;
}

export function ProfilePage({ navigate }: ProfilePageProps) {
  const { user, logout, updateLocalUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [totalTransactions, setTotalTransactions] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: UserProfile; stats: { totalTransactions: number } }>('/api/auth/me')
      .then((res) => {
        setName(res.user.name);
        setTotalTransactions(res.stats.totalTransactions);
      })
      .catch(() => {
        // Ignore silent fetch error
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch<{ user: UserProfile; token: string }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          ...(newPassword ? { newPassword } : {}),
        }),
      });
      updateLocalUser(res.user, res.token);
      setNewPassword('');
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const joinedDate = user?.createdAt ? formatIndianDate(user.createdAt.slice(0, 10)) : '—';

  return (
    <AppShell
      currentPath="/profile"
      navigate={navigate}
      title="Profile & Account"
      subtitle="Manage your student account settings and session"
    >
      <div className="max-w-2xl space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Account Email</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Member Since</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{joinedDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Logged Entries</p>
            <p className="font-mono-nums text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {totalTransactions !== null ? `${totalTransactions} · INR (₹)` : 'INR (₹)'}
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-900 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">Update Details</h2>

          <div>
            <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="profile-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              New Password (optional)
            </label>
            <input
              id="profile-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-950 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
