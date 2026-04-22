import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithCredential,
  signOut as fbSignOut,
  linkWithCredential,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AuthUser } from '../../../shared/types';
import { getFirebaseAuth, getFirestoreDb } from '../../config/firebase';

/** Convierte un `User` de Firebase al subset que usa el store global. */
export function toAuthUser(user: User): AuthUser {
  // Hoy solo soportamos Google y anónimo. Si en el futuro hay más providers
  // (Apple, email/password), se amplía AuthProvider y este mapeo.
  const provider: AuthUser['provider'] = user.isAnonymous ? 'anonymous' : 'google';
  return {
    uid: user.uid,
    provider,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

/**
 * Suscribe a cambios de sesión Firebase. Devuelve función para cancelar.
 * Si Firebase no está configurado, no hace nada y devuelve un noop.
 */
export function subscribeToAuth(cb: (user: AuthUser | null) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, (user) => cb(user ? toAuthUser(user) : null));
}

/**
 * Inicia sesión anónima (modo invitado) y crea/actualiza `users/{uid}`.
 * Idempotente: si ya hay sesión, devuelve el usuario actual.
 */
export async function signInAsGuest(): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth || !db) return null;

  const current = auth.currentUser;
  if (current && current.isAnonymous) {
    return toAuthUser(current);
  }

  const cred = await signInAnonymously(auth);
  await writeUserDoc(cred.user.uid, { provider: 'anonymous' });
  return toAuthUser(cred.user);
}

/**
 * Cambia la sesión a Google a partir de un `idToken` obtenido por OAuth.
 * Si la sesión actual era anónima, intenta `linkWithCredential` para preservar `uid`;
 * si Google ya está vinculado a otra cuenta, cae a `signInWithCredential`.
 */
export async function signInWithGoogleIdToken(
  idToken: string,
  accessToken?: string
): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth || !db) return null;

  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const current = auth.currentUser;

  if (current && current.isAnonymous) {
    try {
      const linked = await linkWithCredential(current, credential);
      await writeUserDoc(linked.user.uid, {
        provider: 'google',
        email: linked.user.email,
        displayName: linked.user.displayName,
        photoURL: linked.user.photoURL,
      });
      return toAuthUser(linked.user);
    } catch (err) {
      // Si la credencial ya está en uso por otra cuenta Firebase, hacemos sign-in normal
      // (perdemos el uid anónimo, pero el usuario entra con su cuenta real).
      const code = (err as { code?: string } | null)?.code;
      if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') {
        throw err;
      }
    }
  }

  const cred = await signInWithCredential(auth, credential);
  await writeUserDoc(cred.user.uid, {
    provider: 'google',
    email: cred.user.email,
    displayName: cred.user.displayName,
    photoURL: cred.user.photoURL,
  });
  return toAuthUser(cred.user);
}

/** Cierra la sesión actual. No-op si Firebase no está configurado. */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await fbSignOut(auth);
}

interface UserDocPatch {
  provider: 'google' | 'anonymous';
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

async function writeUserDoc(uid: string, patch: UserDocPatch): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;
  await setDoc(
    doc(db, 'users', uid),
    {
      ...patch,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
