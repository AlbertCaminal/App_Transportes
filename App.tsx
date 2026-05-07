import React, { useEffect, useMemo } from 'react';
import { useAuthSync } from './src/hooks/useAuthSync';
import { initSentry, wrapRootComponent } from './src/services/monitoring/sentry';
import './src/i18n'; // inicializa i18n-js y sincroniza con el store
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LanguageOnboarding from './src/components/LanguageOnboarding';
import Login from './src/components/Login';
import Register from './src/components/Register';
import ProfileSelection from './src/components/ProfileSelection';
import AccountSettings from './src/components/AccountSettings';
import ClientHome from './src/components/ClientHome';
import CarrierRegistration from './src/components/CarrierRegistration';
import CarrierHome from './src/components/CarrierHome';
import LegalHelp from './src/components/LegalHelp';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { paletteFor } from './src/theme';
import { useAppStore } from './src/store/appStore';

function App() {
  useAuthSync();

  useEffect(() => {
    initSentry();
  }, []);

  const colorScheme = useAppStore((s) => s.colorScheme);
  const lang = useAppStore((s) => s.lang);
  const step = useAppStore((s) => s.step);
  const carrierData = useAppStore((s) => s.carrierData);
  const authInitialized = useAppStore((s) => s.authInitialized);

  const setLang = useAppStore((s) => s.setLang);
  const selectProfile = useAppStore((s) => s.selectProfile);
  const setCarrierData = useAppStore((s) => s.setCarrierData);
  const setStep = useAppStore((s) => s.setStep);
  const openLegalHelp = useAppStore((s) => s.openLegalHelp);
  const closeLegalHelp = useAppStore((s) => s.closeLegalHelp);
  const exitCarrierRegistration = useAppStore((s) => s.exitCarrierRegistration);
  const closeAccountSettings = useAppStore((s) => s.closeAccountSettings);

  const theme = useMemo(() => paletteFor(colorScheme), [colorScheme]);
  const layoutStyles = useMemo(
    () =>
      StyleSheet.create({
        gesture: { flex: 1, minHeight: 0 },
        safe: { flex: 1, minHeight: 0, backgroundColor: theme.bgRoot },
        root: { flex: 1, minHeight: 0, backgroundColor: theme.bgRoot },
        authSplash: { justifyContent: 'center', alignItems: 'center' },
      }),
    [theme]
  );

  const statusBarStyle = colorScheme === 'light' ? 'dark' : 'light';

  if (!authInitialized) {
    return (
      <GestureHandlerRootView style={layoutStyles.gesture}>
        <SafeAreaProvider>
          <SafeAreaView style={[layoutStyles.safe, layoutStyles.authSplash]} edges={['top', 'left', 'right']}>
            <StatusBar style={statusBarStyle} />
            <ActivityIndicator size="large" color={theme.electricBlue} accessibilityLabel="Loading" />
          </SafeAreaView>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={layoutStyles.gesture}>
      <SafeAreaProvider>
        <SafeAreaView style={layoutStyles.safe} edges={['top', 'left', 'right']}>
          <StatusBar style={statusBarStyle} />
          <AppErrorBoundary>
            <View style={layoutStyles.root}>
              {step === 'legal-help' && <LegalHelp lang={lang} onBack={closeLegalHelp} />}

              {step === 'onboarding' && <LanguageOnboarding onSelect={setLang} />}

              {step === 'login' && (
                <Login
                  onBack={() => setStep('onboarding')}
                  onLegalHelp={openLegalHelp}
                  onGoToRegister={() => setStep('register')}
                />
              )}

              {step === 'register' && (
                <Register onBack={() => setStep('login')} onLegalHelp={openLegalHelp} />
              )}

              {step === 'profile' && (
                <ProfileSelection
                  lang={lang}
                  onSelect={selectProfile}
                  onBack={() => setStep('login')}
                  onLegalHelp={openLegalHelp}
                />
              )}

              {step === 'account-settings' && (
                <AccountSettings onBack={closeAccountSettings} onLegalHelp={openLegalHelp} />
              )}

              {(step === 'carrier-registration' || (step === 'carrier-dashboard' && !carrierData)) && (
                <CarrierRegistration
                  lang={lang}
                  initialData={carrierData}
                  onComplete={setCarrierData}
                  onBack={exitCarrierRegistration}
                />
              )}

              {step === 'carrier-dashboard' && carrierData && (
                <CarrierHome
                  lang={lang}
                  carrier={carrierData}
                  onOpenLegalHelp={openLegalHelp}
                  onBack={() => setStep('profile')}
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

export default wrapRootComponent(App);
