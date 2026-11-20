import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Send, Sparkles, Trash2 } from 'lucide-react';
import { AppShell, type AppRoute } from '../components/AppShell';
import { apiFetch } from '../lib/api';
import type { ChatMessageRecord } from '../types/app';

interface AiCoachPageProps {
  navigate: (path: AppRoute) => void;
}

const STARTER_QUESTIONS = [
  'Where am I spending the most?',
  'How can I save money this month?',
  'Am I overspending on food?',
  'Create a monthly savings plan for me.',
  'What are my biggest expense categories?',
  'How can I reduce my expenses?',
];

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        // Bold inline segments **...**
        const formatInline = (str: string) => {
          const parts = str.split(/(\*\*[^*]+\*\*)/g);
          return parts.map((part, idx) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={idx} className="font-semibold text-slate-900 dark:text-slate-100">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          );
        };

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          const heading = trimmed.replace(/^#{2,3}\s+/, '');
          return (
            <p key={i} className="font-display font-bold text-slate-900 dark:text-slate-100 pt-1">
              {heading}
            </p>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-blue-700 dark:text-blue-400 mt-1 text-xs">•</span>
              <span>{formatInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        return <p key={i}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

export function AiCoachPage({ navigate }: AiCoachPageProps) {
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ messages: ChatMessageRecord[] }>('/api/ai/chat');
      setMessages(res.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load conversation history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    setError(null);
    setInput('');
    setSending(true);

    const optimisticUser: ChatMessageRecord = {
      id: Date.now(),
      userId: 0,
      role: 'user',
      message: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const now = new Date();
      const res = await apiFetch<{
        userMessage: ChatMessageRecord;
        assistantMessage: ChatMessageRecord;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        res.userMessage,
        res.assistantMessage,
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(trimmed);
      setError(err instanceof Error ? err.message : 'FinMate AI Coach could not respond.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClear = async () => {
    setError(null);
    try {
      await apiFetch('/api/ai/chat', { method: 'DELETE' });
      setMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear chat.');
    }
  };

  return (
    <AppShell
      currentPath="/coach"
      navigate={navigate}
      title="FinMate AI Coach"
      subtitle="Personalized budgeting and savings advice grounded in your real transactions"
      headerAction={
        messages.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        ) : undefined
      }
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col h-[calc(100vh-14rem)] min-h-[480px] overflow-hidden">
        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <div className="h-16 w-2/3 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="h-24 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5 py-6">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Ask FinMate AI Coach anything about your money
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your coach analyzes only your logged transactions and budget caps to give practical Indian college student advice.
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 ${
                      isUser
                        ? 'bg-blue-800 dark:bg-blue-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                    ) : (
                      renderFormattedText(msg.message)
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                FinMate AI Coach is analyzing your ledger...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 flex items-center gap-2 overflow-x-auto">
          {STARTER_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => sendMessage(q)}
              className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-slate-700 dark:text-slate-200 rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mx-4 mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <label htmlFor="coach-input" className="sr-only">
            Ask FinMate AI Coach
          </label>
          <input
            id="coach-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spending, food budget, or savings plan..."
            disabled={sending}
            className="flex-1 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </AppShell>
  );
}
