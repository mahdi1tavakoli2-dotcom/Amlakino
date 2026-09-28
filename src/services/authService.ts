import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { auditService } from './auditService';
import { otpService } from './otpService';

export interface AuthSession {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

function normalizePersianDigits(str: string): string {
  const persianNumbers = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicNumbers = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let output = str || '';
  for (let i = 0; i < 10; i++) {
    output = output.replace(persianNumbers[i], i.toString()).replace(arabicNumbers[i], i.toString());
  }
  return output.trim().replace(/\s+/g, '');
}

function mobileToEmail(mobile: string): string {
  const clean = normalizePersianDigits(mobile);
  return `${clean}@amlakino.internal`;
}

/**
 * Authentication service using Supabase Auth session management as the single source of truth.
 * No custom storage or in-memory bypasses are maintained when Supabase is configured.
 */
export const authService = {
  /**
   * Listen to Supabase Auth state changes
   * Directly updates caller with user profile matching current Supabase Auth session.
   */
  onAuthStateChange(callback: (user: User | null, session?: any) => void) {
    if (!isSupabaseConfigured()) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = await this.fetchProfile(session.user.id);
        callback(user, session);
      } else {
        callback(null, null);
      }
    });
  },

  /**
   * Fetch user profile from Supabase `profiles` table.
   * If table row is absent, falls back to Supabase Auth session user metadata.
   */
  async fetchProfile(userId: string): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        const user: User = {
          id: data.id,
          fullName: data.full_name || 'کاربر سیستم',
          mobile: data.mobile || '',
          email: data.email || undefined,
          role: (data.role as UserRole) || 'agent',
          teamId: data.team_id || undefined,
          avatarUrl: data.avatar_url || undefined,
          licenseCode: data.license_code || undefined,
          isActive: data.is_active ?? true,
          agentMode: data.agent_mode || 'team_member',
          subscriptionStatus: data.subscription_status || 'none',
          exitDate: data.exit_date || undefined,
          gracePeriodEndsAt: data.grace_period_ends_at || undefined,
          createdAt: data.created_at || new Date().toISOString(),
        };
        return user;
      }

      // Fallback: extract metadata directly from Supabase Auth session user
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (authUser && authUser.id === userId) {
        const meta = authUser.user_metadata || {};
        return {
          id: authUser.id,
          fullName: meta.full_name || authUser.email?.split('@')[0] || 'کاربر املاکینو',
          mobile: meta.mobile || '',
          email: authUser.email,
          role: (meta.role as UserRole) || 'agent',
          teamId: meta.team_id || undefined,
          licenseCode: meta.license_code || undefined,
          isActive: true,
          agentMode: 'team_member',
          subscriptionStatus: 'active',
          createdAt: authUser.created_at || new Date().toISOString(),
        };
      }

      return null;
    } catch (e) {
      console.error('fetchProfile error:', e);
      return null;
    }
  },

  /**
   * Get active session from Supabase Auth - Single Source of Truth
   */
  async getSession(): Promise<AuthSession> {
    if (!isSupabaseConfigured()) {
      return {
        token: null,
        user: null,
        isAuthenticated: false,
      };
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) {
        return { token: null, user: null, isAuthenticated: false };
      }

      const user = await this.fetchProfile(data.session.user.id);
      return {
        token: data.session.access_token,
        user,
        isAuthenticated: Boolean(user),
      };
    } catch (e) {
      console.error('Supabase getSession error:', e);
      return { token: null, user: null, isAuthenticated: false };
    }
  },

  /**
   * Real Supabase Password Authentication
   * Validates securely against Supabase Auth without hardcoded bypasses or custom storage.
   */
  async loginWithPassword(mobileOrEmail: string, passwordAttempt: string): Promise<User> {
    if (!mobileOrEmail || !passwordAttempt) {
      throw new Error('لطفاً نام کاربری/شماره موبایل و رمز عبور را وارد نمایید.');
    }

    const isEmail = mobileOrEmail.includes('@');
    const authEmail = isEmail ? mobileOrEmail.trim() : mobileToEmail(mobileOrEmail);

    if (!isSupabaseConfigured()) {
      throw new Error('پایگاه داده Supabase هنوز پیکربندی نشده است. لطفاً در بخش تنظیمات آدرس و کلید Supabase را وارد نمایید.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: passwordAttempt,
    });

    if (error || !data.user) {
      throw new Error(
        error?.message === 'Invalid login credentials'
          ? 'شماره موبایل یا رمز عبور اشتباه است.'
          : (error?.message || 'خطا در ورود به سامانه.')
      );
    }

    // Rely on getSession as single source of truth
    const sessionRes = await this.getSession();
    const profile = sessionRes.user || (await this.fetchProfile(data.user.id));
    if (!profile) {
      throw new Error('پروفایل کاربری یافت نشد.');
    }

    await auditService.logEvent({
      user: profile,
      action: 'login',
      entityType: 'auth',
      details: `ورود امن به پنل کاربری: ${profile.fullName}`,
    });

    return profile;
  },

  /**
   * Phone OTP Login with Supabase Edge Function & verifyOtp
   */
  async loginWithMobile(mobile: string, code?: string): Promise<User> {
    const cleanMobile = normalizePersianDigits(mobile);
    if (!cleanMobile) {
      throw new Error('شماره تلفن همراه الزامی است.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('پایگاه داده Supabase پیکربندی نشده است. لطفاً در بخش تنظیمات اتصال به دیتابیس را فعال نمایید.');
    }

    if (!code) {
      throw new Error('کد تایید پیامکی الزامی است.');
    }

    const verifyRes = await otpService.verifyOtp(cleanMobile, code);
    if (!verifyRes.success || !verifyRes.token_hash) {
      throw new Error(verifyRes.message || 'کد تایید پیامکی نامعتبر است یا توکن ورود تولید نشد.');
    }

    // Establish official Supabase Auth session via magiclink token_hash
    const { data: authData, error: sessionErr } = await supabase.auth.verifyOtp({
      token_hash: verifyRes.token_hash,
      type: 'magiclink',
    });

    if (sessionErr || !authData.user) {
      throw new Error(sessionErr?.message || 'خطا در برقراری نشست امن ورود با سرور پایگاه داده.');
    }

    // Confirm session via single source of truth
    const sessionRes = await this.getSession();
    const profile = sessionRes.user || (await this.fetchProfile(authData.user.id));
    if (!profile) {
      throw new Error('پروفایل کاربری در سرور یافت نشد.');
    }

    await auditService.logEvent({
      user: profile,
      action: 'login',
      entityType: 'auth',
      details: 'ورود رسمی از طریق رمز یکبار مصرف پیامکی با نشست امن Supabase',
    });

    return profile;
  },

  /**
   * Supabase User Registration
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
    const cleanMobile = normalizePersianDigits(params.mobile);
    if (!cleanMobile || cleanMobile.length < 10) {
      throw new Error('شماره تلفن همراه معتبر نیست.');
    }
    if (!params.password || params.password.length < 6) {
      throw new Error('رمز عبور باید حداقل ۶ نویسه (کاراکتر) باشد.');
    }

    const authEmail = params.email?.trim() || mobileToEmail(cleanMobile);

    if (!isSupabaseConfigured()) {
      throw new Error('پایگاه داده Supabase پیکربندی نشده است. برای ثبت‌نام لطفاً ابتدا اتصال دیتابیس را در تنظیمات وارد فرمایید.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          mobile: cleanMobile,
          role: params.role,
          team_id: params.teamId || null,
          license_code: params.licenseCode || null,
        },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'خطا در ثبت‌نام حساب کاربری در سرور.');
    }

    // Insert into public.profiles
    const newProfile: User = {
      id: data.user.id,
      fullName: params.fullName,
      mobile: cleanMobile,
      email: params.email,
      role: params.role,
      teamId: params.teamId,
      licenseCode: params.licenseCode,
      isActive: true,
      agentMode: 'team_member',
      subscriptionStatus: 'none',
      createdAt: new Date().toISOString(),
    };

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: params.fullName,
      mobile: cleanMobile,
      email: params.email || null,
      role: params.role,
      team_id: params.teamId || null,
      license_code: params.licenseCode || null,
      is_active: true,
    });

    if (profileError) {
      console.warn('Profile upsert warning:', profileError.message);
    }

    // Query session from single source of truth
    const sessionRes = await this.getSession();
    const finalUser = sessionRes.user || newProfile;

    await auditService.logEvent({
      user: finalUser,
      action: 'login',
      entityType: 'auth',
      details: `ثبت‌نام رسمی کاربر جدید: ${finalUser.fullName} (${finalUser.role})`,
    });

    return finalUser;
  },

  /**
   * Switch account for demo/evaluation
   * Prohibited when live Supabase session management is in effect.
   */
  async switchDemoUser(_userId: string): Promise<User> {
    if (isSupabaseConfigured()) {
      throw new Error('امکان تغییر کاربر دمو در حالت اتصال به سرور Supabase وجود ندارد. نشست فعال Supabase تنها منبع هویت است.');
    }
    throw new Error('سامانه در حالت اتصال پایگاه داده واقعی قرار دارد. لطفاً با رمز عبور یا پیامک وارد شوید.');
  },

  /**
   * Supabase Sign Out
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const profile = await this.fetchProfile(data.session.user.id);
          if (profile) {
            await auditService.logEvent({
              user: profile,
              action: 'logout',
              entityType: 'auth',
              details: 'خروج امن از حساب کاربری',
            });
          }
        }
      } catch (e) {
        console.warn('Logout audit event skipped:', e);
      }
      await supabase.auth.signOut();
    }
  },

  /**
   * Role Permission Check
   */
  hasPermission(user: User | null, requiredRole: UserRole): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager' && (requiredRole === 'manager' || requiredRole === 'agent')) return true;
    return user.role === requiredRole;
  },
};
