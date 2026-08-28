import { UserRole } from '../enums/user-role.enum';

export interface User {
  /** Firebase UID */
  uid: string;
  displayName: string;
  /** Primary identifier for Phone Auth */
  phoneNumber: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
}
