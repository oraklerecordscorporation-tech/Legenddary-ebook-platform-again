import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch (err) {
      if (err.response?.status === 401 && refreshToken) {
        await refreshTokens();
      } else {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshTokens = async () => {
    try {
      const res = await axios.post(`${API}/auth/refresh`, { refresh_token: refreshToken });
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
      setToken(res.data.access_token);
      setRefreshToken(res.data.refresh_token);
      setUser(res.data.user);
    } catch (err) {
      logout();
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
    setToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
    setToken(res.data.access_token);
    setRefreshToken(res.data.refresh_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshTokens }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
