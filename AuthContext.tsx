import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = 'nexus_users';
const CURRENT_USER_KEY = 'nexus_current_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load user:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function getUsers(): Promise<Record<string, { password: string; id: string }>> {
    try {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || !password) {
      return { success: false, error: 'Please enter both username and password' };
    }

    const users = await getUsers();
    const userData = users[trimmed];

    if (!userData) {
      return { success: false, error: 'Account not found. Please sign up first.' };
    }

    if (userData.password !== password) {
      return { success: false, error: 'Incorrect password' };
    }

    const loggedInUser: User = { id: userData.id, username: trimmed };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return { success: true };
  }

  async function signup(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || !password) {
      return { success: false, error: 'Please enter both username and password' };
    }
    if (trimmed.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters' };
    }

    const users = await getUsers();
    if (users[trimmed]) {
      return { success: false, error: 'Username already exists' };
    }

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    users[trimmed] = { password, id };
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

    const newUser: User = { id, username: trimmed };
    await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    return { success: true };
  }

  async function logout() {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  }

  const value = useMemo(() => ({
    user,
    isLoading,
    login,
    signup,
    logout,
  }), [user, isLoading]);

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
