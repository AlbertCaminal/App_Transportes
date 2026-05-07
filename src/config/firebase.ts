import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

function trimEnv(v: string | undefined): string {
  return (v ?? '').trim();
}

function readFirebaseOptions(): FirebaseOptions | null {
  const o: Partial<FirebaseOptions> = {
    apiKey: trimEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    authDomain: trimEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: trimEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: trimEnv(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: trimEnv(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: trimEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  };
  if (!o.apiKey || !o.authDomain || !o.projectId || !o.storageBucket || !o.messagingSenderId || !o.appId) {
    return null;
  }
  return o as FirebaseOptions;
}

/** Credenciales del proyecto (Firebase Console → Configuración → Tus apps). Usa `.env.local` con EXPO_PUBLIC_*. */
export function isFirebaseConfigured(): boolean {
  return readFirebaseOptions() !== null;
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

export function getFirebaseApp(): FirebaseApp | undefined {
  const opts = readFirebaseOptions();
  if (!opts) return undefined;
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(opts);
  }
  return app;
}

export function getFirebaseAuth(): Auth | undefined {
  const a = getFirebaseApp();
  if (!a) return undefined;
  if (!auth) {
    auth = getAuth(a);
  }
  return auth;
}

export function getFirestoreDb(): Firestore | undefined {
  const a = getFirebaseApp();
  if (!a) return undefined;
  if (!db) {
    db = getFirestore(a);
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage | undefined {
  const a = getFirebaseApp();
  if (!a) return undefined;
  if (!storage) {
    storage = getStorage(a);
  }
  return storage;
}
