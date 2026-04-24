import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronLeft, LogIn } from 'lucide-react-native';
import { theme } from '../theme';
import { useT } from '../i18n/useT';
import {
  GOOGLE_AUTH_STUB,
  shouldMountGoogleIdTokenRequest,
  useGoogleAuthImpl,
  type GoogleAuthState,
} from '../hooks/useGoogleAuth';
import { signInAsGuest, signInWithEmailPassword } from '../services/firebase/auth';
import { isFirebaseConfigured } from '../config/firebase';
import { firebaseAuthCodeToTranslationKey, readFirebaseAuthCode } from '../utils/firebaseAuthErrors';

interface Props {
  onBack: () => void;
  onLegalHelp: () => void;
  onGoToRegister: () => void;
}

/**
 * Pantalla de Login: correo/contraseña, Google (OAuth) e invitado (anónimo).
 * Habilitar "Correo/contraseña" en Firebase Console → Authentication → Sign-in method.
 */
export default function Login(props: Props) {
  if (!shouldMountGoogleIdTokenRequest()) {
    return <LoginBody {...props} googleAuth={GOOGLE_AUTH_STUB} />;
  }
  return <LoginWithGoogleOAuth {...props} />;
}

function LoginWithGoogleOAuth(props: Props) {
  const googleAuth = useGoogleAuthImpl();
  return <LoginBody {...props} googleAuth={googleAuth} />;
}

interface LoginBodyProps extends Props {
  googleAuth: GoogleAuthState;
}

function LoginBody({ onBack, onLegalHelp, onGoToRegister, googleAuth }: LoginBodyProps) {
  const t = useT();
  const firebaseReady = isFirebaseConfigured();
  const { signIn: signInWithGoogle, loading: googleLoading, error: googleError, configured } = googleAuth;

  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);

  const loading = googleLoading || guestLoading || emailLoading;
  const errorMsg = googleError ?? guestError ?? emailFieldError;
  const googleEnabled = firebaseReady && configured && !loading;
  const guestEnabled = firebaseReady && !loading;
  const emailEnabled = firebaseReady && !loading;

  const onGuestPress = async () => {
    setGuestError(null);
    setEmailFieldError(null);
    setGuestLoading(true);
    try {
      await signInAsGuest();
    } catch (err) {
      setGuestError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setGuestLoading(false);
    }
  };

  const onEmailSubmit = useCallback(async () => {
    setEmailFieldError(null);
    setGuestError(null);
    const em = emailInput.trim();
    if (!em || !passwordInput) {
      setEmailFieldError(t('login.email.validationEmpty'));
      return;
    }
    setEmailLoading(true);
    try {
      await signInWithEmailPassword(em, passwordInput);
    } catch (err) {
      const code = readFirebaseAuthCode(err);
      setEmailFieldError(t(firebaseAuthCodeToTranslationKey(code)));
    } finally {
      setEmailLoading(false);
    }
  }, [emailInput, passwordInput, t]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.root}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
        >
          <ChevronLeft color={theme.white} size={24} />
        </Pressable>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.center}>
            <View style={styles.logoWrap}>
              <LogIn color={theme.white} size={40} />
            </View>
            <Text style={styles.title}>{t('login.title')}</Text>
            <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

            <View style={styles.actions}>
              <TextInput
                value={emailInput}
                onChangeText={(v) => {
                  setEmailInput(v);
                  setEmailFieldError(null);
                }}
                placeholder={t('login.email.placeholderEmail')}
                placeholderTextColor={theme.gray800}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={emailEnabled}
                style={styles.input}
              />
              <TextInput
                value={passwordInput}
                onChangeText={(v) => {
                  setPasswordInput(v);
                  setEmailFieldError(null);
                }}
                placeholder={t('login.email.placeholderPassword')}
                placeholderTextColor={theme.gray800}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                editable={emailEnabled}
                style={styles.input}
              />

              <Pressable
                onPress={onEmailSubmit}
                disabled={!emailEnabled}
                accessibilityRole="button"
                accessibilityLabel={t('login.email.signIn')}
                accessibilityState={{ disabled: !emailEnabled, busy: emailLoading }}
                style={({ pressed }) => [
                  styles.emailPrimaryBtn,
                  !emailEnabled && styles.btnDisabled,
                  pressed && emailEnabled && styles.btnPressed,
                ]}
              >
                <Text style={styles.emailPrimaryTxt}>
                  {emailLoading ? t('login.loading') : t('login.email.signIn')}
                </Text>
                {emailLoading && <ActivityIndicator size="small" color={theme.white} />}
              </Pressable>

              <Pressable onPress={onGoToRegister} accessibilityRole="button" style={styles.linkRow}>
                <Text style={styles.linkTxt}>{t('login.email.linkRegister')}</Text>
              </Pressable>

              <Text style={styles.dividerTxt}>{t('login.email.orDivider')}</Text>

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
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: theme.deepNight,
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    paddingTop: 88,
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
  center: { alignItems: 'center' },
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
    marginTop: 28,
    gap: 14,
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: theme.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: '600',
    color: theme.white,
  },
  emailPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 16,
    backgroundColor: theme.electricBlue,
    borderRadius: 16,
  },
  emailPrimaryTxt: {
    color: theme.white,
    fontWeight: '800',
    fontSize: 15,
  },
  linkRow: { paddingVertical: 4, alignSelf: 'center' },
  linkTxt: {
    color: theme.electricBlue,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  dividerTxt: {
    color: theme.gray600,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 2,
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
  legalLink: { marginTop: 28, paddingVertical: 12, paddingHorizontal: 8 },
  legalLinkTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.gray500,
    textDecorationLine: 'underline',
    textAlign: 'center',
    maxWidth: 320,
  },
});
