import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking, Alert, Platform } from 'react-native';
import { ChevronLeft, ExternalLink, Mail } from 'lucide-react-native';
import { Language } from '../../shared/types';
import { publicApp } from '../config/publicApp';
import { theme } from '../theme';

interface Props {
  lang: Language;
  onBack: () => void;
}

const copy = {
  ca: {
    title: 'Legal i ajuda',
    subtitle: 'Informació i contacte',
    privacy: 'Política de privacitat',
    website: 'Lloc web',
    support: 'Correu de suport',
    openError: "No s'ha pogut obrir l'enllaç.",
    webNote:
      'Al navegador, el correu pot obrir el client per defecte; si no, copia l’adreça de suport manualment.',
  },
  es: {
    title: 'Legal y ayuda',
    subtitle: 'Información y contacto',
    privacy: 'Política de privacidad',
    website: 'Sitio web',
    support: 'Correo de soporte',
    openError: 'No se pudo abrir el enlace.',
    webNote:
      'En el navegador, el correo puede abrir el cliente por defecto; si no, copia la dirección de soporte manualmente.',
  },
  en: {
    title: 'Legal & help',
    subtitle: 'Information and contact',
    privacy: 'Privacy policy',
    website: 'Website',
    support: 'Support email',
    openError: 'Could not open the link.',
    webNote: 'In the browser, email may open your default client; otherwise copy the support address manually.',
  },
} as const;

async function openUrl(url: string, errMsg: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('', errMsg);
    }
  } catch {
    Alert.alert('', errMsg);
  }
}

export default function LegalHelp({ lang, onBack }: Props) {
  const t = copy[lang];
  const mailto = `mailto:${publicApp.supportEmail}?subject=${encodeURIComponent(publicApp.displayName)}`;

  const onPrivacy = useCallback(() => openUrl(publicApp.privacyPolicyUrl, t.openError), [t.openError]);
  const onSite = useCallback(() => openUrl(publicApp.marketingSiteUrl, t.openError), [t.openError]);
  const onMail = useCallback(() => openUrl(mailto, t.openError), [mailto, t.openError]);

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={lang === 'en' ? 'Back' : 'Volver'}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
      >
        <ChevronLeft color={theme.white} size={24} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.sub}>{publicApp.displayName}</Text>
        <Text style={styles.muted}>{t.subtitle}</Text>

        <View style={styles.list}>
          <Pressable
            onPress={onPrivacy}
            accessibilityRole="button"
            accessibilityLabel={t.privacy}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <ExternalLink color={theme.electricBlue} size={20} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t.privacy}</Text>
              <Text style={styles.rowHint} numberOfLines={2}>
                {publicApp.privacyPolicyUrl}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={onSite}
            accessibilityRole="button"
            accessibilityLabel={t.website}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <ExternalLink color={theme.electricBlue} size={20} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t.website}</Text>
              <Text style={styles.rowHint} numberOfLines={2}>
                {publicApp.marketingSiteUrl}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={onMail}
            accessibilityRole="button"
            accessibilityLabel={t.support}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowIcon}>
              <Mail color={theme.electricBlue} size={20} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{t.support}</Text>
              <Text style={styles.rowHint} numberOfLines={1}>
                {publicApp.supportEmail}
              </Text>
            </View>
          </Pressable>
        </View>

        {Platform.OS === 'web' ? <Text style={styles.webNote}>{t.webNote}</Text> : null}
      </ScrollView>
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
    marginTop: 16,
    marginBottom: 8,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
  },
  scroll: { paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.white,
    marginBottom: 6,
  },
  sub: { fontSize: 16, fontWeight: '800', color: theme.electricBlue, marginBottom: 4 },
  muted: { fontSize: 14, fontWeight: '500', color: theme.gray500, marginBottom: 28 },
  list: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    backgroundColor: theme.surfaceDark,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rowPressed: { opacity: 0.92 },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(48,112,240,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: theme.white },
  rowHint: { marginTop: 4, fontSize: 12, fontWeight: '500', color: theme.gray600 },
  webNote: { marginTop: 24, fontSize: 12, color: theme.gray600, lineHeight: 18 },
});
