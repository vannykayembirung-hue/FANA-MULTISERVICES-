import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppUser } from '../types';
import { requestJson } from '../utils/request';

interface AuthContextValue {
  user: AppUser | null;
  status: 'loading' | 'authenticated' | 'anonymous' | 'error';
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (input: { name: string; organizationName: string; email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await requestJson<{ user: AppUser | null }>('/api/auth/session');
      setUser(response.user);
      setStatus(response.user ? 'authenticated' : 'anonymous');
      setError(null);
    } catch (reason) {
      setUser(null);
      setStatus('error');
      setError(reason instanceof Error ? reason.message : 'Impossible de vérifier la session.');
    }
  }, []);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await requestJson<{ user: AppUser }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      setUser(response.user);
      setStatus('authenticated');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible.');
      return false;
    }
  };

  const register = async (input: { name: string; organizationName: string; email: string; password: string }) => {
    setError(null);
    try {
      const response = await requestJson<{ user: AppUser }>('/api/auth/register', {
        method: 'POST', body: JSON.stringify(input),
      });
      setUser(response.user);
      setStatus('authenticated');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création du compte impossible.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await requestJson('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } finally {
      setUser(null);
      setStatus('anonymous');
      setError(null);
    }
  };

  const clearError = () => setError(null);
  return <AuthContext.Provider value={{ user, status, error, login, register, logout, clearError, refreshSession }}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
