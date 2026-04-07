import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LanguageOnboarding from './src/components/LanguageOnboarding';
import ProfileSelection from './src/components/ProfileSelection';
import ClientHome from './src/components/ClientHome';
import CarrierRegistration from './src/components/CarrierRegistration';
import CarrierHome from './src/components/CarrierHome';
import LegalHelp from './src/components/LegalHelp';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { Language, UserProfile, AppState, CarrierData } from './shared/types';
import { theme } from './src/theme';

export default function App() {
  const [state, setState] = useState<AppState>({
    lang: 'es',
    profile: null,
    step: 'onboarding',
  });

  const handleLangSelect = (lang: Language) => {
    setState((prev) => ({ ...prev, lang, step: 'profile' }));
  };

  const handleProfileSelect = (profile: UserProfile) => {
    if (profile === 'carrier') {
      setState((prev) => ({ ...prev, profile, step: 'carrier-registration' }));
    } else {
      setState((prev) => ({ ...prev, profile, step: 'home' }));
    }
  };

  const handleCarrierRegistration = (data: CarrierData) => {
    setState((prev) => ({ ...prev, carrierData: data, step: 'carrier-dashboard' }));
  };

  const handleStepChange = (step: AppState['step']) => {
    setState((prev) => ({ ...prev, step }));
  };

  const openLegalHelp = () => {
    setState((prev) => {
      if (prev.step === 'legal-help') return prev;
      return { ...prev, legalReturnStep: prev.step, step: 'legal-help' };
    });
  };

  const closeLegalHelp = () => {
    setState((prev) => ({
      ...prev,
      step: prev.legalReturnStep ?? 'profile',
      legalReturnStep: undefined,
    }));
  };

  return (
    <GestureHandlerRootView style={styles.gesture}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          <AppErrorBoundary>
            <View style={styles.root}>
              {state.step === 'legal-help' && <LegalHelp lang={state.lang} onBack={closeLegalHelp} />}

              {state.step === 'onboarding' && <LanguageOnboarding onSelect={handleLangSelect} />}

              {state.step === 'profile' && (
                <ProfileSelection
                  lang={state.lang}
                  onSelect={handleProfileSelect}
                  onBack={() => handleStepChange('onboarding')}
                  onLegalHelp={openLegalHelp}
                />
              )}

              {state.step === 'carrier-registration' && (
                <CarrierRegistration
                  lang={state.lang}
                  onComplete={handleCarrierRegistration}
                  onBack={() => handleStepChange('profile')}
                />
              )}

              {state.step === 'carrier-dashboard' && state.carrierData && (
                <CarrierHome
                  lang={state.lang}
                  carrier={state.carrierData}
                  onExit={() => handleStepChange('profile')}
                  onOpenLegalHelp={openLegalHelp}
                />
              )}

              {(state.step === 'home' || state.step === 'tracking' || state.step === 'reservation-confirmed') && (
                <ClientHome
                  lang={state.lang}
                  step={state.step}
                  onStepChange={handleStepChange}
                  onBack={() => handleStepChange('profile')}
                  onOpenLegalHelp={openLegalHelp}
                />
              )}
            </View>
          </AppErrorBoundary>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gesture: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.bgRoot },
  root: { flex: 1, backgroundColor: theme.bgRoot },
});
