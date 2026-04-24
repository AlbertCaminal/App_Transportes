import type { TranslationKey } from '../i18n';

/** Clave i18n bajo `login.firebaseErr.*` según código Firebase Auth. */
export function firebaseAuthCodeToTranslationKey(code: string | undefined): TranslationKey {
  switch (code) {
    case 'auth/invalid-email':
      return 'login.firebaseErr.invalidEmail';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'login.firebaseErr.wrongCredentials';
    case 'auth/email-already-in-use':
      return 'login.firebaseErr.emailInUse';
    case 'auth/weak-password':
      return 'login.firebaseErr.weakPassword';
    case 'auth/too-many-requests':
      return 'login.firebaseErr.tooManyRequests';
    case 'auth/network-request-failed':
      return 'login.firebaseErr.network';
    case 'auth/user-disabled':
      return 'login.firebaseErr.userDisabled';
    default:
      return 'login.firebaseErr.generic';
  }
}

export function readFirebaseAuthCode(err: unknown): string | undefined {
  return (err as { code?: string } | null)?.code;
}
