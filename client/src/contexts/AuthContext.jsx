import { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

// 1. Create the context
const AuthContext = createContext();

// 2. Provider component — wraps your whole app
export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);   // Logged-in user data
  const [token, setToken]     = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);   // True while checking auth status

  // On app load: if token exists, fetch current user from backend
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await axiosInstance.get('/auth/me');
          setUser(res.data);
        } catch {
          // Token invalid or expired — clear it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  // Login function — call this from LoginPage
  const login = (userData, tokenValue) => {
    localStorage.setItem('token', tokenValue);
    setToken(tokenValue);
    setUser(userData);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom hook for easy access in any component
export const useAuth = () => useContext(AuthContext);