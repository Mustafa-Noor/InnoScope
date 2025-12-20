'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const DUMMY_TOKEN = 'dummy-local-token';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          // Token exists - user is logged in
          // Parse user from token if possible, or use a default
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const DUMMY_USER = { 
                id: payload.sub || 'user', 
                email: payload.email || 'user@app', 
                first_name: 'User', 
                last_name: 'Account', 
                name: 'User Account' 
              };
              setUser(DUMMY_USER);
            }
          } catch (e) {
            // If can't parse JWT, use generic user
            const DUMMY_USER = { id: 'user', email: 'user@app', first_name: 'User', last_name: 'Account', name: 'User Account' };
            setUser(DUMMY_USER);
          }
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

      // Set user from token payload
      try {
        const parts = data.access_token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const DUMMY_USER = { 
            id: payload.sub || 'user', 
            email: data.email || 'user@app', 
            first_name: userData?.firstName || 'User', 
            last_name: userData?.lastName || 'Account', 
            name: `${userData?.firstName || 'User'} ${userData?.lastName || 'Account'}` 
          };
          setUser(DUMMY_USER);
          try { localStorage.setItem('user', JSON.stringify(DUMMY_USER)); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.warn('Could not parse token:', e);
      }

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
    try { localStorage.removeItem('user'); } catch (e) { /* ignore */ }
  };

  // helper to attach auth header automatically
  const authFetch = async (url, opts = {}) => {
    // Ensure we always send an Authorization header. If no real token is present,
    // fall back to a dummy token that the backend accepts in development/local.
    let token = localStorage.getItem('token');
    if (!token) {
      token = DUMMY_TOKEN;
      try {
        // persist fallback token so subsequent requests remain consistent
        localStorage.setItem('token', token);
      } catch (e) {
        // ignore storage errors (e.g., privacy modes)
      }
    }

    const headers = { ...(opts.headers || {}), Authorization: `Bearer ${token}` };
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