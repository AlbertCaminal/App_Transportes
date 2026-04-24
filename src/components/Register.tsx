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
import { ChevronLeft, UserPlus, Check } from 'lucide-react-native';
import { theme } from '../theme';
import { useT } from '../i18n/useT';
import { registerWithEmailProfile } from '../services/firebase/auth';
import { isFirebaseConfigured } from '../config/firebase';
import { firebaseAuthCodeToTranslationKey, readFirebaseAuthCode } from '../utils/firebaseAuthErrors';

const MIN_PASSWORD_LEN = 6;

type InvalidFields = {
  name: boolean;
  email: boolean;
  password: boolean;
  passwordConfirm: boolean;
  terms: boolean;
};

const NO_INVALID: InvalidFields = {
  name: false,
  email: false,
  password: false,
  passwordConfirm: false,
  terms: false,
};

interface Props {
  onBack: () => void;
  onLegalHelp: () => void;
}

export default function Register({ onBack, onLegalHelp }: Props) {
  const t = useT();
  const firebaseReady = isFirebaseConfigured();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<InvalidFields>(NO_INVALID);

  const submitEnabled = firebaseReady && !loading;

  const toggleTerms = useCallback(() => {
    setAcceptedTerms((v) => !v);
    setFieldError(null);
    setInvalid((prev) => ({ ...prev, terms: false }));
  }, []);

  const onSubmit = useCallback(async () => {
    setFieldError(null);
    setInvalid(NO_INVALID);

    const nameTrim = name.trim();
    const emailTrim = email.trim();

    const nextInvalid: InvalidFields = { ...NO_INVALID };
    let message: string | null = null;

    if (!nameTrim) {
      nextInvalid.name = true;
      message ??= t('register.validationName');
    }
    if (!emailTrim) {
      nextInvalid.email = true;
      message ??= t('login.email.validationEmpty');
    }
    if (!password) {
      nextInvalid.password = true;
      message ??= t('login.email.validationEmpty');
    }

    if (nextInvalid.name || nextInvalid.email || nextInvalid.password) {
      setInvalid(nextInvalid);
      setFieldError(message ?? t('login.email.validationEmpty'));
      return;
    }

    if (password.length < MIN_PASSWORD_LEN) {
      setInvalid({ ...NO_INVALID, password: true, passwordConfirm: true });
      setFieldError(t('register.validationPasswordShort'));
      return;
    }

    if (password !== passwordConfirm) {
      setInvalid({ ...NO_INVALID, password: true, passwordConfirm: true });
      setFieldError(t('register.validationPasswordMismatch'));
      return;
    }

    if (!acceptedTerms) {
      setInvalid({ ...NO_INVALID, terms: true });
      setFieldError(t('register.validationTerms'));
      return;
    }

    setLoading(true);
    try {
      await registerWithEmailProfile(emailTrim, password, nameTrim, phone.trim() || undefined);
    } catch (err) {
      const code = readFirebaseAuthCode(err);
      setFieldError(t(firebaseAuthCodeToTranslationKey(code)));
      const inv: InvalidFields = { ...NO_INVALID };
      switch (code) {
        case 'auth/invalid-email':
          inv.email = true;
          break;
        case 'auth/email-already-in-use':
          inv.email = true;
          break;
        case 'auth/weak-password':
          inv.password = true;
          inv.passwordConfirm = true;
          break;
        default:
          break;
      }
      setInvalid(inv);
    } finally {
      setLoading(false);
    }
  }, [acceptedTerms, email, name, password, passwordConfirm, phone, t]);

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
              <UserPlus color={theme.white} size={40} />
            </View>
            <Text style={styles.title}>{t('register.title')}</Text>
            <Text style={styles.subtitle}>{t('register.subtitle')}</Text>
            <Text style={styles.hint}>{t('register.roleHint')}</Text>

            <View style={styles.actions}>
              <TextInput
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  setFieldError(null);
                  setInvalid((prev) => ({ ...prev, name: false }));
                }}
                placeholder={t('register.placeholderName')}
                placeholderTextColor={theme.gray800}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="name"
                editable={firebaseReady && !loading}
                style={[styles.input, invalid.name && styles.inputError]}
              />
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setFieldError(null);
                  setInvalid((prev) => ({ ...prev, email: false }));
                }}
                placeholder={t('register.placeholderEmail')}
                placeholderTextColor={theme.gray800}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                editable={firebaseReady && !loading}
                style={[styles.input, invalid.email && styles.inputError]}
              />
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setFieldError(null);
                  setInvalid((prev) => ({ ...prev, password: false }));
                }}
                placeholder={t('register.placeholderPassword')}
                placeholderTextColor={theme.gray800}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                editable={firebaseReady && !loading}
                style={[styles.input, invalid.password && styles.inputError]}
              />
              <TextInput
                value={passwordConfirm}
                onChangeText={(v) => {
                  setPasswordConfirm(v);
                  setFieldError(null);
                  setInvalid((prev) => ({ ...prev, passwordConfirm: false }));
                }}
                placeholder={t('register.placeholderPasswordConfirm')}
                placeholderTextColor={theme.gray800}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
                editable={firebaseReady && !loading}
                style={[styles.input, invalid.passwordConfirm && styles.inputError]}
              />
              <Text style={styles.phoneHint}>{t('register.phoneHint')}</Text>
              <TextInput
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                }}
                placeholder={t('register.placeholderPhone')}
                placeholderTextColor={theme.gray800}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={firebaseReady && !loading}
                style={styles.input}
              />

              <View style={[styles.termsWrap, invalid.terms && styles.termsWrapError]}>
                <Pressable
                  onPress={toggleTerms}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                  hitSlop={8}
                  style={styles.termsCheckboxHit}
                >
                  <View
                    style={[
                      styles.checkbox,
                      acceptedTerms && styles.checkboxOn,
                      invalid.terms && !acceptedTerms && styles.checkboxError,
                    ]}
                  >
                    {acceptedTerms ? <Check color={theme.white} size={16} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
                <Text style={[styles.termsText, invalid.terms && styles.termsTextError]}>
                  {t('register.termsPartBefore')}
                  <Text
                    onPress={onLegalHelp}
                    style={[styles.termsPrivacyLink, invalid.terms && styles.termsPrivacyLinkOnError]}
                    accessibilityRole="link"
                    accessibilityLabel={t('register.termsPrivacyLink')}
                  >
                    {t('register.termsPrivacyLink')}
                  </Text>
                  {t('register.termsPartAfter')}
                </Text>
              </View>

              <Pressable
                onPress={onSubmit}
                disabled={!submitEnabled}
                accessibilityRole="button"
                accessibilityLabel={t('register.submit')}
                accessibilityState={{ disabled: !submitEnabled, busy: loading }}
                style={({ pressed }) => [
                  styles.cta,
                  !submitEnabled && styles.btnDisabled,
                  pressed && submitEnabled && styles.btnPressed,
                ]}
              >
                <Text style={styles.ctaTxt}>{loading ? t('login.loading') : t('register.submit')}</Text>
                {loading && <ActivityIndicator size="small" color={theme.white} />}
              </Pressable>

              {fieldError ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {fieldError}
                </Text>
              ) : null}

              <Pressable onPress={onBack} accessibilityRole="button" style={styles.loginLink}>
                <Text style={styles.loginLinkTxt}>{t('register.goToLogin')}</Text>
              </Pressable>
            </View>
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
    paddingBottom: 48,
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
    marginBottom: 24,
    shadowColor: theme.electricBlue,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.white,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: theme.gray500,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 8,
    maxWidth: 360,
  },
  hint: {
    marginTop: 14,
    color: theme.gray600,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 12,
    maxWidth: 360,
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    marginTop: 24,
    gap: 12,
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: theme.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: '600',
    color: theme.white,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  phoneHint: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.gray600,
    marginTop: 4,
    marginBottom: -4,
    paddingHorizontal: 4,
    lineHeight: 16,
  },
  termsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  termsWrapError: {
    borderColor: '#EF4444',
    borderWidth: 2,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  termsCheckboxHit: {
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.gray600,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: theme.electricBlue,
    backgroundColor: theme.electricBlue,
  },
  checkboxError: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: theme.gray500,
    fontWeight: '600',
  },
  termsTextError: {
    color: '#FCA5A5',
  },
  termsPrivacyLink: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    color: theme.electricBlue,
    textDecorationLine: 'underline',
  },
  termsPrivacyLinkOnError: {
    color: '#93C5FD',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: theme.electricBlue,
  },
  ctaTxt: {
    color: theme.white,
    fontWeight: '900',
    fontSize: 15,
  },
  btnPressed: { opacity: 0.92 },
  btnDisabled: { opacity: 0.45 },
  error: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  loginLink: {
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  loginLinkTxt: {
    color: theme.electricBlue,
    fontWeight: '800',
    fontSize: 14,
  },
});
