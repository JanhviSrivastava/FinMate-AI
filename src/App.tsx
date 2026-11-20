import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import type { AppRoute } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPages';
import { DashboardPage } from './pages/DashboardPage';
import { AddTransactionPage } from './pages/AddTransactionPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { BudgetPage } from './pages/BudgetPage';
import { AiCoachPage } from './pages/AiCoachPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';

const PROTECTED_ROUTES: AppRoute[] = [
  '/dashboard',
  '/transactions',
  '/add',
  '/budget',
  '/coach',
  '/reports',
  '/profile',
];

function normalizeRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const valid: AppRoute[] = [
    '/',
    '/login',
    '/signup',
    '/dashboard',
    '/transactions',
    '/add',
    '/budget',
    '/coach',
    '/reports',
    '/profile',
  ];
  return valid.includes(clean as AppRoute) ? (clean as AppRoute) : '/';
}

function RouterView() {
  const { user, loading, loginDemo } = useAuth();
  const [path, setPath] = useState<AppRoute>(() => normalizeRoute(window.location.pathname));
  const [demoLoading, setDemoLoading] = useState(false);

  const navigate = useCallback((nextPath: AppRoute) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setPath(nextPath);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizeRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Support ?autostart=1 for immediate demo exploration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && !loading && !user && !demoLoading) {
      setDemoLoading(true);
      loginDemo()
        .then(() => navigate('/dashboard'))
        .finally(() => setDemoLoading(false));
    }
  }, [loading, user, demoLoading, loginDemo, navigate]);

  // Protected route enforcement
  useEffect(() => {
    if (loading) return;
    if (!user && PROTECTED_ROUTES.includes(path)) {
      navigate('/login');
    } else if (user && (path === '/login' || path === '/signup')) {
      navigate('/dashboard');
    }
  }, [loading, user, path, navigate]);

  const handleDemoFromLanding = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard');
    } finally {
      setDemoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading FinMate AI...</div>
      </div>
    );
  }

  if (path === '/') {
    return (
      <LandingPage
        navigate={navigate}
        onDemoLogin={handleDemoFromLanding}
        demoLoading={demoLoading}
      />
    );
  }

  if (path === '/login') {
    return <AuthPage mode="login" navigate={navigate} />;
  }

  if (path === '/signup') {
    return <AuthPage mode="signup" navigate={navigate} />;
  }

  if (!user) {
    return <AuthPage mode="login" navigate={navigate} />;
  }

  switch (path) {
    case '/dashboard':
      return <DashboardPage navigate={navigate} />;
    case '/transactions':
      return <TransactionsPage navigate={navigate} />;
    case '/add':
      return <AddTransactionPage navigate={navigate} />;
    case '/budget':
      return <BudgetPage navigate={navigate} />;
    case '/coach':
      return <AiCoachPage navigate={navigate} />;
    case '/reports':
      return <ReportsPage navigate={navigate} />;
    case '/profile':
      return <ProfilePage navigate={navigate} />;
    default:
      return <DashboardPage navigate={navigate} />;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterView />
      </AuthProvider>
    </ThemeProvider>
  );
}
