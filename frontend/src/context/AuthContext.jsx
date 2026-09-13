import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await authAPI.getMe();
          if (res.success && res.data.user) {
            setUser(res.data.user);
          }
        } catch (e) {
          console.warn('[AuthContext] Automatic token validation failed:', e.message);
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setAuthToken(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('preply:unauthorized', handleUnauthorized);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('preply:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    if (res.success && res.data.token) {
      setAuthToken(res.data.token);
      setUser(res.data.user);
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register(name, email, password);
    if (res.success && res.data.token) {
      setAuthToken(res.data.token);
      setUser(res.data.user);
    }
    return res;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (e) {
      // ignore error during logout
    }
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
