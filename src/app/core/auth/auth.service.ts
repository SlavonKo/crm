import { computed, Injectable, signal } from '@angular/core';
import { User } from '../../data/models/user.model';
import { UserRole } from '../../data/enums/user-role.enum';

/**
 * Whitelist of phone numbers authorised to access the CRM.
 * Format: E.164 without spaces.
 * TODO: Move to environment variables before production deployment.
 */
const ADMIN_PHONES: Record<string, { displayName: string; uid: string }> = {
  '+380675609143': { displayName: 'Адмін 1', uid: 'admin-uid-1' },
  '+380934072482': { displayName: 'Адмін 2', uid: 'admin-uid-2' },
};

const SESSION_KEY = 'crm_user';

/**
 * AuthService — whitelist-based auth for the mock/prototype phase.
 *
 * Flow: user enters phone → if in whitelist → logged in immediately.
 * Session is persisted in sessionStorage so page refresh keeps the user in.
 *
 * TODO: Replace with Firebase Phone Auth when backend is ready.
 * The public API (currentUser, isAuthenticated, signOut) is identical
 * to the planned Firebase version, so the switch will be transparent.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // ─── State ───────────────────────────────────────────────────────────────

  readonly currentUser = signal<User | null>(this.#loadSession());
  readonly isLoading   = signal(false);
  readonly authError   = signal<string | null>(null);

  // ─── Derived state ───────────────────────────────────────────────────────

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin         = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  readonly currentUid      = computed(() => this.currentUser()?.uid ?? null);

  // ─── Auth actions ────────────────────────────────────────────────────────

  /**
   * Attempt to log in with a phone number.
   * Returns true on success, false if the number is not in the whitelist.
   */
  login(rawPhone: string): boolean {
    this.authError.set(null);
    const phone = this.#normalise(rawPhone);
    const entry = ADMIN_PHONES[phone];

    if (!entry) {
      this.authError.set('Цей номер не має доступу до CRM.');
      return false;
    }

    const user: User = {
      uid:         entry.uid,
      displayName: entry.displayName,
      phoneNumber: phone,
      role:        UserRole.ADMIN,
      createdAt:   new Date(),
      lastLoginAt: new Date(),
    };

    this.currentUser.set(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return true;
  }

  signOut(): void {
    this.currentUser.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  /** Restore session from sessionStorage on app init */
  #loadSession(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Revive Date objects
      parsed.createdAt   = new Date(parsed.createdAt);
      parsed.lastLoginAt = new Date(parsed.lastLoginAt);
      return parsed as User;
    } catch {
      return null;
    }
  }

  /** Normalise phone to E.164: strip spaces/dashes, ensure leading + */
  #normalise(phone: string): string {
    let p = phone.replace(/[\s\-\(\)]/g, '');
    if (!p.startsWith('+')) p = '+' + p;
    return p;
  }
}
