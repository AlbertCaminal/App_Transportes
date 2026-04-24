import type { AuthUser } from '../../shared/types';

/** Invitado anónimo: las acciones “serias” exigen cuenta registrada (Google, correo o similar), no modo invitado. */
export function requiresGoogleSignIn(user: AuthUser | null): boolean {
  return user?.isAnonymous === true;
}
