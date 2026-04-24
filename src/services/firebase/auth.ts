import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  reload,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  linkWithCredential,
  onAuthStateChanged,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { AuthUser } from '../../../shared/types';
import { getFirebaseAuth, getFirestoreDb } from '../../config/firebase';

function resolveAuthProvider(user: User): AuthUser['provider'] {
  if (user.isAnonymous) return 'anonymous';
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('password')) return 'email';
  return 'email';
}

/** Convierte un `User` de Firebase al subset que usa el store global. */
export function toAuthUser(user: User): AuthUser {
  const provider = resolveAuthProvider(user);
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

/**
 * Inicia sesión con correo y contraseña (proveedor Email/Password en Firebase Console).
 */
export async function signInWithEmailPassword(email: string, password: string): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth || !db) return null;

  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  await writeUserDoc(cred.user.uid, {
    provider: 'email',
    email: cred.user.email,
    displayName: cred.user.displayName,
    photoURL: cred.user.photoURL,
  });
  return toAuthUser(cred.user);
}

/**
 * Registra un usuario con correo y contraseña (flujo mínimo; preferir `registerWithEmailProfile` en UI).
 */
export async function registerWithEmailPassword(email: string, password: string): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth || !db) return null;

  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await writeUserDoc(cred.user.uid, {
    provider: 'email',
    email: cred.user.email,
    displayName: cred.user.displayName,
    photoURL: cred.user.photoURL,
  });
  return toAuthUser(cred.user);
}

/**
 * Alta con nombre visible, opcional teléfono de contacto (útil para envíos / transporte) y documento en Firestore.
 */
export async function registerWithEmailProfile(
  email: string,
  password: string,
  displayName: string,
  phone?: string
): Promise<AuthUser | null> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth || !db) return null;

  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const name = displayName.trim();
  if (name) {
    await updateProfile(cred.user, { displayName: name });
    await reload(cred.user);
  }

  const phoneTrim = phone?.trim();
  await writeUserDoc(cred.user.uid, {
    provider: 'email',
    email: cred.user.email,
    displayName: cred.user.displayName ?? name,
    photoURL: cred.user.photoURL,
    ...(phoneTrim ? { phone: phoneTrim } : {}),
  });
  return toAuthUser(cred.user);
}

/**
 * Cierra la sesión actual. No-op si Firebase no está configurado.
 *
 * Si la sesión es **anónima** (invitado), borra también el documento `users/{uid}` y el usuario en Auth,
 * para no acumular cuentas huérfanas en Firestore ni en Authentication.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      await deleteCurrentUserAccount();
    } catch (e) {
      if (__DEV__) console.warn('[signOutUser] limpieza invitado fallida, cerrando sesión:', e);
      await fbSignOut(auth);
    }
    return;
  }
  await fbSignOut(auth);
}

/** Actualiza el nombre visible en Auth y en el documento `users/{uid}` (si Firestore está activo). */
export async function updateAuthDisplayName(displayName: string): Promise<void> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth?.currentUser) throw new Error('auth/no-current-user');
  const u = auth.currentUser;
  const name = displayName.trim();
  await updateProfile(u, { displayName: name || undefined });
  await reload(u);
  if (db) {
    await setDoc(
      doc(db, 'users', u.uid),
      { displayName: name || null, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }
}

/**
 * Elimina el usuario actual en Firebase Auth y el documento `users/{uid}` en Firestore si existe.
 * Puede lanzar `auth/requires-recent-login` si la sesión es muy antigua (Google/email).
 */
export async function deleteCurrentUserAccount(): Promise<void> {
  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  if (!auth) throw new Error('auth/not-initialized');
  const current = auth.currentUser;
  if (!current) throw new Error('auth/no-current-user');

  const uid = current.uid;
  if (db) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      if (__DEV__) console.warn('[deleteAccount] Firestore deleteDoc:', e);
      /* doc inexistente o fallo puntual; seguimos borrando Auth */
    }
  }
  try {
    await deleteUser(current);
  } catch (e) {
    if (__DEV__) console.warn('[deleteAccount] deleteUser:', e);
    throw e;
  }
}

interface UserDocPatch {
  provider: 'google' | 'anonymous' | 'email';
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  /** Teléfono de contacto (opcional), p. ej. coordinación de entregas */
  phone?: string | null;
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
