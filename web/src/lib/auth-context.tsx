'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('micaela_token');
    const savedUser = localStorage.getItem('micaela_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('micaela_token');
        localStorage.removeItem('micaela_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newRefreshToken: string, newUser: User) => {
    localStorage.setItem('micaela_token', newToken);
    localStorage.setItem('micaela_refresh_token', newRefreshToken);
    localStorage.setItem('micaela_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('micaela_token');
    localStorage.removeItem('micaela_refresh_token');
    localStorage.removeItem('micaela_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
