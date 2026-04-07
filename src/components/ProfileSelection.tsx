import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { User, Truck, ChevronLeft } from 'lucide-react-native';
import { UserProfile, Language } from '../../shared/types';
import { theme } from '../theme';

interface Props {
  lang: Language;
  onSelect: (profile: UserProfile) => void;
  onBack: () => void;
  onLegalHelp: () => void;
}

const copy = {
  ca: {
    question: "¿Com utilitzaràs l'app?",
    client: 'SOC CLIENT',
    carrier: 'SOC TRANSPORTISTA',
    clientDesc: 'Vull enviar paquets',
    carrierDesc: 'Vull realitzar enviaments',
  },
  es: {
    question: '¿Cómo vas a usar la app?',
    client: 'Soy Cliente',
    carrier: 'Soy Transportista',
    clientDesc: 'Quiero enviar paquetes',
    carrierDesc: 'Quiero realizar envíos',
  },
  en: {
    question: 'How will you use the app?',
    client: "I'm a Customer",
    carrier: "I'm a Carrier",
    clientDesc: 'I want to send packages',
    carrierDesc: 'I want to fulfill deliveries',
  },
} as const;

const legalLink = {
  ca: 'Legal i ajuda',
  es: 'Legal y ayuda',
  en: 'Legal & help',
} as const;

export default function ProfileSelection({ lang, onSelect, onBack, onLegalHelp }: Props) {
  const t = copy[lang];

  return (
    <View style={styles.root}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
      >
        <ChevronLeft color={theme.white} size={24} />
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.question}>{t.question}</Text>

        <View style={styles.grid}>
          <Pressable
            onPress={() => onSelect('client')}
            accessibilityRole="button"
            accessibilityLabel={`${t.client}. ${t.clientDesc}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconCircle}>
              <User color={theme.electricBlue} size={40} />
            </View>
            <Text style={styles.cardTitle}>{t.client}</Text>
            <Text style={styles.cardDesc}>{t.clientDesc}</Text>
          </Pressable>

          <Pressable
            onPress={() => onSelect('carrier')}
            accessibilityRole="button"
            accessibilityLabel={`${t.carrier}. ${t.carrierDesc}`}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconCircle}>
              <Truck color={theme.electricBlue} size={40} />
            </View>
            <Text style={styles.cardTitle}>{t.carrier}</Text>
            <Text style={styles.cardDesc}>{t.carrierDesc}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onLegalHelp}
          accessibilityRole="button"
          accessibilityLabel={legalLink[lang]}
          style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.legalLinkTxt}>{legalLink[lang]}</Text>
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
    borderColor: 'rgba(255,255,255,0.05)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  legalLink: { marginTop: 32, paddingVertical: 12, paddingHorizontal: 8 },
  legalLinkTxt: { fontSize: 14, fontWeight: '700', color: theme.gray500, textDecorationLine: 'underline' },
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
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardPressed: { opacity: 0.95, transform: [{ scale: 0.98 }] },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(48,112,240,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: theme.white },
  cardDesc: { marginTop: 8, color: theme.gray500, fontSize: 14, fontWeight: '500' },
});
