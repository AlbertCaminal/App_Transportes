import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User, Truck, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { UserProfile, Language } from '../../shared/types';
import type { AppPalette } from '../theme';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  lang: Language;
  onSelect: (profile: UserProfile) => void;
  onBack: () => void;
  onLegalHelp: () => void;
}

function profileStyles(theme: AppPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.deepNight,
      paddingHorizontal: 24,
      overflow: 'hidden',
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
      borderColor: theme.borderSubtle,
    },
    menuBtn: {
      position: 'absolute',
      top: 32,
      right: 24,
      zIndex: 10,
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.surfaceDark,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    legalLink: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 8 },
    legalLinkTxt: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textOnDarkMuted,
      textDecorationLine: 'underline',
    },
    question: {
      fontSize: 26,
      fontWeight: '900',
      color: theme.white,
      textAlign: 'center',
      marginBottom: 48,
      paddingHorizontal: 16,
    },
    grid: { width: '100%', maxWidth: 360, gap: 20 },
    card: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: theme.surfaceDark,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    cardPressed: { opacity: 0.95, transform: [{ scale: 0.98 }] },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.langChipSelectedBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    cardTitle: { fontSize: 20, fontWeight: '900', color: theme.white },
    cardDesc: { marginTop: 8, color: theme.gray500, fontSize: 14, fontWeight: '500' },
  });
}

export default function ProfileSelection({ onSelect, onBack, onLegalHelp }: Props) {
  const tr = useT();
  const theme = useAppTheme();
  const styles = useMemo(() => profileStyles(theme), [theme]);
  const user = useAppStore((s) => s.user);
  const openAccountSettings = useAppStore((s) => s.openAccountSettings);

  const labels = {
    question: tr('profile.question'),
    client: tr('profile.client'),
    carrier: tr('profile.carrier'),
    clientDesc: tr('profile.clientDesc'),
    carrierDesc: tr('profile.carrierDesc'),
  };
  const legalLabel = tr('profile.legalLink');

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={tr('common.back')}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
      >
        <ChevronLeft color={theme.white} size={24} />
      </Pressable>

      {user ? (
        <Pressable
          onPress={openAccountSettings}
          accessibilityRole="button"
          accessibilityLabel={tr('profile.accountMenuA11y')}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.85 }]}
        >
          <MoreVertical color={theme.white} size={22} />
        </Pressable>
      ) : null}

      <View style={styles.center}>
        <Text style={styles.question}>{labels.question}</Text>

        <View style={styles.grid}>
          <Pressable
            onPress={() => onSelect('client')}
            accessibilityRole="button"
            accessibilityLabel={`${labels.client}. ${labels.clientDesc}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconCircle}>
              <User color={theme.electricBlue} size={40} />
            </View>
            <Text style={styles.cardTitle}>{labels.client}</Text>
            <Text style={styles.cardDesc}>{labels.clientDesc}</Text>
          </Pressable>

          <Pressable
            onPress={() => onSelect('carrier')}
            accessibilityRole="button"
            accessibilityLabel={`${labels.carrier}. ${labels.carrierDesc}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconCircle}>
              <Truck color={theme.electricBlue} size={40} />
            </View>
            <Text style={styles.cardTitle}>{labels.carrier}</Text>
            <Text style={styles.cardDesc}>{labels.carrierDesc}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onLegalHelp}
          accessibilityRole="button"
          accessibilityLabel={legalLabel}
          style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.legalLinkTxt}>{legalLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
