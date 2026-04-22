import React, { useEffect } from 'react';
import { useAuthSync } from './src/hooks/useAuthSync';
import { initSentry, wrapRootComponent } from './src/services/monitoring/sentry';
import './src/i18n'; // inicializa i18n-js y sincroniza con el store
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LanguageOnboarding from './src/components/LanguageOnboarding';
import Login from './src/components/Login';
import ProfileSelection from './src/components/ProfileSelection';
import ClientHome from './src/components/ClientHome';
import CarrierRegistration from './src/components/CarrierRegistration';
import CarrierHome from './src/components/CarrierHome';
import LegalHelp from './src/components/LegalHelp';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { theme } from './src/theme';
import { useAppStore } from './src/store/appStore';

function App() {
  useAuthSync();

  useEffect(() => {
    initSentry();
  }, []);

  const lang = useAppStore((s) => s.lang);
  const step = useAppStore((s) => s.step);
  const carrierData = useAppStore((s) => s.carrierData);

  const setLang = useAppStore((s) => s.setLang);
  const selectProfile = useAppStore((s) => s.selectProfile);
  const setCarrierData = useAppStore((s) => s.setCarrierData);
  const setStep = useAppStore((s) => s.setStep);
  const openLegalHelp = useAppStore((s) => s.openLegalHelp);
  const closeLegalHelp = useAppStore((s) => s.closeLegalHelp);

  return (
    <GestureHandlerRootView style={styles.gesture}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          <AppErrorBoundary>
            <View style={styles.root}>
              {step === 'legal-help' && <LegalHelp lang={lang} onBack={closeLegalHelp} />}

              {step === 'onboarding' && <LanguageOnboarding onSelect={setLang} />}

              {step === 'login' && <Login onBack={() => setStep('onboarding')} onLegalHelp={openLegalHelp} />}

              {step === 'profile' && (
                <ProfileSelection
                  lang={lang}
                  onSelect={selectProfile}
                  onBack={() => setStep('login')}
                  onLegalHelp={openLegalHelp}
                />
              )}

              {step === 'carrier-registration' && (
                <CarrierRegistration
                  lang={lang}
                  onComplete={setCarrierData}
                  onBack={() => setStep('profile')}
                />
              )}

              {step === 'carrier-dashboard' && carrierData && (
                <CarrierHome
                  lang={lang}
                  carrier={carrierData}
                  onExit={() => setStep('profile')}
                  onOpenLegalHelp={openLegalHelp}
                />
              )}

              {(step === 'home' || step === 'tracking' || step === 'reservation-confirmed') && (
                <ClientHome
                  lang={lang}
                  step={step}
                  onStepChange={setStep}
                  onBack={() => setStep('profile')}
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

export default wrapRootComponent(App);
