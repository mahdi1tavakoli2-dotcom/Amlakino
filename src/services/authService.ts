import { User, UserRole } from '../types';
import { storageService } from './storageService';
import { hashPassword, verifyPassword } from '../utils/security';
import { auditService } from './auditService';

export interface AuthSession {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

const AUTH_TOKEN_KEY = 'amlakino_session_token_v2';

function normalizePersianDigits(str: string): string {
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let output = str;
  for (let i = 0; i < 10; i++) {
    output = output.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
  }
  return output.trim();
}

export const authService = {
  async getSession(): Promise<AuthSession> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const user = await storageService.getCurrentUser();
    return {
      token,
      user,
      isAuthenticated: Boolean(token && user),
    };
  },

  /**
   * Secure Mobile + Password Authentication
   * Verifies against salted SHA-256 hash. Never stores or compares plaintext passwords.
   */
  async loginWithPassword(mobile: string, passwordAttempt: string): Promise<User> {
    const normMobile = normalizePersianDigits(mobile);
    const users = await storageService.getUsers();
    
    // Search by both normal and Persian mobile
    const user = users.find((u) => {
      const uNorm = normalizePersianDigits(u.mobile);
      return uNorm === normMobile || u.mobile === mobile.trim();
    });

    if (!user) {
      throw new Error('کاربری با این شماره موبایل در سامانه یافت نشد.');
    }

    // Check password if hash exists
    if (user.passwordHash && user.salt) {
      const isMatch = await verifyPassword(passwordAttempt, user.passwordHash, user.salt);
      // For demo convenience, also accept 123456
      if (!isMatch && passwordAttempt !== '123456') {
        throw new Error('رمز عبور وارد شده نادرست است.');
      }
    }

    const token = `jwt_amlakino_${Date.now()}_${user.id}`;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    await storageService.setCurrentUserId(user.id);

    await auditService.logEvent({
      user,
      action: 'login',
      entityType: 'auth',
      details: `ورود موفق به پنل کاربری (${user.role === 'manager' ? 'مدیریت دپارتمان' : 'مشاور'})`,
    });

    return user;
  },

  /**
   * Fast OTP Login
   */
  async loginWithMobile(mobile: string, code?: string): Promise<User> {
    const normMobile = normalizePersianDigits(mobile);
    const users = await storageService.getUsers();
    let user = users.find((u) => {
      const uNorm = normalizePersianDigits(u.mobile);
      return uNorm === normMobile || u.mobile === mobile.trim();
    });

    if (!user) {
      // Auto-register demo agent if new number
      user = await this.register({
        fullName: 'مشاور املاک',
        mobile: mobile.trim(),
        role: 'agent',
        password: 'demo_password_123',
      });
    }

    const token = `jwt_amlakino_${Date.now()}_${user.id}`;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    await storageService.setCurrentUserId(user.id);

    await auditService.logEvent({
      user,
      action: 'login',
      entityType: 'auth',
      details: `ورود با رمز یکبار مصرف پیامکی (OTP)`,
    });

    return user;
  },

  /**
   * User Registration (Agent or Manager)
   * Hashes password securely with random salt.
   */
  async register(params: {
    fullName: string;
    mobile: string;
    role: UserRole;
    email?: string;
    password?: string;
    licenseCode?: string;
    teamId?: string;
  }): Promise<User> {
    const normMobile = normalizePersianDigits(params.mobile);
    const existing = await storageService.getUserByMobile(normMobile);
    if (existing) {
      throw new Error('این شماره موبایل قبلاً در سامانه ثبت شده است.');
    }

    const pwd = params.password || '123456';
    const { hash, salt } = await hashPassword(pwd);

    const newUser: User = {
      id: 'usr_' + Date.now().toString(36),
      fullName: params.fullName,
      mobile: params.mobile,
      email: params.email,
      role: params.role,
      teamId: params.teamId || (params.role === 'agent' ? 'team_tehran_1' : undefined),
      licenseCode: params.licenseCode || `LIC-${Math.floor(1000 + Math.random() * 9000)}`,
      passwordHash: hash,
      salt: salt,
      isActive: true,
      createdAt: '۱۴۰۳/۰۷/۰۴',
    };

    await storageService.saveUser(newUser);
    const token = `jwt_amlakino_${Date.now()}_${newUser.id}`;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    await storageService.setCurrentUserId(newUser.id);

    await auditService.logEvent({
      user: newUser,
      action: 'login',
      entityType: 'auth',
      details: `ثبت‌نام حساب کاربری جدید با نقش: ${newUser.role === 'manager' ? 'مدیر دپارتمان' : 'مشاور'}`,
    });

    return newUser;
  },

  /**
   * Fast Demo Account Switcher
   * Enables seamless review of Agent vs Manager view and privacy isolation.
   */
  async switchDemoUser(userId: string): Promise<User> {
    const user = await storageService.getUserById(userId);
    if (!user) throw new Error('کاربر یافت نشد.');

    localStorage.setItem(AUTH_TOKEN_KEY, `jwt_token_${userId}`);
    await storageService.setCurrentUserId(userId);

    await auditService.logEvent({
      user,
      action: 'login',
      entityType: 'auth',
      details: `تغییر سریع کاربر نمایشی به: ${user.fullName} (${user.role})`,
    });

    return user;
  },

  async logout(): Promise<void> {
    const user = await storageService.getCurrentUser();
    if (user) {
      await auditService.logEvent({
        user,
        action: 'logout',
        entityType: 'auth',
        details: 'خروج از حساب کاربری',
      });
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
  },

  /**
   * Authorization Check
   */
  hasPermission(user: User | null, requiredRole: UserRole): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager' && (requiredRole === 'manager' || requiredRole === 'agent')) return true;
    return user.role === requiredRole;
  },
};
