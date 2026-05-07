/**
 * Cloud Functions (MVP) — alineado con `docs/ARCHITECTURE.md` sección 8.1
 *
 * 1) onShippingRequestCreate: al crear `requests/*` con `pending`, pasa a `searching_carrier`.
 * 2) claimShippingRequest: un transportista reclama (primer reclamador vence en la transacción).
 * 3) deleteShippingRequest: el cliente propietario elimina la solicitud (`requests/{id}` + `joiners`).
 * 4) releaseShippingRequest: el transportista asignado libera la solicitud (vuelve a `searching_carrier`).
 */
import * as admin from 'firebase-admin';
import type { CollectionReference } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1' });

/** Extrae mensaje y código numérico gRPC (p. ej. 7 PERMISSION_DENIED) de errores de Firestore/Admin. */
function firestoreErrorDetails(e: unknown): { text: string; grpcCode?: number } {
  if (e instanceof Error) {
    const m = e.message;
    const n = /^(\d+)\s/.exec(m);
    return { text: m, grpcCode: n ? Number(n[1]) : undefined };
  }
  if (typeof e === 'object' && e !== null) {
    const o = e as { code?: unknown; message?: unknown };
    const c = o.code;
    if (typeof c === 'number') {
      return { text: String(o.message ?? c), grpcCode: c };
    }
    return { text: String(o.message ?? e) };
  }
  return { text: String(e) };
}

export const onShippingRequestCreate = onDocumentCreated('requests/{requestId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (data?.status !== 'pending') {
    logger.warn('onShippingRequestCreate: status inesperado, se omite', {
      id: snap.id,
      status: data?.status,
    });
    return;
  }

  try {
    await snap.ref.update({
      status: 'searching_carrier',
      matchingStartedAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    logger.error('onShippingRequestCreate: fallo al actualizar', e);
    throw e;
  }
});

/** `invoker: 'public'` evita OPTIONS/POST 403 desde web: Cloud Run permite la petición; la auth sigue siendo `request.auth` en el handler. */
export const claimShippingRequest = onCall({ invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const requestId = request.data?.requestId;
  if (typeof requestId !== 'string' || !requestId.trim()) {
    throw new HttpsError('invalid-argument', 'Falta requestId.');
  }

  const uid = request.auth.uid;
  const userRef = admin.firestore().doc(`users/${uid}`);
  const u = (await userRef.get()).data();
  if (u?.['appMode'] !== 'carrier') {
    throw new HttpsError(
      'permission-denied',
      'Solo cuentas con modo transportista (appMode) pueden reclamar.'
    );
  }

  let authPhoto: string | null = null;
  let authDisplayName: string | null = null;
  try {
    const au = await admin.auth().getUser(uid);
    authPhoto = au.photoURL ?? null;
    authDisplayName = au.displayName ?? null;
  } catch (e) {
    logger.warn('claimShippingRequest: getUser', e);
  }

  const reqRef = admin.firestore().doc(`requests/${requestId.trim()}`);

  try {
    await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(reqRef);
      if (!doc.exists) {
        throw new HttpsError('not-found', 'Solicitud no encontrada.');
      }
      const d = doc.data() as Record<string, unknown>;
      if (d['status'] !== 'searching_carrier') {
        throw new HttpsError('failed-precondition', 'La solicitud no está en búsqueda.');
      }
      const existingCarrier = d['carrierId'];
      if (existingCarrier != null && String(existingCarrier).trim() !== '') {
        throw new HttpsError('failed-precondition', 'Ya hay transportista asignado.');
      }

      const userSnap = await tx.get(userRef);
      const udata = userSnap.data();
      const cp = udata?.carrierProfile as Record<string, unknown> | undefined;
      const vehicleRaw = cp?.vehicle as Record<string, unknown> | undefined;
      const nameFromProfile = typeof cp?.name === 'string' ? cp.name.trim() : '';
      const companyFromProfile = typeof cp?.company === 'string' ? cp.company.trim() : '';
      const brand = typeof vehicleRaw?.brand === 'string' ? vehicleRaw.brand.trim() : '';
      const model = typeof vehicleRaw?.model === 'string' ? vehicleRaw.model.trim() : '';
      const color = typeof vehicleRaw?.color === 'string' ? vehicleRaw.color.trim() : '';
      const licensePlateRaw =
        typeof vehicleRaw?.licensePlate === 'string' ? vehicleRaw.licensePlate.trim() : '';
      const licensePlate = licensePlateRaw.toUpperCase();

      const displayName = nameFromProfile || authDisplayName || 'Transportista';
      const company = companyFromProfile || '';

      tx.update(reqRef, {
        carrierId: uid,
        status: 'assigned',
        assignedAt: Timestamp.now(),
        assignedCarrier: {
          name: displayName,
          company,
          photoUrl: authPhoto,
          vehicle: { brand, model, color, licensePlate },
        },
      });
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const { text, grpcCode } = firestoreErrorDetails(e);
    const errStack = e instanceof Error ? e.stack : undefined;
    logger.error('claimShippingRequest: fallo no controlado', {
      message: text,
      grpcCode,
      stack: errStack,
      raw: e,
    });

    if (grpcCode === 7 || /PERMISSION_DENIED/i.test(text)) {
      throw new HttpsError(
        'permission-denied',
        'firestore-service-account: La cuenta de servicio de Cloud Functions no puede escribir en Firestore. En Google Cloud → IAM, añade el rol «Usuario de Cloud Datastore» (o «Editor de datos de Cloud Firestore») a la cuenta que ejecuta las Functions.'
      );
    }
    if (grpcCode === 10 || /ABORTED|could not commit transaction|failed to commit transaction/i.test(text)) {
      throw new HttpsError('aborted', 'concurrent-claim');
    }

    throw new HttpsError('internal', 'Error al asignar la solicitud.');
  }

  return { ok: true };
});

/**
 * Borra `requests/{requestId}` en nombre del cliente propietario (`clientId`).
 * Elimina antes los subdocs `joiners/*` para no dejar datos huérfanos.
 * El transportista deja de ver la solicitud porque el documento deja de existir.
 */
export const deleteShippingRequest = onCall({ invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const requestId = request.data?.requestId;
  if (typeof requestId !== 'string' || !requestId.trim()) {
    throw new HttpsError('invalid-argument', 'Falta requestId.');
  }

  const uid = request.auth.uid;
  const reqRef = admin.firestore().doc(`requests/${requestId.trim()}`);

  const snap = await reqRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Solicitud no encontrada.');
  }
  const d = snap.data() as Record<string, unknown>;
  if (String(d['clientId'] ?? '') !== uid) {
    throw new HttpsError('permission-denied', 'No eres el propietario de esta solicitud.');
  }

  const deleteCollectionInBatches = async (col: CollectionReference, batchSize: number): Promise<void> => {
    const qs = await col.limit(batchSize).get();
    if (qs.empty) return;
    const b = admin.firestore().batch();
    for (const doc of qs.docs) {
      b.delete(doc.ref);
    }
    await b.commit();
    await deleteCollectionInBatches(col, batchSize);
  };

  try {
    await deleteCollectionInBatches(reqRef.collection('joiners'), 50);
    await reqRef.delete();
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const { text, grpcCode } = firestoreErrorDetails(e);
    logger.error('deleteShippingRequest: fallo al borrar', { message: text, grpcCode, raw: e });
    if (grpcCode === 7 || /PERMISSION_DENIED/i.test(text)) {
      throw new HttpsError(
        'permission-denied',
        'firestore-service-account: La cuenta de servicio de Cloud Functions no puede escribir en Firestore.'
      );
    }
    throw new HttpsError('internal', 'No se pudo eliminar la solicitud.');
  }

  return { ok: true };
});

/**
 * El transportista asignado deja la ruta: estado `searching_carrier`, sin `carrierId` ni datos de asignación.
 * El envío vuelve al tablón para otro transportista; el cliente ve de nuevo la búsqueda.
 */
export const releaseShippingRequest = onCall({ invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const requestId = request.data?.requestId;
  if (typeof requestId !== 'string' || !requestId.trim()) {
    throw new HttpsError('invalid-argument', 'Falta requestId.');
  }

  const uid = request.auth.uid;
  const userRef = admin.firestore().doc(`users/${uid}`);
  const u = (await userRef.get()).data();
  if (u?.['appMode'] !== 'carrier') {
    throw new HttpsError('permission-denied', 'Solo transportistas pueden liberar una ruta asignada.');
  }

  const reqRef = admin.firestore().doc(`requests/${requestId.trim()}`);

  try {
    await admin.firestore().runTransaction(async (tx) => {
      const doc = await tx.get(reqRef);
      if (!doc.exists) {
        throw new HttpsError('not-found', 'Solicitud no encontrada.');
      }
      const d = doc.data() as Record<string, unknown>;
      if (d['status'] !== 'assigned') {
        throw new HttpsError('failed-precondition', 'La solicitud no está asignada.');
      }
      if (String(d['carrierId'] ?? '') !== uid) {
        throw new HttpsError('permission-denied', 'No eres el transportista asignado.');
      }

      tx.update(reqRef, {
        status: 'searching_carrier',
        carrierId: FieldValue.delete(),
        assignedCarrier: FieldValue.delete(),
        assignedAt: FieldValue.delete(),
        carrierLocation: FieldValue.delete(),
        carrierLocationUpdatedAt: FieldValue.delete(),
        matchingStartedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    const { text, grpcCode } = firestoreErrorDetails(e);
    logger.error('releaseShippingRequest: fallo', { message: text, grpcCode, raw: e });
    if (grpcCode === 7 || /PERMISSION_DENIED/i.test(text)) {
      throw new HttpsError(
        'permission-denied',
        'firestore-service-account: La cuenta de servicio de Cloud Functions no puede escribir en Firestore.'
      );
    }
    if (grpcCode === 10 || /ABORTED|could not commit transaction|failed to commit transaction/i.test(text)) {
      throw new HttpsError('aborted', 'concurrent-release');
    }
    throw new HttpsError('internal', 'No se pudo liberar la solicitud.');
  }

  return { ok: true };
});

/**
 * El transportista asignado publica su posición GPS para que el cliente la vea en el mapa.
 * Escribe `carrierLocation` como GeoPoint + `carrierLocationUpdatedAt`.
 */
export const updateCarrierLocation = onCall({ invoker: 'public' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
  }

  const requestId = request.data?.requestId;
  const lng = Number(request.data?.lng);
  const lat = Number(request.data?.lat);
  if (typeof requestId !== 'string' || !requestId.trim()) {
    throw new HttpsError('invalid-argument', 'Falta requestId.');
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new HttpsError('invalid-argument', 'lng/lat inválidos.');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpsError('invalid-argument', 'Coordenadas fuera de rango.');
  }

  const uid = request.auth.uid;
  const reqRef = admin.firestore().doc(`requests/${requestId.trim()}`);
  const snap = await reqRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Solicitud no encontrada.');
  }
  const d = snap.data() as Record<string, unknown>;
  if (String(d['carrierId'] ?? '') !== uid) {
    throw new HttpsError('permission-denied', 'No eres el transportista asignado.');
  }
  if (d['status'] !== 'assigned') {
    throw new HttpsError('failed-precondition', 'La solicitud no está asignada.');
  }

  await reqRef.update({
    carrierLocation: new admin.firestore.GeoPoint(lat, lng),
    carrierLocationUpdatedAt: Timestamp.now(),
  });

  return { ok: true };
});
