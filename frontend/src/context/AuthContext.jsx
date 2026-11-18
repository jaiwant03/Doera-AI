import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import wsClient from '../services/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('doera_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check for token in URL query params (e.g. returned from Google OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      if (urlToken) {
        localStorage.setItem('doera_token', urlToken);
        setToken(urlToken);
        // Clean query parameter from browser address bar
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const activeToken = urlToken || localStorage.getItem('doera_token');
      if (activeToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('doera_user', JSON.stringify(res.data.user));
          wsClient.connect();
        } catch (err) {
          console.error('[DOERA Auth] Failed to verify current user:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('doera_token', newToken);
    localStorage.setItem('doera_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    wsClient.connect();
    return userData;
  };

  const googleLogin = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('doera_token', newToken);
    localStorage.setItem('doera_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    wsClient.connect();
    return userData;
  };

  const initiateGoogleOAuth = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${backendUrl}/auth/google?redirect=true`;
  };

  const signup = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('doera_token', newToken);
    localStorage.setItem('doera_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    wsClient.connect();
    return userData;
  };

  const resetPassword = async (email, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, newPassword });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('doera_token', newToken);
    localStorage.setItem('doera_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    wsClient.connect();
    return userData;
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout').catch(() => {});
      }
    } finally {
      localStorage.removeItem('doera_token');
      localStorage.removeItem('doera_user');
      setToken(null);
      setUser(null);
      wsClient.disconnect();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        googleLogin,
        initiateGoogleOAuth,
        resetPassword,
        logout,
      }}
    >
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
