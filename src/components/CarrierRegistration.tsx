import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Truck, ChevronLeft, ArrowRight, User, Briefcase, Palette } from 'lucide-react-native';
import { Language, CarrierData, Vehicle } from '../../shared/types';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import AuthUpsellModal from './AuthUpsellModal';
import { useAuthUpsellNavigation } from '../hooks/useAuthUpsellNavigation';
import { useAppStore } from '../store/appStore';
import { requiresGoogleSignIn } from '../utils/requiresGoogleSignIn';

interface Props {
  lang: Language;
  onComplete: (data: CarrierData) => void;
  onBack: () => void;
  /** Si existe, rellena el formulario (p. ej. edición desde «Mi cuenta»). */
  initialData?: CarrierData;
}

const labels = {
  ca: {
    title: 'Registre de Transportista',
    name: 'Nom Complet',
    company: 'Empresa / Autònom',
    vehicle: 'El teu Vehicle',
    brand: 'Marca',
    model: 'Model',
    color: 'Color',
    plate: 'Matrícula',
    cta: 'Començar a guanyar',
  },
  es: {
    title: 'Registro de Transportista',
    name: 'Nombre Completo',
    company: 'Empresa / Autónomo',
    vehicle: 'Tu Vehículo',
    brand: 'Marca',
    model: 'Modelo',
    color: 'Color',
    plate: 'Matrícula',
    cta: 'Empezar a ganar',
  },
  en: {
    title: 'Carrier Registration',
    name: 'Full Name',
    company: 'Company / Freelance',
    vehicle: 'Your Vehicle',
    brand: 'Brand',
    model: 'Model',
    color: 'Color',
    plate: 'License plate',
    cta: 'Start Earning',
  },
} as const;

function carrierRegStyles(theme: AppPalette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.deepNight },
    scroll: { flex: 1 },
    scrollContent: { padding: 32, paddingBottom: 48 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40 },
    backSmall: {
      padding: 12,
      backgroundColor: theme.surfaceDark,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: theme.white, flex: 1 },
    field: { marginBottom: 28 },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      paddingLeft: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    subLabel: { marginTop: 14, marginBottom: 8 },
    inputGap: { marginBottom: 14 },
    input: {
      backgroundColor: theme.surfaceDark,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      borderRadius: 24,
      paddingVertical: 18,
      paddingHorizontal: 24,
      fontSize: 15,
      fontWeight: '600',
      color: theme.white,
    },
    cta: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.electricBlue,
      paddingVertical: 22,
      borderRadius: 28,
    },
    ctaDisabled: { opacity: 0.25 },
    ctaText: {
      color: theme.onPrimary,
      fontWeight: '900',
      fontSize: 13,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
  });
}

export default function CarrierRegistration({ lang, onComplete, onBack, initialData }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => carrierRegStyles(theme), [theme]);
  const t = labels[lang];
  const user = useAppStore((s) => s.user);
  const { goToGoogleLogin } = useAuthUpsellNavigation();
  const [showUpsell, setShowUpsell] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');

  useEffect(() => {
    if (!initialData) return;
    setName(initialData.name);
    setCompany(initialData.company === 'Independiente' ? '' : initialData.company);
    setBrand(initialData.vehicle.brand);
    setModel(initialData.vehicle.model);
    setColor(initialData.vehicle.color);
    setPlate(initialData.vehicle.licensePlate?.trim() ?? '');
  }, [initialData]);

  const submitRegistration = useCallback(() => {
    const plateNorm = plate.trim().toUpperCase();
    const vehicle: Vehicle = {
      brand: brand.trim(),
      model: model.trim(),
      color: color.trim(),
      licensePlate: plateNorm,
    };
    if (name.trim() && vehicle.brand && vehicle.model && vehicle.color && plateNorm) {
      onComplete({ name: name.trim(), company: company.trim() || 'Independiente', vehicle });
    }
  }, [brand, color, company, model, name, onComplete, plate]);

  const handleSubmit = () => {
    if (requiresGoogleSignIn(user)) {
      setShowUpsell(true);
      return;
    }
    submitRegistration();
  };

  const onUpsellContinue = useCallback(async () => {
    setShowUpsell(false);
    await goToGoogleLogin({ step: 'carrier-registration', profile: 'carrier' });
  }, [goToGoogleLogin]);

  const canSubmit = Boolean(name.trim() && brand.trim() && model.trim() && color.trim() && plate.trim());

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuthUpsellModal
        visible={showUpsell}
        onCancel={() => setShowUpsell(false)}
        onContinueGoogle={onUpsellContinue}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backSmall, pressed && { opacity: 0.85 }]}
          >
            <ChevronLeft color={theme.white} size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t.title}</Text>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <User color={theme.electricBlue} size={12} />
            <Text style={styles.label}>{t.name}</Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej: Marc Sastre"
            placeholderTextColor={theme.inputPlaceholder}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Briefcase color={theme.electricBlue} size={12} />
            <Text style={styles.label}>{t.company}</Text>
          </View>
          <TextInput
            value={company}
            onChangeText={setCompany}
            placeholder="Ej: Autònom BCN"
            placeholderTextColor={theme.inputPlaceholder}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Truck color={theme.electricBlue} size={12} />
            <Text style={styles.label}>{t.vehicle}</Text>
          </View>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { letterSpacing: 1 }]}>{t.brand}</Text>
          </View>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="Ej: Renault"
            placeholderTextColor={theme.inputPlaceholder}
            style={styles.input}
          />
          <Text style={[styles.label, styles.subLabel]}>{t.model}</Text>
          <TextInput
            value={model}
            onChangeText={setModel}
            placeholder="Ej: Kangoo"
            placeholderTextColor={theme.inputPlaceholder}
            style={[styles.input, styles.inputGap]}
          />
          <View style={styles.labelRow}>
            <Palette color={theme.electricBlue} size={12} />
            <Text style={styles.label}>{t.color}</Text>
          </View>
          <TextInput
            value={color}
            onChangeText={setColor}
            placeholder="Ej: Blanco"
            placeholderTextColor={theme.inputPlaceholder}
            style={styles.input}
          />
          <Text style={[styles.label, styles.subLabel]}>{t.plate}</Text>
          <TextInput
            value={plate}
            onChangeText={(txt) => setPlate(txt.toUpperCase())}
            placeholder="1234 ABC"
            placeholderTextColor={theme.inputPlaceholder}
            autoCapitalize="characters"
            style={[styles.input, styles.inputGap]}
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.cta,
            !canSubmit && styles.ctaDisabled,
            pressed && canSubmit && { opacity: 0.92 },
          ]}
        >
          <Text style={styles.ctaText}>{t.cta}</Text>
          <ArrowRight color={theme.onPrimary} size={20} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
