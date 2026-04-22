import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Globe } from 'lucide-react-native';
import { Language } from '../../shared/types';
import { theme } from '../theme';
import { useT } from '../i18n/useT';

interface Props {
  onSelect: (lang: Language) => void;
}

export default function LanguageOnboarding({ onSelect }: Props) {
  const t = useT();

  const langs: {
    id: Language;
    labelKey: 'onboarding.languages.ca' | 'onboarding.languages.es' | 'onboarding.languages.en';
  }[] = [
    { id: 'ca', labelKey: 'onboarding.languages.ca' },
    { id: 'es', labelKey: 'onboarding.languages.es' },
    { id: 'en', labelKey: 'onboarding.languages.en' },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          <Globe color="#fff" size={48} />
        </View>
        <Text style={styles.title}>{t('onboarding.welcome')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.selectLanguage')}</Text>
      </View>

      <View style={styles.buttons}>
        {langs.map((lang) => {
          const label = t(lang.labelKey);
          return (
            <Pressable
              key={lang.id}
              onPress={() => onSelect(lang.id)}
              accessibilityRole="button"
              accessibilityLabel={`Idioma ${label}`}
              style={({ pressed }) => [styles.langBtn, pressed && styles.langBtnPressed]}
            >
              <Text style={styles.langBtnText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.footer}>{t('onboarding.footer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.deepNight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: { alignItems: 'center', marginBottom: 64 },
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
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttons: { width: '100%', maxWidth: 320, gap: 16 },
  langBtn: {
    width: '100%',
    paddingVertical: 20,
    backgroundColor: theme.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  langBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  langBtnText: {
    color: theme.white,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    fontSize: 10,
    fontWeight: '700',
    color: theme.gray700,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
