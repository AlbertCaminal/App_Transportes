import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseStorage } from '../../config/firebase';

async function localUriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

/**
 * Sube una foto local a `package-photos/{uid}/…` (Storage rules).
 * @returns URL de descarga o null si Storage no está disponible o falla.
 */
export async function uploadPackagePhotoForUser(userId: string, localUri: string): Promise<string | null> {
  const storage = getFirebaseStorage();
  if (!storage || !userId || !localUri.trim()) return null;
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.jpg`;
  const path = `package-photos/${userId}/${name}`;
  const storageRef = ref(storage, path);
  try {
    const blob = await localUriToBlob(localUri);
    await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/jpeg' });
    return await getDownloadURL(storageRef);
  } catch (e) {
    if (__DEV__) console.warn('[uploadPackagePhotoForUser]', e);
    return null;
  }
}
