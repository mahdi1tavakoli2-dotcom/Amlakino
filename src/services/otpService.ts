import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  token_hash?: string;
  email?: string;
  userId?: string;
}

export const otpService = {
  /**
   * Request OTP code via Supabase Edge Function (Kavenegar backend).
   * Never calls Kavenegar or exposes SMS secrets in frontend client code.
   */
  async sendOtp(mobile: string): Promise<SendOtpResult> {
    if (!mobile || mobile.trim().length < 10) {
      throw new Error('شماره تلفن همراه وارد شده نامعتبر است.');
    }

    if (!isSupabaseConfigured()) {
      // Graceful local feedback when Supabase credentials are pending in user env
      console.info('[Amlakino OTP] Supabase not connected yet. Simulated SMS sent.');
      return {
        success: true,
        message: 'کد تایید آزمایشی ارسال شد (کد پیش‌فرض: 1234)',
        expiresInSeconds: 180,
      };
    }

    const { data, error } = await supabase.functions.invoke('send-otp', {
      body: { mobile: mobile.trim() },
    });

    if (error) {
      throw new Error(error.message || 'خطا در برقراری ارتباط با سرویس پیامک.');
    }

    return data;
  },

  /**
   * Verify OTP code via Supabase Edge Function.
   */
  async verifyOtp(mobile: string, code: string): Promise<VerifyOtpResult> {
    if (!code || code.trim().length < 4) {
      throw new Error('کد تایید باید حداقل ۴ رقم باشد.');
    }

    if (!isSupabaseConfigured()) {
      // In local mode if code is 1234
      if (code.trim() === '1234') {
        return {
          success: true,
          message: 'ورود آزمایشی با موفقیت انجام شد.',
        };
      }
      throw new Error('کد تایید وارد شده نادرست است.');
    }

    const { data, error } = await supabase.functions.invoke('verify-otp', {
      body: { mobile: mobile.trim(), code: code.trim() },
    });

    if (error) {
      throw new Error(error.message || 'کد تایید نادرست است.');
    }

    return data;
  },
};
