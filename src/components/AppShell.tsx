import React from 'react';
import {
  FileBarChart2,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MessageSquareText,
  PiggyBank,
  PlusCircle,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggleButton } from './ThemeToggleButton';

export type AppRoute =
  | '/'
  | '/login'
  | '/signup'
  | '/dashboard'
  | '/transactions'
  | '/add'
  | '/budget'
  | '/coach'
  | '/reports'
  | '/profile';

interface NavItem {
  path: AppRoute;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transactions', shortLabel: 'Ledger', icon: ListOrdered },
  { path: '/add', label: 'Add Expense', shortLabel: 'Add', icon: PlusCircle },
  { path: '/budget', label: 'Budget', shortLabel: 'Budget', icon: PiggyBank },
  { path: '/coach', label: 'AI Coach', shortLabel: 'Coach', icon: MessageSquareText },
  { path: '/reports', label: 'Reports', shortLabel: 'Reports', icon: FileBarChart2 },
  { path: '/profile', label: 'Profile', shortLabel: 'Profile', icon: UserCircle2 },
];

interface AppShellProps {
  currentPath: AppRoute;
  navigate: (path: AppRoute) => void;
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({
  currentPath,
  navigate,
  title,
  subtitle,
  headerAction,
  children,
}: AppShellProps) {
  const { user, logout } = useAuth();

  const handleLinkClick = (e: React.MouseEvent, path: AppRoute) => {
    e.preventDefault();
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-150">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <a
            href="/dashboard"
            onClick={(e) => handleLinkClick(e, '/dashboard')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap"
          >
            FinMate AI
          </a>
        </div>

        <nav aria-label="Primary Navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleLinkClick(e, item.path)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="px-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.name || 'Student'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || ''}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Compact Header (48px, well within 15% sticky cap) */}
      <header className="md:hidden sticky top-0 z-30 h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
        <a
          href="/dashboard"
          onClick={(e) => handleLinkClick(e, '/dashboard')}
          className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap"
        >
          FinMate AI
        </a>
        <div className="flex items-center gap-2 text-xs font-medium">
          <a
            href="/reports"
            onClick={(e) => handleLinkClick(e, '/reports')}
            className={`px-2 py-1 rounded ${
              currentPath === '/reports'
                ? 'text-blue-700 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Reports
          </a>
          <a
            href="/profile"
            onClick={(e) => handleLinkClick(e, '/profile')}
            className={`px-2 py-1 rounded ${
              currentPath === '/profile'
                ? 'text-blue-700 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Profile
          </a>
          <ThemeToggleButton className="w-8 h-8" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen pb-16 md:pb-0">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-4 sm:py-5">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {title}
              </h1>
              {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {headerAction}
              <div className="hidden md:block">
                <ThemeToggleButton />
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation (56px, primary 5 actions) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 grid grid-cols-5"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.path;
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleLinkClick(e, item.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active
                  ? 'text-blue-700 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate max-w-full px-1">{item.shortLabel}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
