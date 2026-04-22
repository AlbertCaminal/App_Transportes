import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronLeft, LogIn } from 'lucide-react-native';
import { theme } from '../theme';
import { useT } from '../i18n/useT';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { signInAsGuest } from '../services/firebase/auth';
import { isFirebaseConfigured } from '../config/firebase';

interface Props {
  onBack: () => void;
  onLegalHelp: () => void;
}

/**
 * Pantalla de Login: ofrece "Continuar con Google" (Firebase Auth + OAuth) y
 * "Continuar como invitado" (sesión anónima de Firebase).
 *
 * El callback de éxito no se necesita aquí: cuando Firebase emite el cambio de
 * sesión, `useAuthSync` actualiza el store y `App.tsx` avanza a `profile`.
 */
export default function Login({ onBack, onLegalHelp }: Props) {
  const t = useT();
  const firebaseReady = isFirebaseConfigured();
  const {
    signIn: signInWithGoogle,
    loading: googleLoading,
    error: googleError,
    configured,
  } = useGoogleAuth();

  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  const loading = googleLoading || guestLoading;
  const errorMsg = googleError ?? guestError;
  const googleEnabled = firebaseReady && configured && !loading;
  const guestEnabled = firebaseReady && !loading;

  const onGuestPress = async () => {
    setGuestError(null);
    setGuestLoading(true);
    try {
      await signInAsGuest();
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
      >
        <ChevronLeft color={theme.white} size={24} />
      </Pressable>

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <LogIn color={theme.white} size={40} />
        </View>
        <Text style={styles.title}>{t('login.title')}</Text>
        <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

        <View style={styles.actions}>
          <Pressable
            onPress={signInWithGoogle}
            disabled={!googleEnabled}
            accessibilityRole="button"
            accessibilityLabel={t('login.googleButton')}
            accessibilityState={{ disabled: !googleEnabled, busy: googleLoading }}
            style={({ pressed }) => [
              styles.googleBtn,
              !googleEnabled && styles.btnDisabled,
              pressed && googleEnabled && styles.btnPressed,
            ]}
          >
            <View style={styles.googleMark} accessibilityElementsHidden importantForAccessibility="no">
              <Text style={styles.googleMarkText}>G</Text>
            </View>
            <Text style={styles.googleBtnText}>
              {googleLoading ? t('login.loading') : t('login.googleButton')}
            </Text>
            {googleLoading && <ActivityIndicator size="small" color={theme.deepNight} />}
          </Pressable>

          {!configured && <Text style={styles.notConfigured}>{t('login.notConfigured')}</Text>}

          <Pressable
            onPress={onGuestPress}
            disabled={!guestEnabled}
            accessibilityRole="button"
            accessibilityLabel={t('login.guestButton')}
            accessibilityState={{ disabled: !guestEnabled, busy: guestLoading }}
            style={({ pressed }) => [
              styles.guestBtn,
              !guestEnabled && styles.btnDisabled,
              pressed && guestEnabled && styles.btnPressed,
            ]}
          >
            <Text style={styles.guestBtnText}>
              {guestLoading ? t('login.loading') : t('login.guestButton')}
            </Text>
          </Pressable>

          {errorMsg && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {errorMsg}
            </Text>
          )}
        </View>

        <Pressable
          onPress={onLegalHelp}
          accessibilityRole="button"
          accessibilityLabel={t('login.privacyNote')}
          style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.legalLinkTxt}>{t('login.privacyNote')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.deepNight,
    paddingHorizontal: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 32,
    left: 24,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: theme.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: theme.electricBlue,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.white,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: theme.gray500,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    marginTop: 40,
    gap: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 16,
    backgroundColor: theme.white,
    borderRadius: 16,
  },
  googleBtnText: {
    color: theme.deepNight,
    fontWeight: '700',
    fontSize: 15,
  },
  googleMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleMarkText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  guestBtn: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: theme.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  guestBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 15,
  },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  btnDisabled: { opacity: 0.5 },
  notConfigured: {
    color: theme.gray500,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -6,
  },
  error: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  legalLink: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 8 },
  legalLinkTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.gray500,
    textDecorationLine: 'underline',
    textAlign: 'center',
    maxWidth: 320,
  },
});
