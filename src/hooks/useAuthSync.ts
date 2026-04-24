import { useEffect } from 'react';
import { getFirebaseAuth, isFirebaseConfigured } from '../config/firebase';
import { subscribeToAuth } from '../services/firebase/auth';
import { fetchUserSession } from '../services/firestore/userSession';
import { useAppStore } from '../store/appStore';

/**
 * Espera a que Zustand persist haya rehidratado `profile` / `boundUid` antes de la primera
 * emisión de Firebase, para que `setUser` restaure bien el paso (home vs perfil).
 */
function whenPersistReady(run: () => void): () => void {
  try {
    if (useAppStore.persist.hasHydrated()) {
      queueMicrotask(run);
      return () => undefined;
    }
    const unsub = useAppStore.persist.onFinishHydration(() => run());
    const t = setTimeout(() => {
      if (!useAppStore.persist.hasHydrated()) {
        if (__DEV__) console.warn('[Auth] persist no rehidrató a tiempo; continuando.');
      }
      run();
    }, 2500);
    return () => {
      clearTimeout(t);
      unsub();
    };
  } catch {
    queueMicrotask(run);
    return () => undefined;
  }
}

/**
 * Escucha Firebase Auth (`onAuthStateChanged`) y refleja el usuario en el store.
 * No inicia sesión anónima automáticamente: el usuario elige en `Login`.
 */
export function useAuthSync(): void {
  const setUser = useAppStore((s) => s.setUser);
  const setAuthInitialized = useAppStore((s) => s.setAuthInitialized);

  useEffect(() => {
    let unsubAuth: ReturnType<typeof subscribeToAuth> | undefined;
    let cancelled = false;
    let failSafeId: ReturnType<typeof setTimeout> | undefined;
    let finished = false;

    const finishInit = () => {
      if (cancelled || finished) return;
      finished = true;
      if (failSafeId !== undefined) clearTimeout(failSafeId);
      setAuthInitialized(true);
    };

    failSafeId = setTimeout(() => {
      if (__DEV__) console.warn('[Auth] tiempo de espera agotado; mostrando UI.');
      finishInit();
    }, 6000);

    const startSubscribe = () => {
      if (unsubAuth) return;

      if (!isFirebaseConfigured()) {
        finishInit();
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        if (__DEV__) console.warn('[Auth] Firebase parece configurado pero Auth no está disponible.');
        finishInit();
        return;
      }

      unsubAuth = subscribeToAuth((user) => {
        if (!user) {
          setUser(null);
          finishInit();
          return;
        }

        void (async () => {
          const uid = user.uid;
          const remote = await fetchUserSession(uid).catch(() => null);
          if (cancelled) return;
          const auth = getFirebaseAuth();
          if (!auth?.currentUser || auth.currentUser.uid !== uid) return;
          setUser(user, remote);
          finishInit();
          if (__DEV__) {
            console.warn('[Auth] Sesión activa:', user.provider, uid);
          }
        })();
      });
    };

    const cleanupPersist = whenPersistReady(startSubscribe);

    return () => {
      cancelled = true;
      if (failSafeId !== undefined) clearTimeout(failSafeId);
      cleanupPersist();
      unsubAuth?.();
    };
  }, [setUser, setAuthInitialized]);
}
