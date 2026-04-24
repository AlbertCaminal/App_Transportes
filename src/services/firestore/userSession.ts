import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { CarrierData, Language, UserProfile, UserSessionDoc } from '../../../shared/types';
import { getFirestoreDb } from '../../config/firebase';

function isLanguage(x: unknown): x is Language {
  return x === 'ca' || x === 'es' || x === 'en';
}

function isUserProfile(x: unknown): x is UserProfile {
  return x === 'client' || x === 'carrier';
}

function parseCarrierProfile(raw: unknown): CarrierData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name : '';
  const company = typeof o.company === 'string' ? o.company : '';
  const vehicle = o.vehicle;
  if (!vehicle || typeof vehicle !== 'object') return undefined;
  const v = vehicle as Record<string, unknown>;
  const model = typeof v.model === 'string' ? v.model : '';
  const volume = typeof v.volume === 'number' && Number.isFinite(v.volume) ? v.volume : 0;
  const maxDimensions = typeof v.maxDimensions === 'string' ? v.maxDimensions : '';
  if (!name.trim() || !company.trim() || !model.trim()) return undefined;
  return {
    name: name.trim(),
    company: company.trim(),
    vehicle: { model: model.trim(), volume, maxDimensions },
  };
}

/** Interpreta campos de sesión guardados en `users/{uid}` (merge con lo demás del documento). */
export function parseUserSessionFields(data: Record<string, unknown>): UserSessionDoc {
  const out: UserSessionDoc = {};
  if (isLanguage(data.appLang)) out.appLang = data.appLang;
  if (isUserProfile(data.appMode)) out.appMode = data.appMode;
  const carrier = parseCarrierProfile(data.carrierProfile);
  if (carrier) {
    out.carrierProfile = carrier;
    if (!out.appMode) out.appMode = 'carrier';
  }
  return out;
}

export async function fetchUserSession(uid: string): Promise<UserSessionDoc | null> {
  const db = getFirestoreDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const parsed = parseUserSessionFields(snap.data() as Record<string, unknown>);
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch (e) {
    if (__DEV__) console.warn('[fetchUserSession]', e);
    return null;
  }
}

/** Persiste preferencias de app en `users/{uid}` para restaurar modo/idioma en el siguiente inicio de sesión. */
export async function persistUserSessionFields(
  uid: string,
  patch: Partial<Pick<UserSessionDoc, 'appLang' | 'appMode' | 'carrierProfile'>>
): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !uid) return;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (patch.appLang !== undefined) payload.appLang = patch.appLang;
    if (patch.appMode !== undefined) payload.appMode = patch.appMode;
    if (patch.carrierProfile !== undefined) payload.carrierProfile = patch.carrierProfile;
    if (Object.keys(payload).length <= 1) return;
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
  } catch (e) {
    if (__DEV__) console.warn('[persistUserSessionFields]', e);
  }
}
