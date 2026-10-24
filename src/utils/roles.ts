import type { UserRole } from '../types';

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Boss',
  GERANT: 'Gérant',
  CAISSIER: 'Vendeur',
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}
