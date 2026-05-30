import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://skillful-trust-production-832b.up.railway.app';

export function useApi() {
  const { token, logout } = useAuth();

  const apiFetch = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired');
    }

    const json = await response.json() as { success: boolean; data?: T; error?: unknown };
    if (!json.success) {
      const msg = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      throw new Error(msg ?? 'Request failed');
    }
    return json.data as T;
  }, [token, logout]);

  return { apiFetch };
}
