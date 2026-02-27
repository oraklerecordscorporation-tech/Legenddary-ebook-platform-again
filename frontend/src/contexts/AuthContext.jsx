import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refresh_token'));
  const [loading, setLoading] = useState(true);
  const refreshPromiseRef = useRef(null);

  const applyAuthData = useCallback((authData) => {
    localStorage.setItem('access_token', authData.access_token);
    localStorage.setItem('refresh_token', authData.refresh_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${authData.access_token}`;
    setToken(authData.access_token);
    setRefreshToken(authData.refresh_token);
    setUser(authData.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const refreshTokens = useCallback(async (explicitRefreshToken = null) => {
    const activeRefreshToken = explicitRefreshToken || refreshToken || localStorage.getItem('refresh_token');
    if (!activeRefreshToken) {
      throw new Error('No refresh token available');
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = axios
      .post(
        `${API}/auth/refresh`,
        { refresh_token: activeRefreshToken },
        { skipAuthRefresh: true }
      )
      .then((res) => {
        applyAuthData(res.data);
        return res.data;
      })
      .catch((err) => {
        logout();
        throw err;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    return refreshPromiseRef.current;
  }, [applyAuthData, logout, refreshToken]);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};
        const statusCode = error.response?.status;
        const requestUrl = originalRequest.url || '';
        const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register') || requestUrl.includes('/auth/refresh');

        if (
          statusCode === 401 &&
          !originalRequest._retry &&
          !isAuthRoute &&
          !originalRequest.skipAuthRefresh
        ) {
          originalRequest._retry = true;
          try {
            const refreshedData = await refreshTokens(localStorage.getItem('refresh_token'));
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${refreshedData.access_token}`,
            };
            return axios(originalRequest);
          } catch (refreshErr) {
            return Promise.reject(refreshErr);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshTokens]);

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

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    applyAuthData(res.data);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    applyAuthData(res.data);
    return res.data;
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
