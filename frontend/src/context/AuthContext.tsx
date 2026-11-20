import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (passcode: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (passcode: string, displayName: string) => {
    const res = await api.login(passcode, displayName);
    const defaultHash = res.user.role === 'group_admin' || res.user.role === 'super_admin' ? 'admin' : 'scenarios';
    window.location.hash = '#' + defaultHash;
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      localStorage.removeItem('auth_token');
    } finally {
      sessionStorage.removeItem('scenariolab_eval_session_id');
      try {
        window.history.replaceState(null, '', window.location.pathname);
      } catch {
        window.location.hash = '';
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
