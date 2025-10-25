'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          localStorage.removeItem('token'); // invalid token
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data?.detail || 'Login failed' };
      }

      // Store only token
      localStorage.setItem('token', data.access_token);

      // Fetch user data
      const meRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const userData = await meRes.json();
      setUser(userData);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (userData) => {
    try {
      const payload = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        password: userData.password,
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data?.detail || 'Registration failed' };
      }

      // After successful registration, automatically log the user in to obtain a token
      const loginResult = await login(userData.email, userData.password);
      if (!loginResult.success) {
        // registration succeeded but automatic login failed; return partial success
        return { success: false, error: loginResult.error || 'Registration succeeded but login failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  // helper to attach auth header automatically
  const authFetch = async (url, opts = {}) => {
    const token = localStorage.getItem('token');
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { ...opts, headers });
    return res;
  };

  // Generate roadmap by uploading a file to backend and returning parsed result
  // Accepts a File object and optional path (defaults to /roadmap/generate)
  const generateRoadmap = async (file, path = '/roadmap/generate') => {
    try {
      if (!file) return { success: false, error: 'No file provided' };

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = `${API_BASE}${path}`;
      const res = await authFetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        return { success: false, error: text || `Server error: ${res.status}` };
      }

      const json = await res.json().catch(() => ({}));
      return { success: true, data: json };
    } catch (err) {
      return { success: false, error: err.message || 'Roadmap generation failed' };
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    authFetch,
    generateRoadmap,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
