import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../../config/firebase';
import type { TranslationKey } from '../../i18n';

/** Misma región que `functions/src/index.ts` (`setGlobalOptions`). */
export const CLOUD_FUNCTIONS_REGION = 'europe-west1';

function getFunctionsForRegion() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFunctions(app, CLOUD_FUNCTIONS_REGION);
}

/**
 * Transportista reclama una solicitud en `searching_carrier` (Cloud Function `claimShippingRequest`).
 * Requiere `users/{uid}.appMode === 'carrier'` en Firestore.
 */
export async function claimShippingRequestCallable(requestId: string): Promise<{ ok?: boolean }> {
  const fns = getFunctionsForRegion();
  if (!fns) throw new Error('firebase/not-initialized');
  const fn = httpsCallable(fns, 'claimShippingRequest');
  const res = await fn({ requestId });
  return res.data as { ok?: boolean };
}

/** Cliente propietario elimina `requests/{id}` (`deleteShippingRequest`). */
export async function deleteShippingRequestCallable(requestId: string): Promise<{ ok?: boolean }> {
  const fns = getFunctionsForRegion();
  if (!fns) throw new Error('firebase/not-initialized');
  const fn = httpsCallable(fns, 'deleteShippingRequest');
  const res = await fn({ requestId });
  return res.data as { ok?: boolean };
}

/** Transportista asignado libera el envío (`releaseShippingRequest`). */
export async function releaseShippingRequestCallable(requestId: string): Promise<{ ok?: boolean }> {
  const fns = getFunctionsForRegion();
  if (!fns) throw new Error('firebase/not-initialized');
  const fn = httpsCallable(fns, 'releaseShippingRequest');
  const res = await fn({ requestId });
  return res.data as { ok?: boolean };
}

/** Mensajes localizados para errores de `deleteShippingRequestCallable`. */
export function messageForDeleteShippingRequestError(
  e: unknown,
  tr: (key: TranslationKey, options?: Record<string, unknown>) => string
): string {
  const o = e as { code?: string; message?: string };
  const code = (o.code ?? '').toLowerCase();
  const msg = (o.message ?? '').toLowerCase();
  if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
    return tr('clientHome.cancelMissionErrSignedOut');
  }
  if (code === 'functions/permission-denied' || /permission-denied/i.test(msg)) {
    if (/firestore-service-account/i.test(o.message ?? '')) {
      return tr('carrierOpen.claimErrFirestoreIam');
    }
    return tr('clientHome.cancelMissionErrPermission');
  }
  if (code === 'functions/not-found') {
    return tr('clientHome.cancelMissionErrGone');
  }
  if (e instanceof Error && e.message === 'firebase/not-initialized') {
    return tr('clientHome.cancelMissionErrNotConfigured');
  }
  if (code === 'functions/internal' || /^internal$/i.test((o.message ?? '').trim())) {
    return tr('clientHome.cancelMissionErrGeneric');
  }
  if (
    code.includes('network') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded'
  ) {
    return tr('clientHome.cancelMissionErrNetwork');
  }
  if (
    typeof o.message === 'string' &&
    o.message.length > 12 &&
    __DEV__ &&
    !/^(internal|unknown error)$/i.test(o.message.trim())
  ) {
    return o.message;
  }
  return tr('clientHome.cancelMissionErrGeneric');
}

/** Mensajes localizados para errores de `releaseShippingRequestCallable`. */
export function messageForReleaseShippingRequestError(
  e: unknown,
  tr: (key: TranslationKey, options?: Record<string, unknown>) => string
): string {
  const o = e as { code?: string; message?: string };
  const code = (o.code ?? '').toLowerCase();
  const msg = (o.message ?? '').toLowerCase();
  if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
    return tr('carrierOpen.releaseRouteErrSignedOut');
  }
  if (code === 'functions/permission-denied' || /permission-denied/i.test(msg)) {
    if (/firestore-service-account/i.test(o.message ?? '')) {
      return tr('carrierOpen.claimErrFirestoreIam');
    }
    return tr('carrierOpen.releaseRouteErrPermission');
  }
  if (code === 'functions/not-found') {
    return tr('carrierOpen.releaseRouteErrGone');
  }
  if (
    code === 'functions/failed-precondition' ||
    /failed-precondition/i.test(msg) ||
    code === 'functions/aborted' ||
    /concurrent-release/i.test(msg)
  ) {
    return tr('carrierOpen.releaseRouteErrState');
  }
  if (e instanceof Error && e.message === 'firebase/not-initialized') {
    return tr('carrierOpen.releaseRouteErrNotConfigured');
  }
  if (code === 'functions/internal' || /^internal$/i.test((o.message ?? '').trim())) {
    return tr('carrierOpen.releaseRouteErrGeneric');
  }
  if (
    code.includes('network') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded'
  ) {
    return tr('carrierOpen.releaseRouteErrNetwork');
  }
  if (
    typeof o.message === 'string' &&
    o.message.length > 12 &&
    __DEV__ &&
    !/^(internal|unknown error)$/i.test(o.message.trim())
  ) {
    return o.message;
  }
  return tr('carrierOpen.releaseRouteErrGeneric');
}
