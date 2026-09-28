import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable extraction with fallbacks (safe in both Vite and Node.js test runners)
const getRawEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  const globalObj = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
  if (globalObj?.process?.env?.[key]) {
    return globalObj.process.env[key];
  }
  if (typeof window !== 'undefined' && (window as any).__ENV__?.[key]) {
    return (window as any).__ENV__[key];
  }
  return '';
};

/**
 * Detects whether a secret key (sb_secret_...) or publishable key was inadvertently
 * configured in place of the Supabase project HTTP URL.
 */
export function isSecretKeyMistakenForUrl(val?: string | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  return trimmed.startsWith('sb_secret_') || (trimmed.startsWith('sb_publishable_') && !trimmed.includes('://'));
}

/**
 * Returns the currently active and resolved Supabase URL.
 * Prefers explicitly configured custom URL from local storage if valid, then environment.
 */
export function getResolvedSupabaseUrl(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('amlakino_supabase_url');
    if (saved && saved.startsWith('https://')) return saved.trim();
  }
  const envUrl = getRawEnv('VITE_SUPABASE_URL');
  if (envUrl && envUrl.startsWith('https://')) {
    return envUrl.trim();
  }
  return '';
}

/**
 * Returns the currently active and resolved Supabase Anon / Publishable Key.
 */
export function getResolvedSupabaseKey(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('amlakino_supabase_publishable_key');
    if (saved && saved.length > 20) return saved.trim();
  }
  const envKey = getRawEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getRawEnv('VITE_SUPABASE_ANON_KEY');
  if (envKey && envKey.length > 20 && !envKey.startsWith('sb_secret_')) {
    return envKey.trim();
  }
  return '';
}

/**
 * Inspects whether a valid, authentic Supabase URL and Publishable Key are configured.
 */
export function isSupabaseConfigured(): boolean {
  const url = getResolvedSupabaseUrl();
  const key = getResolvedSupabaseKey();
  return Boolean(
    url &&
    key &&
    url !== 'https://your-project.supabase.co' &&
    url !== 'https://placeholder.supabase.co' &&
    url.startsWith('https://') &&
    key.length > 20
  );
}

/**
 * Checks if the system environment contains raw Supabase keys that need URL correction.
 */
export function getRawEnvStatus(): {
  hasEnvUrl: boolean;
  hasEnvKey: boolean;
  isEnvUrlSecretKey: boolean;
  envKeyPreview: string;
} {
  const rawUrl = getRawEnv('VITE_SUPABASE_URL');
  const rawKey = getRawEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || getRawEnv('VITE_SUPABASE_ANON_KEY');
  return {
    hasEnvUrl: Boolean(rawUrl && rawUrl.startsWith('https://')),
    hasEnvKey: Boolean(rawKey && rawKey.length > 20),
    isEnvUrlSecretKey: isSecretKeyMistakenForUrl(rawUrl),
    envKeyPreview: rawKey ? `${rawKey.slice(0, 16)}...` : '',
  };
}

/**
 * Factory for creating the standard Supabase client instance.
 */
function createClientInstance(): SupabaseClient {
  const url = getResolvedSupabaseUrl();
  const key = getResolvedSupabaseKey();

  return createClient(
    url || 'https://placeholder.supabase.co',
    key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'amlakino_sb_auth_v1',
      },
      global: {
        headers: {
          'x-application-name': 'amlakino-crm',
        },
      },
    }
  );
}

let activeClient = createClientInstance();

/**
 * Re-initializes client with newly saved credentials without requiring hard page refresh.
 */
export function reloadSupabaseClient(): SupabaseClient {
  activeClient = createClientInstance();
  return activeClient;
}

/**
 * Transparent proxy for the active Supabase Client instance.
 * Ensures queries always dispatch to the dynamically configured client.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (activeClient as any)[prop];
  },
});

/**
 * Persists user-provided Supabase connection credentials and activates the live client.
 */
export function saveSupabaseConfig(url: string, key: string): { success: boolean; message: string } {
  let cleanUrl = (url || '').trim();
  const cleanKey = (key || '').trim();

  // If user inputs project ref like "abcdefg" or "abcdefg.supabase.co"
  if (cleanUrl && !cleanUrl.includes('://')) {
    if (cleanUrl.endsWith('.supabase.co')) {
      cleanUrl = `https://${cleanUrl}`;
    } else if (/^[a-z0-9_-]{10,}$/i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}.supabase.co`;
    }
  }

  if (isSecretKeyMistakenForUrl(cleanUrl)) {
    return {
      success: false,
      message: 'کلید Secret به اشتباه به عنوان آدرس وارد شده است. آدرس پروژه را به صورت https://<project-ref>.supabase.co وارد فرمایید.',
    };
  }

  if (!cleanUrl.startsWith('https://')) {
    return {
      success: false,
      message: 'آدرس پروژه Supabase باید با https:// آغاز شود (مانند https://your-project.supabase.co).',
    };
  }

  if (!cleanKey || cleanKey.length < 20) {
    return {
      success: false,
      message: 'کلید دسترسی معتبر (Publishable Key یا Anon Key) الزامی است.',
    };
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('amlakino_supabase_url', cleanUrl);
    window.localStorage.setItem('amlakino_supabase_publishable_key', cleanKey);
  }

  reloadSupabaseClient();
  return {
    success: true,
    message: 'تنظیمات اتصال Supabase با موفقیت ذخیره و کلاینت زنده فعال شد.',
  };
}

/**
 * Clears custom saved connection credentials and reverts to environment defaults.
 */
export function clearSavedSupabaseConfig(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('amlakino_supabase_url');
    window.localStorage.removeItem('amlakino_supabase_publishable_key');
  }
  reloadSupabaseClient();
}

/**
 * Performs a live connectivity check against the target Supabase instance.
 */
export async function testSupabaseConnection(
  urlToTest?: string,
  keyToTest?: string
): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const url = (urlToTest || getResolvedSupabaseUrl()).trim();
  const key = (keyToTest || getResolvedSupabaseKey()).trim();

  if (!url || !url.startsWith('https://')) {
    return {
      success: false,
      message: 'آدرس پروژه نامعتبر است. آدرس باید با https:// شروع شود.',
    };
  }
  if (!key || key.length < 20) {
    return {
      success: false,
      message: 'کلید دسترسی وارد نشده یا طول آن کمتر از حد مجاز است.',
    };
  }

  const start = performance.now();
  try {
    const testClient = createClient(url, key);
    // Ping public profiles or check API availability
    const { error } = await testClient.from('properties').select('id', { head: true, count: 'exact' });
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('fetch failed')) {
        return {
          success: false,
          message: `خطای اتصال شبکه به آدرس ${url}. لطفاً از صحت آدرس دامنه اطمینان حاصل فرمایید.`,
          latencyMs,
        };
      }
      // If error is 401 Unauthorized or invalid API key
      if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('apikey')) {
        return {
          success: false,
          message: `کلید دسترسی واردشده توسط سرور Supabase تایید نشد: ${error.message}`,
          latencyMs,
        };
      }
    }

    return {
      success: true,
      message: `اتصال به پایگاه‌داده ابری Supabase با موفقیت تایید شد (${latencyMs} میلی‌ثانیه).`,
      latencyMs,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `عدم برقراری ارتباط با سرور: ${err.message || 'خطای ناشناخته شبکه'}`,
    };
  }
}
