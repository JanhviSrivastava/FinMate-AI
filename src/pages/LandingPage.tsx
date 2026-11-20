import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppRoute } from '../components/AppShell';
import { ThemeToggleButton } from '../components/ThemeToggleButton';

interface LandingPageProps {
  navigate: (path: AppRoute) => void;
  onDemoLogin: () => Promise<void>;
  demoLoading: boolean;
}

export function LandingPage({ navigate, onDemoLogin, demoLoading }: LandingPageProps) {
  const { user } = useAuth();

  const handleNav = (e: React.MouseEvent, target: string) => {
    e.preventDefault();
    const el = document.querySelector(target);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-150">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            FinMate AI
          </a>

          <nav
            aria-label="Landing Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#features"
              onClick={(e) => handleNav(e, '#features')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#smart-entry"
              onClick={(e) => handleNav(e, '#smart-entry')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Smart Entry
            </a>
            <a
              href="#budgeting"
              onClick={(e) => handleNav(e, '#budgeting')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Budgeting
            </a>
            <a
              href="#coach"
              onClick={(e) => handleNav(e, '#coach')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              AI Coach
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <ThemeToggleButton />
            {user ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Open Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                Built for Indian college students · Track in INR (₹)
              </p>
              <h1
                className="font-display font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.12]"
                style={{ fontSize: 'clamp(2.15rem, 4vw, 3.35rem)', textWrap: 'balance' }}
              >
                Know where every rupee goes before the month runs out.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                FinMate AI combines natural-language expense logging, category budget alerts, and a personal Gemini financial coach tailored for hostel, canteen, commute, and scholarship budgets.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(user ? '/dashboard' : '/signup')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>{user ? 'Go to Dashboard' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {!user && (
                  <>
                    <button
                      type="button"
                      onClick={onDemoLogin}
                      disabled={demoLoading}
                      className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                    >
                      <span>{demoLoading ? 'Opening Demo...' : 'Try Demo Student Account'}</span>
                    </button>
                    <a
                      href="/login"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/login');
                      }}
                      className="px-3 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 whitespace-nowrap"
                    >
                      Log in
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Live Ledger Preview Visual */}
            <div className="lg:col-span-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Natural Language Entry
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      “Spent 350 on Uber and 200 on coffee today”
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900 rounded-lg p-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                  <div className="pb-3 sm:pb-0 sm:pr-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Travel · UPI
                      </span>
                      <span className="font-mono-nums text-sm font-semibold text-slate-900 dark:text-slate-100">
                        ₹350
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                      Uber commute
                    </p>
                  </div>
                  <div className="pt-3 sm:pt-0 sm:pl-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Food · UPI
                      </span>
                      <span className="font-mono-nums text-sm font-semibold text-slate-900 dark:text-slate-100">
                        ₹200
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                      Campus coffee
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      November Budget Usage
                    </span>
                    <span className="font-mono-nums font-semibold text-amber-700 dark:text-amber-400">
                      ₹8,769 / ₹10,500 (83.5%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '83.5%' }} />
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                    Warning: You crossed 80% of your monthly budget with 10 days left.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Bento Section */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-8 py-16 space-y-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Everything a student needs to manage monthly allowances and stipends.
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Designed around real campus expenses—mess fees, metro cards, mobile recharges, books, and shared outings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              id="smart-entry"
              className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 space-y-3"
            >
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                01. Natural Language Entry
              </p>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Type expenses in plain English, confirm in one click.
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Write “Paid 1200 for mobile recharge” or “Got 5000 scholarship money today”. Gemini extracts the type, INR amount, category, date, and payment method into an editable card before saving to your ledger.
              </p>
            </div>

            <div
              id="budgeting"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 space-y-3"
            >
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                02. Budget Guardrails
              </p>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                80% warnings & category caps
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Set an overall monthly limit plus caps for Food, Travel, Books, Recharge, and Rent with instant overspending alerts.
              </p>
            </div>

            <div
              id="coach"
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 space-y-3"
            >
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                03. FinMate AI Coach
              </p>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Personal advice from your real numbers
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Ask “Where am I spending the most?” or “Create a monthly savings plan for me” and get answers grounded in your actual ledger.
              </p>
            </div>

            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 space-y-4">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                04. Monthly AI Financial Report
              </p>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                10-point monthly health audit with a score out of 100.
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Income, expense & savings breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Top spending categories & leaks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Practical campus savings strategies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Next-month action plan saved to history</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="font-display font-semibold text-slate-800 dark:text-slate-200">FinMate AI</span>
          <span>Student Expense Tracking & Financial Coaching · INR (₹)</span>
        </div>
      </footer>
    </div>
  );
}
