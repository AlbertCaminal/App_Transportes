import React, { useState } from 'react';
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
import { Truck, ChevronLeft, ArrowRight, User, Briefcase, Package } from 'lucide-react-native';
import { Language, CarrierData, Vehicle } from '../../shared/types';
import { theme } from '../theme';

interface Props {
  lang: Language;
  onComplete: (data: CarrierData) => void;
  onBack: () => void;
}

const labels = {
  ca: {
    title: 'Registre de Transportista',
    name: 'Nom Complet',
    company: 'Empresa / Autònom',
    vehicle: 'El teu Vehicle',
    cta: 'Començar a guanyar',
  },
  es: {
    title: 'Registro de Transportista',
    name: 'Nombre Completo',
    company: 'Empresa / Autónomo',
    vehicle: 'Tu Vehículo',
    cta: 'Empezar a ganar',
  },
  en: {
    title: 'Carrier Registration',
    name: 'Full Name',
    company: 'Company / Freelance',
    vehicle: 'Your Vehicle',
    cta: 'Start Earning',
  },
} as const;

const vehicleModels: Vehicle[] = [
  { model: 'Renault Kangoo', volume: 3.3, maxDimensions: '1.7m x 1.2m x 1.1m' },
  { model: 'Mercedes Sprinter', volume: 10.5, maxDimensions: '3.3m x 1.7m x 1.9m' },
  { model: 'Iveco Daily', volume: 14.0, maxDimensions: '4.1m x 1.8m x 1.9m' },
  { model: 'Coche Particular', volume: 0.5, maxDimensions: '1.0m x 0.8m x 0.5m' },
];

export default function CarrierRegistration({ lang, onComplete, onBack }: Props) {
  const t = labels[lang];
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const handleSubmit = () => {
    const vehicle = vehicleModels.find((v) => v.model === selectedModel);
    if (name && selectedModel && vehicle) {
      onComplete({ name, company: company || 'Independiente', vehicle });
    }
  };

  const canSubmit = Boolean(name && selectedModel);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backSmall, pressed && { opacity: 0.85 }]}>
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
            placeholderTextColor={theme.gray800}
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
            placeholderTextColor={theme.gray800}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Truck color={theme.electricBlue} size={12} />
            <Text style={styles.label}>{t.vehicle}</Text>
          </View>
          {vehicleModels.map((v) => {
            const sel = selectedModel === v.model;
            return (
              <Pressable
                key={v.model}
                onPress={() => setSelectedModel(v.model)}
                style={[styles.vehicleRow, sel && styles.vehicleRowSel]}
              >
                <View style={styles.vehicleLeft}>
                  <View style={[styles.vehicleIcon, sel && styles.vehicleIconSel]}>
                    <Truck color={sel ? theme.white : theme.gray600} size={24} />
                  </View>
                  <View>
                    <Text style={[styles.vehicleName, sel && { color: theme.white }]}>{v.model}</Text>
                    <View style={styles.vehicleMetaRow}>
                      <Package color={theme.gray600} size={12} />
                      <Text style={styles.vehicleMeta}> Capacidad: {v.volume}m³</Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
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
          <ArrowRight color="#fff" size={20} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.deepNight },
  scroll: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 48 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 40 },
  backSmall: {
    padding: 12,
    backgroundColor: theme.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    fontSize: 10,
    fontWeight: '900',
    color: theme.gray600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: theme.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: 15,
    fontWeight: '600',
    color: theme.white,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: theme.surfaceDark,
    marginBottom: 14,
  },
  vehicleRowSel: {
    borderColor: theme.electricBlue,
    backgroundColor: 'rgba(48,112,240,0.05)',
  },
  vehicleLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vehicleIcon: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.deepNight,
  },
  vehicleIconSel: { backgroundColor: theme.electricBlue },
  vehicleName: { fontWeight: '900', color: theme.gray500, fontSize: 16 },
  vehicleMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  vehicleMeta: { fontSize: 10, fontWeight: '700', color: theme.gray600, textTransform: 'uppercase' },
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
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
