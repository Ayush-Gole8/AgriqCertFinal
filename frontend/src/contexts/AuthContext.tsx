import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { apiClient } from '@/api/apiClient';
import type { User, UserRole, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    organization?: string,
    phone?: string,
    address?: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const getCookie = (name: string): string | null => {
  const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  if (!value) return null;
  return decodeURIComponent(value.split('=')[1] || '');
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const accessToken = getCookie('agriqcert_access_token');
      const refreshToken = getCookie('agriqcert_refresh_token');
      const hasSession = !!accessToken || !!refreshToken;
      const storedUser = localStorage.getItem('agriqcert_user');

      if (!hasSession) {
        if (isMounted) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
        return;
      }

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          if (isMounted) {
            setAuthState({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch {
          localStorage.removeItem('agriqcert_user');
        }
      }

      try {
        const response = await apiClient.get('/auth/profile');
        const user = response.data.data.user as User;
        localStorage.setItem('agriqcert_user', JSON.stringify(user));
        if (isMounted) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403) {
          deleteCookie('agriqcert_access_token');
          deleteCookie('agriqcert_refresh_token');
          localStorage.removeItem('agriqcert_user');
          if (isMounted) {
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else if (!storedUser && isMounted) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const { tokens, user } = response.data.data;
      const { accessToken, refreshToken } = tokens;

      setCookie('agriqcert_access_token', accessToken, 1);
      setCookie('agriqcert_refresh_token', refreshToken, 7);
      localStorage.setItem('agriqcert_user', JSON.stringify(user));

      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getCookie('agriqcert_refresh_token');
      if (refreshToken) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          { refreshToken },
          { withCredentials: true }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          { withCredentials: true }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      deleteCookie('agriqcert_access_token');
      deleteCookie('agriqcert_refresh_token');
      localStorage.removeItem('agriqcert_user');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: UserRole,
      organization?: string,
      phone?: string,
      address?: string
    ) => {
      try {
        if (role === 'admin') {
          throw new Error('Admin users cannot sign up from the application');
        }

        const response = await axios.post(
          `${API_BASE_URL}/auth/register`,
          {
            email,
            password,
            name,
            role,
            organization,
            phone,
            address,
          },
          { withCredentials: true }
        );

        const { tokens, user } = response.data.data;
        const { accessToken, refreshToken } = tokens;

        setCookie('agriqcert_access_token', accessToken, 1);
        setCookie('agriqcert_refresh_token', refreshToken, 7);
        localStorage.setItem('agriqcert_user', JSON.stringify(user));

        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Signup failed:', error);
        throw error;
      }
    },
    []
  );

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

// Disable fast-refresh rule: this module exports a hook and provider
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
