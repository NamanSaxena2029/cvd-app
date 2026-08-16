import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginUser, registerUser, fetchCurrentUser } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cvd_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cvd_token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((u) => {
        setUser(u);
        localStorage.setItem('cvd_user', JSON.stringify(u));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('cvd_token');
        localStorage.removeItem('cvd_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: u } = await loginUser(credentials);
    localStorage.setItem('cvd_token', token);
    localStorage.setItem('cvd_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: u } = await registerUser(payload);
    localStorage.setItem('cvd_token', token);
    localStorage.setItem('cvd_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cvd_token');
    localStorage.removeItem('cvd_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
