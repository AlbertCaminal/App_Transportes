import React, { useCallback, useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { MapPin } from 'lucide-react-native';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useT } from '../i18n/useT';
import type { LocationStatus } from '../hooks/useDeviceLocation';

interface Props {
  visible: boolean;
  status: LocationStatus;
  onAllow: () => void;
  onCancel: () => void;
}

function gateStyles(theme: AppPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.overlayModal,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: theme.surfaceDark,
      borderRadius: 32,
      padding: 28,
      borderWidth: 1,
      borderColor: theme.divider,
      alignItems: 'center',
      gap: 18,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 28,
      backgroundColor: theme.langChipSelectedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.white,
      textAlign: 'center',
    },
    body: {
      fontSize: 13,
      color: theme.gray500,
      textAlign: 'center',
      lineHeight: 20,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      width: '100%',
    },
    btnSecondary: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: theme.deepNight,
      borderWidth: 1,
      borderColor: theme.borderMuted,
      alignItems: 'center',
    },
    btnSecondaryTxt: {
      color: theme.gray500,
      fontWeight: '900',
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    btnPrimary: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: theme.electricBlue,
      alignItems: 'center',
    },
    btnPrimaryTxt: {
      color: theme.onPrimary,
      fontWeight: '900',
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
  });
}

/**
 * Modal de consentimiento de ubicación. Se monta cuando el usuario va a
 * realizar una acción que requiere GPS (p. ej. mostrar el trayecto más
 * rápido al carrier). En `denied` ofrece reintentar o abrir Ajustes.
 */
export default function LocationPermissionGate({ visible, status, onAllow, onCancel }: Props) {
  const tr = useT();
  const theme = useAppTheme();
  const styles = useMemo(() => gateStyles(theme), [theme]);

  const openSettings = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      /* el SO ignora si no hay ajuste expuesto */
    }
  }, []);

  const isDenied = status === 'denied' || status === 'unavailable';
  const isPending = status === 'pending';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <MapPin color={theme.electricBlue} size={32} />
          </View>
          <Text style={styles.title}>{tr('location.permissionTitle')}</Text>
          <Text style={styles.body}>
            {isDenied ? tr('location.deniedExplain') : tr('location.permissionBody')}
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={tr('common.cancel')}
              style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnSecondaryTxt}>{tr('common.cancel')}</Text>
            </Pressable>

            {isDenied && Platform.OS !== 'web' ? (
              <Pressable
                onPress={() => void openSettings()}
                accessibilityRole="button"
                accessibilityLabel={tr('location.openSettings')}
                style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.btnPrimaryTxt}>{tr('location.openSettings')}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onAllow}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel={tr('location.allow')}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  pressed && { opacity: 0.9 },
                  isPending && { opacity: 0.7 },
                ]}
              >
                {isPending ? (
                  <ActivityIndicator color={theme.onPrimary} />
                ) : (
                  <Text style={styles.btnPrimaryTxt}>{tr('location.allow')}</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
