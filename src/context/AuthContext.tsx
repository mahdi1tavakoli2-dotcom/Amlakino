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
  login: (mobileOrEmail: string, passwordAttempt: string) => Promise<void>;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  const loadAvailableUsers = async () => {
    try {
      const users = await storageService.getUsers();
      setAvailableUsers(users);
    } catch (e) {
      console.warn('Failed loading available users', e);
    }
  };

  const refreshTeam = async () => {
    try {
      const t = await storageService.getTeam();
      setTeam(t);
    } catch (e) {
      console.warn('Failed refreshing team', e);
    }
  };

  useEffect(() => {
    async function initAuth() {
      try {
        // Single source of truth: Supabase Auth session via getSession()
        const session: AuthSession = await authService.getSession();
        if (session.user && session.isAuthenticated) {
          setUser(session.user);
          setIsAuthenticated(true);
          await refreshTeam();
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setTeam(null);
        }
        await loadAvailableUsers();
      } catch (e) {
        console.error('Auth initialization error:', e);
        setUser(null);
        setIsAuthenticated(false);
        setTeam(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes
    const authSub = authService.onAuthStateChange(async (updatedUser) => {
      if (updatedUser) {
        setUser(updatedUser);
        setIsAuthenticated(true);
        await refreshTeam();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setTeam(null);
      }
    });

    return () => {
      authSub?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  const login = async (mobileOrEmail: string, passwordAttempt: string) => {
    const loggedUser = await authService.loginWithPassword(mobileOrEmail, passwordAttempt);
    const session = await authService.getSession();
    const finalUser = session.user || loggedUser;
    setUser(finalUser);
    setIsAuthenticated(Boolean(finalUser));
    await refreshTeam();
    await loadAvailableUsers();
  };

  const loginWithOtp = async (mobile: string, code?: string) => {
    const loggedUser = await authService.loginWithMobile(mobile, code);
    const session = await authService.getSession();
    const finalUser = session.user || loggedUser;
    setUser(finalUser);
    setIsAuthenticated(Boolean(finalUser));
    await refreshTeam();
    await loadAvailableUsers();
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
    const session = await authService.getSession();
    const finalUser = session.user || newUser;
    setUser(finalUser);
    setIsAuthenticated(Boolean(finalUser));
    await refreshTeam();
    await loadAvailableUsers();
  };

  const switchDemoUser = async (userId: string) => {
    const switched = await authService.switchDemoUser(userId);
    setUser(switched);
    setIsAuthenticated(true);
    await refreshTeam();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setTeam(null);
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
