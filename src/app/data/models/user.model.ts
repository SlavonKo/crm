import { UserRole } from '../enums/user-role.enum';

export interface User {
  /** Firebase UID */
  uid: string;
  displayName: string;
  /** Primary identifier for Phone Auth */
  phoneNumber: string;
  /** Email for 2FA whitelist auth */
  email?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
  /** Whether this user has completed 2FA setup (TOTP secret stored) */
  totpConfigured?: boolean;
}
