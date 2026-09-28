/**
 * Security and Cryptographic Utilities
 * Provides password hashing using SHA-256 + Salt via Web Crypto API,
 * random token generation for invitations, and field masking for privacy enforcement.
 */

// Generate a cryptographic random salt hex string
export function generateSalt(byteLength: number = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(byteLength);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Compute SHA-256 hash using Web Crypto API
export async function sha256Hex(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Basic deterministic fallback for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// Hash password with salt - NEVER store plaintext passwords
export async function hashPassword(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || generateSalt(16);
  const saltedPassword = `${salt}::amlk::${password}`;
  const hash = await sha256Hex(saltedPassword);
  return { hash, salt };
}

// Verify password against stored hash & salt
export async function verifyPassword(
  passwordAttempt: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  const { hash } = await hashPassword(passwordAttempt, storedSalt);
  return hash === storedHash;
}

// Generate secure invitation token
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'inv_';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Confidential data masking helpers (Enforces Manager Privacy Rules)
export function maskPhoneNumber(phone: string): string {
  if (!phone) return 'شماره نامشخص';
  // Keep first 4 and last 2 characters, mask middle
  const clean = phone.trim();
  if (clean.length < 7) return '۰۹۱۲***۰۰۰۰';
  return clean.slice(0, 4) + '***' + clean.slice(-2);
}

export function maskPersonName(name: string, agentName?: string): string {
  if (agentName) {
    return `مشتری محرمانه (${agentName})`;
  }
  return 'مشتری محرمانه مشاور';
}

export function maskOwnerName(name: string): string {
  return '[اطلاعات محرمانه مالک]';
}

export function maskAddress(address?: string): string {
  return '[آدرس دقیق ملک فقط در اختیار مشاور مسئول است]';
}

export function maskPrivateNotes(): string {
  return '[یادداشت خصوصی و محرمانه مشاور — غیرقابل دسترسی مدیریت]';
}
