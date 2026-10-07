import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import CryptoJS from 'crypto-js';
import { User } from '../../data/models/user.model';
import { UserRole } from '../../data/enums/user-role.enum';
import { TotpService } from './totp.service';

// ─────────────────────────────────────────────────────────────────────────────
// Whitelist
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authorised email addresses with their display names.
 *
 * TODO: Move to environment variables / backend before production.
 *       To add a new user — append an entry here.
 */
export interface WhitelistEntry {
  displayName: string;
  uid: string;
}

const WHITELIST_EMAILS: Record<string, WhitelistEntry> = {
  'kozyrewjacheslav@gmail.com': { displayName: 'Ярослав К.', uid: 'user-uid-1' },
  // 'another@example.com': { displayName: 'Another User', uid: 'user-uid-2' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Static password (shared for all whitelist users for the prototype phase)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared CRM password (hashed with SHA-256 for storage).
 *
 * To change the password:
 *   1. Generate a new hash: CryptoJS.SHA256('newpassword').toString()
 *   2. Replace the value below.
 *
 * Current plain-text password: CRM_2024!
 */
const STATIC_PASSWORD_HASH = CryptoJS.SHA256('CRM_2024!').toString();

// ─────────────────────────────────────────────────────────────────────────────
// TOTP secrets storage key
// ─────────────────────────────────────────────────────────────────────────────

/** localStorage key prefix for per-user TOTP secrets. */
const TOTP_SECRET_PREFIX = 'crm_totp_';

/** sessionStorage key for the authenticated user session. */
const SESSION_KEY = 'crm_user';

/** Cookie name for remembering the last used email. */
const REMEMBERED_EMAIL_COOKIE = 'crm_email';

/** Days to keep the remembered-email cookie. */
const REMEMBERED_EMAIL_TTL_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────

/** Auth flow steps */
export type AuthStep = 'credentials' | 'totp' | 'setup-totp' | 'authenticated';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly #totp   = inject(TotpService);
  readonly #router = inject(Router);

  // ─── State ─────────────────────────────────────────────────────────────────

  readonly currentUser     = signal<User | null>(this.#loadSession());
  readonly isLoading       = signal(false);
  readonly authError       = signal<string | null>(null);

  /** Tracks which step of the 2FA flow the user is currently in. */
  readonly authStep        = signal<AuthStep>('credentials');

  /** Holds the partially-verified user (passed step 1) until TOTP is confirmed. */
  readonly #pendingUser    = signal<User | null>(null);

  /** Holds the newly-generated TOTP secret during first-time setup. */
  readonly pendingTotpSecret = signal<string | null>(null);

  // ─── Derived state ─────────────────────────────────────────────────────────

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin         = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly currentUid      = computed(() => this.currentUser()?.uid ?? null);

  // ─── Step 1: credentials ───────────────────────────────────────────────────

  /**
   * Validate email + password.
   * On success, advances to TOTP step (or TOTP-setup if first login).
   * Returns the next step name, or null on failure.
   */
  async validateCredentials(email: string, password: string): Promise<AuthStep | null> {
    this.authError.set(null);
    const normalised = email.trim().toLowerCase();
    const entry      = WHITELIST_EMAILS[normalised];

    if (!entry) {
      this.authError.set('Цей email не має доступу до CRM.');
      return null;
    }

    const inputHash = CryptoJS.SHA256(password).toString();
    if (inputHash !== STATIC_PASSWORD_HASH) {
      this.authError.set('Невірний пароль.');
      return null;
    }

    // Build the pending user object
    const user: User = {
      uid:            entry.uid,
      displayName:    entry.displayName,
      email:          normalised,
      phoneNumber:    '',
      role:           UserRole.ADMIN,
      totpConfigured: this.#hasTotpSecret(normalised),
      createdAt:      new Date(),
      lastLoginAt:    new Date(),
    };

    this.#pendingUser.set(user);
    this.#saveRememberedEmail(normalised);

    if (user.totpConfigured) {
      this.authStep.set('totp');
      return 'totp';
    } else {
      // First login — generate a secret and show QR-code
      const secret = this.#totp.generateSecret();
      this.pendingTotpSecret.set(secret);
      this.authStep.set('setup-totp');
      return 'setup-totp';
    }
  }

  // ─── Step 2a: first-time TOTP setup ────────────────────────────────────────

  /**
   * Called after the user scans the QR-code and enters their first code.
   * Saves the secret and completes sign-in.
   */
  async confirmTotpSetup(code: string): Promise<boolean> {
    const secret = this.pendingTotpSecret();
    const user   = this.#pendingUser();

    if (!secret || !user) {
      this.authError.set('Сесія застаріла. Поверніться до початку.');
      return false;
    }

    const valid = await this.#totp.verify(code, secret);
    if (!valid) {
      this.authError.set('Невірний код. Перевірте час на пристрої.');
      return false;
    }

    // Persist the secret and complete sign-in
    this.#saveTotpSecret(user.email!, secret);
    this.pendingTotpSecret.set(null);
    this.#completeSignIn({ ...user, totpConfigured: true });
    return true;
  }

  // ─── Step 2b: regular TOTP verification ────────────────────────────────────

  /** Verify a 6-digit TOTP code for the pending user. */
  async verifyTotp(code: string): Promise<boolean> {
    const user = this.#pendingUser();
    if (!user?.email) {
      this.authError.set('Сесія застаріла. Поверніться до початку.');
      return false;
    }

    const secret = this.#loadTotpSecret(user.email);
    if (!secret) {
      this.authError.set('TOTP не налаштовано. Зверніться до адміністратора.');
      return false;
    }

    const valid = await this.#totp.verify(code, secret);
    if (!valid) {
      this.authError.set('Невірний код. Спробуйте ще раз.');
      return false;
    }

    this.#completeSignIn(user);
    return true;
  }

  // ─── Sign out ───────────────────────────────────────────────────────────────

  signOut(): void {
    this.currentUser.set(null);
    this.#pendingUser.set(null);
    this.authStep.set('credentials');
    sessionStorage.removeItem(SESSION_KEY);
    this.#clearRememberedEmail();
    this.#router.navigateByUrl('/login');
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  #completeSignIn(user: User): void {
    this.currentUser.set(user);
    this.#pendingUser.set(null);
    this.authStep.set('authenticated');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  #loadSession(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      parsed.createdAt   = new Date(parsed.createdAt);
      parsed.lastLoginAt = new Date(parsed.lastLoginAt);
      return parsed as User;
    } catch {
      return null;
    }
  }

  // ─── TOTP secret storage ────────────────────────────────────────────────────

  /**
   * Secrets are stored in localStorage (device-specific, browser-persistent).
   * They are NOT sensitive by themselves — without the device they're useless —
   * but we encrypt them with a static app key as a lightweight protection layer.
   *
   * TODO: In production, store secrets server-side (Firebase / backend).
   */
  readonly #STORAGE_KEY = 'crm_totp_enc_v1';

  #saveTotpSecret(email: string, secret: string): void {
    const encrypted = CryptoJS.AES.encrypt(secret, this.#STORAGE_KEY).toString();
    localStorage.setItem(`${TOTP_SECRET_PREFIX}${email}`, encrypted);
  }

  #loadTotpSecret(email: string): string | null {
    const raw = localStorage.getItem(`${TOTP_SECRET_PREFIX}${email}`);
    if (!raw) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(raw, this.#STORAGE_KEY);
      return bytes.toString(CryptoJS.enc.Utf8) || null;
    } catch {
      return null;
    }
  }

  #hasTotpSecret(email: string): boolean {
    return !!localStorage.getItem(`${TOTP_SECRET_PREFIX}${email}`);
  }

  // ─── Remembered email (cookie) ──────────────────────────────────────────────

  /** Returns the email saved in the remember-me cookie, or null. */
  getRememberedEmail(): string | null {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${REMEMBERED_EMAIL_COOKIE}=`));
    return match ? decodeURIComponent(match.split('=')[1]) : null;
  }

  /** Saves the email in a persistent cookie (30 days, SameSite=Strict). */
  #saveRememberedEmail(email: string): void {
    const expires = new Date();
    expires.setDate(expires.getDate() + REMEMBERED_EMAIL_TTL_DAYS);
    document.cookie =
      `${REMEMBERED_EMAIL_COOKIE}=${encodeURIComponent(email)}` +
      `; expires=${expires.toUTCString()}` +
      `; path=/` +
      `; SameSite=Strict`;
  }

  /** Clears the remember-me cookie. */
  #clearRememberedEmail(): void {
    document.cookie =
      `${REMEMBERED_EMAIL_COOKIE}=` +
      `; expires=Thu, 01 Jan 1970 00:00:00 UTC` +
      `; path=/` +
      `; SameSite=Strict`;
  }
}
