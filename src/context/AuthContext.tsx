import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  hasUsers: boolean | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (input: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
    jabatan?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  const loadBootstrapAndMe = useCallback(async () => {
    try {
      const [statusRes, meRes] = await Promise.all([
        apiFetch<{ hasUsers: boolean }>('/api/auth/bootstrap-status'),
        apiFetch<{ user: UserProfile | null }>('/api/auth/me'),
      ]);
      setHasUsers(statusRes.hasUsers);
      setUser(meRes.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBootstrapAndMe();

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(() => {
        void loadBootstrapAndMe();
      });
      return () => {
        data.subscription.unsubscribe();
      };
    }
    return undefined;
  }, [loadBootstrapAndMe]);

  const login = useCallback(async (email: string, password: string): Promise<UserProfile> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const meRes = await apiFetch<{ user: UserProfile | null }>('/api/auth/me');
      if (!meRes.user) throw new Error('Profil pengguna tidak ditemukan.');
      setUser(meRes.user);
      setHasUsers(true);
      return meRes.user;
    }

    const res = await apiFetch<{ user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    setHasUsers(true);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      full_name: string;
      nip?: string;
      jabatan?: string;
    }): Promise<UserProfile> => {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (error) throw new Error(error.message);
      }

      setUser(res.user);
      setHasUsers(true);
      return res.user;
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasUsers,
        login,
        register,
        logout,
        refreshUser: loadBootstrapAndMe,
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
