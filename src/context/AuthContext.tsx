import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Team, UserRole } from '../types';
import { authService, AuthSession } from '../services/authService';
import { storageService } from '../services/storageService';

interface AuthContextType {
  user: User | null;
  team: Team | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  availableUsers: User[];
  login: (mobile: string, passwordAttempt: string) => Promise<void>;
  loginWithOtp: (mobile: string, code?: string) => Promise<void>;
  register: (params: {
    fullName: string;
    mobile: string;
    role: UserRole;
    email?: string;
    password?: string;
    licenseCode?: string;
  }) => Promise<void>;
  switchDemoUser: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTeam: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  const loadAvailableUsers = async () => {
    const users = await storageService.getUsers();
    setAvailableUsers(users);
  };

  const refreshTeam = async () => {
    const t = await storageService.getTeam();
    setTeam(t);
  };

  useEffect(() => {
    async function initAuth() {
      try {
        const session: AuthSession = await authService.getSession();
        if (session.user) {
          setUser(session.user);
          await refreshTeam();
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
        await loadAvailableUsers();
      } catch (e) {
        console.error('Auth initialization error:', e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (mobile: string, passwordAttempt: string) => {
    const loggedUser = await authService.loginWithPassword(mobile, passwordAttempt);
    setUser(loggedUser);
    await refreshTeam();
    await loadAvailableUsers();
    setIsAuthenticated(true);
  };

  const loginWithOtp = async (mobile: string, code?: string) => {
    const loggedUser = await authService.loginWithMobile(mobile, code);
    setUser(loggedUser);
    await refreshTeam();
    await loadAvailableUsers();
    setIsAuthenticated(true);
  };

  const register = async (params: {
    fullName: string;
    mobile: string;
    role: UserRole;
    email?: string;
    password?: string;
    licenseCode?: string;
  }) => {
    const newUser = await authService.register(params);
    setUser(newUser);
    await refreshTeam();
    await loadAvailableUsers();
    setIsAuthenticated(true);
  };

  const switchDemoUser = async (userId: string) => {
    const switched = await authService.switchDemoUser(userId);
    setUser(switched);
    await refreshTeam();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        isAuthenticated,
        isLoading,
        availableUsers,
        login,
        loginWithOtp,
        register,
        switchDemoUser,
        logout,
        refreshTeam,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
