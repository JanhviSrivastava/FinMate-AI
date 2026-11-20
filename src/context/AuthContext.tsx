import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getStoredToken, registerUnauthorizedHandler, setStoredToken } from '../lib/api';
import type { UserProfile } from '../types/app';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
  updateLocalUser: (user: UserProfile, token?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setStoredToken(null);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    let active = true;
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiFetch<{ user: UserProfile }>('/api/auth/me')
      .then((res) => {
        if (active) {
          setUser(res.user);
        }
      })
      .catch(() => {
        if (active) {
          setStoredToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(res.token);
    setUser(res.user);
  }, []);

  const loginDemo = useCallback(async () => {
    const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/demo', {
      method: 'POST',
    });
    setStoredToken(res.token);
    setUser(res.user);
  }, []);

  const updateLocalUser = useCallback((nextUser: UserProfile, token?: string) => {
    if (token) setStoredToken(token);
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginDemo,
        logout,
        updateLocalUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
