import { useEffect } from 'react';
import { isFirebaseConfigured } from '../config/firebase';
import { subscribeToAuth } from '../services/firebase/auth';
import { useAppStore } from '../store/appStore';

/**
 * Sustituye al antiguo `useFirebaseBootstrap`: en vez de iniciar sesión anónima
 * automáticamente, escucha los cambios de Firebase Auth (`onAuthStateChanged`)
 * y los refleja en el store global.
 *
 * El usuario decide entrar con Google o como invitado desde la pantalla `Login`.
 * Si Firebase no está configurado, este hook es un no-op.
 */
export function useAuthSync(): void {
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const unsubscribe = subscribeToAuth((user) => {
      setUser(user);
      if (__DEV__ && user) {
        console.warn('[Auth] Sesión activa:', user.provider, user.uid);
      }
    });
    return unsubscribe;
  }, [setUser]);
}
