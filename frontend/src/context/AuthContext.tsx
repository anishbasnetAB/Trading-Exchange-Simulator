import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface LoginData {
  accessToken: string;
  user: { id: string; email: string; role: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]  = useState<string | null>(null);
  const [user,  setUser]   = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { success: boolean; data?: LoginData; error?: string };
    if (!json.success || !json.data) throw new Error(json.error ?? 'Login failed');

    setToken(json.data.accessToken);
    // login returns user.id; JWT uses userId — map once here
    setUser({ userId: json.data.user.id, email: json.data.user.email, role: json.data.user.role });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { success: boolean; error?: string };
    if (!json.success) throw new Error(json.error ?? 'Registration failed');
  }, []);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
