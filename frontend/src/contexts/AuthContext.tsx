import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import type { User, UserRole, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use Vite environment variable when available, fallback to localhost:5000
const API_BASE_URL = (import.meta as any)?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Check for stored auth on mount and validate token
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('agriqcert_access_token');
      const storedUser = localStorage.getItem('agriqcert_user');
      
      if (accessToken && storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Trust the stored token initially, validation will happen on first API call
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          // Invalid stored user data, clear storage
          localStorage.removeItem('agriqcert_access_token');
          localStorage.removeItem('agriqcert_refresh_token');
          localStorage.removeItem('agriqcert_user');
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });
      
      const { tokens, user } = response.data.data;
      const { accessToken, refreshToken } = tokens;
      
      localStorage.setItem('agriqcert_access_token', accessToken);
      localStorage.setItem('agriqcert_refresh_token', refreshToken);
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
      const refreshToken = localStorage.getItem('agriqcert_refresh_token');
      if (refreshToken) {
        await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('agriqcert_access_token');
      localStorage.removeItem('agriqcert_refresh_token');
      localStorage.removeItem('agriqcert_user');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, role: UserRole) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        name,
        role
      });
      
      const { tokens, user } = response.data.data;
      const { accessToken, refreshToken } = tokens;
      
      localStorage.setItem('agriqcert_access_token', accessToken);
      localStorage.setItem('agriqcert_refresh_token', refreshToken);
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
  }, []);

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
