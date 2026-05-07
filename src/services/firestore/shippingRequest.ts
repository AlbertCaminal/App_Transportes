import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { ShippingRequestClientPayload } from '../../../shared/types';
import { getFirestoreDb } from '../../config/firebase';

/**
 * Crea un documento en `requests`. Requiere usuario autenticado no anónimo (reglas Firestore + flujo en ClientHome).
 * @returns id del documento o `null` si no hay Firestore o falla la escritura.
 */
export async function createShippingRequest(
  clientId: string,
  payload: ShippingRequestClientPayload
): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db || !clientId) return null;
  try {
    const docRef = await addDoc(collection(db, 'requests'), {
      ...payload,
      clientId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (e) {
    if (__DEV__) console.warn('[createShippingRequest]', e);
    return null;
  }
}
