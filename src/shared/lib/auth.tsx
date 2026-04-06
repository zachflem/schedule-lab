import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import type { Personnel } from '@/shared/validation/schemas';

interface AuthContextType {
  user: (Personnel & { realRole?: string, isMocked?: boolean }) | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => void;
  setMockRole: (role: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(Personnel & { realRole?: string, isMocked?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await api.get<Personnel & { realRole?: string, isMocked?: boolean }>('/me');
      setUser(data);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof Error && !err.message.includes('401') && !err.message.includes('403')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear mock role on logout as requested
    document.cookie = 'mock-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/cdn-cgi/access/logout';
  };

  const setMockRole = async (role: string | null) => {
    if (!role || role === 'admin') {
      document.cookie = 'mock-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } else {
      document.cookie = `mock-role=${role}; path=/`;
    }
    await fetchUser();
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh: fetchUser, logout, setMockRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
