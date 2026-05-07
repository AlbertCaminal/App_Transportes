import React, { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useT } from '../i18n/useT';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onContinueGoogle: () => void;
}

function upsellStyles(theme: AppPalette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlayBlocking,
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    card: {
      backgroundColor: theme.surfaceDark,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.borderMuted,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.white,
      marginBottom: 12,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.textOnDarkMuted,
      marginBottom: 24,
    },
    actions: { gap: 12 },
    btnSecondary: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      alignItems: 'center',
    },
    btnSecondaryTxt: {
      color: theme.textOnDarkMuted,
      fontWeight: '700',
      fontSize: 15,
    },
    btnPrimary: {
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: theme.electricBlue,
      alignItems: 'center',
    },
    btnPrimaryTxt: {
      color: theme.onPrimary,
      fontWeight: '800',
      fontSize: 15,
    },
  });
}

export default function AuthUpsellModal({ visible, onCancel, onContinueGoogle }: Props) {
  const tr = useT();
  const theme = useAppTheme();
  const styles = useMemo(() => upsellStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{tr('authUpsell.title')}</Text>
          <Text style={styles.body}>{tr('authUpsell.body')}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={tr('authUpsell.cancel')}
              style={({ pressed }) => [styles.btnSecondary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnSecondaryTxt}>{tr('authUpsell.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={onContinueGoogle}
              accessibilityRole="button"
              accessibilityLabel={tr('authUpsell.continueGoogle')}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.92 }]}
            >
              <Text style={styles.btnPrimaryTxt}>{tr('authUpsell.continueGoogle')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
