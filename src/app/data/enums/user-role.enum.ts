export enum UserRole {
  ADMIN      = 'admin',
  TECHNICIAN = 'technician',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]:      'Administrator',
  [UserRole.TECHNICIAN]: 'Technician',
};
