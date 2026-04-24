import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { useT } from '../i18n/useT';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onContinueGoogle: () => void;
}

export default function AuthUpsellModal({ visible, onCancel, onContinueGoogle }: Props) {
  const tr = useT();

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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: theme.surfaceDark,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: theme.gray500,
    marginBottom: 24,
  },
  actions: { gap: 12 },
  btnSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  btnSecondaryTxt: {
    color: theme.gray500,
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
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
