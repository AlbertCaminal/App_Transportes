import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FirebaseError } from 'firebase/app';
import { ChevronLeft, ChevronRight, Globe, Package, HelpCircle, LogOut, Trash2 } from 'lucide-react-native';
import type { Language } from '../../shared/types';
import { theme } from '../theme';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';
import { deleteCurrentUserAccount, signOutUser, updateAuthDisplayName } from '../services/firebase/auth';

interface Props {
  onBack: () => void;
  onLegalHelp: () => void;
}

function firebaseErrorCode(err: unknown): string | undefined {
  if (err instanceof FirebaseError) return err.code;
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code;
  }
  return undefined;
}

function deleteFailureMessage(err: unknown, tr: ReturnType<typeof useT>): string {
  const code = firebaseErrorCode(err);
  if (code === 'auth/requires-recent-login') return tr('profile.deleteRequiresRecentLogin');
  if (code === 'auth/network-request-failed') return tr('login.firebaseErr.network');
  if (err instanceof Error && err.message === 'auth/not-initialized') return tr('login.notConfigured');
  return tr('profile.deleteErrorGeneric');
}

export default function AccountSettings({ onBack, onLegalHelp }: Props) {
  const tr = useT();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.profile);
  const carrierData = useAppStore((s) => s.carrierData);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const setStep = useAppStore((s) => s.setStep);
  const clearUser = useAppStore((s) => s.clearUser);
  const openCarrierRegistrationFromAccountSettings = useAppStore(
    (s) => s.openCarrierRegistrationFromAccountSettings
  );

  const [displayName, setDisplayName] = React.useState(user?.displayName ?? '');
  const [savingName, setSavingName] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName, user?.uid]);

  const langs: Language[] = ['ca', 'es', 'en'];

  const providerLabel = () => {
    if (!user) return '';
    if (user.isAnonymous) return tr('accountSettings.providerGuest');
    if (user.provider === 'google') return tr('accountSettings.providerGoogle');
    return tr('accountSettings.providerEmail');
  };

  const roleLabel = () => {
    if (profile === 'client') return tr('accountSettings.roleClient');
    if (profile === 'carrier') return tr('accountSettings.roleCarrier');
    return tr('accountSettings.roleNone');
  };

  const onSaveDisplayName = async () => {
    setSavingName(true);
    try {
      await updateAuthDisplayName(displayName);
      Alert.alert('', tr('accountSettings.saveDisplayNameOk'));
    } catch {
      Alert.alert('', tr('accountSettings.saveDisplayNameErr'));
    } finally {
      setSavingName(false);
    }
  };

  const onSignOut = async () => {
    try {
      await signOutUser();
    } finally {
      clearUser();
    }
  };

  const runDeleteAccount = async () => {
    setDeleteConfirmVisible(false);
    setDeleting(true);
    try {
      await deleteCurrentUserAccount();
      clearUser();
    } catch (err) {
      if (__DEV__) console.warn('[AccountSettings] deleteAccount', err);
      setDeleteErrorMessage(deleteFailureMessage(err, tr));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.root}>
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('common.cancel')}
            style={StyleSheet.absoluteFillObject}
            onPress={() => setDeleteConfirmVisible(false)}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{tr('profile.deleteConfirmTitle')}</Text>
            <Text style={styles.confirmBody}>{tr('profile.deleteConfirmMessage')}</Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDeleteConfirmVisible(false)}
                style={({ pressed }) => [styles.confirmBtnGhost, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.confirmBtnGhostTxt}>{tr('common.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={() => void runDeleteAccount()}
                style={({ pressed }) => [styles.confirmBtnDanger, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.confirmBtnDangerTxt}>{tr('profile.deleteConfirmAction')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteErrorMessage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteErrorMessage(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            style={StyleSheet.absoluteFillObject}
            onPress={() => setDeleteErrorMessage(null)}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmBody}>{deleteErrorMessage ?? ''}</Text>
            <Pressable
              onPress={() => setDeleteErrorMessage(null)}
              style={({ pressed }) => [styles.confirmBtnPrimary, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.confirmBtnPrimaryTxt}>{tr('common.ok')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {deleting ? (
        <View style={styles.deletingOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={theme.electricBlue} />
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={tr('common.back')}
            style={({ pressed }) => [styles.backSmall, pressed && { opacity: 0.85 }]}
          >
            <ChevronLeft color={theme.white} size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{tr('accountSettings.title')}</Text>
        </View>

        <Text style={styles.section}>{tr('accountSettings.sectionAccount')}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{tr('accountSettings.labelDisplayName')}</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={tr('accountSettings.placeholderDisplayName')}
            placeholderTextColor={theme.gray800}
            style={styles.input}
            editable={Boolean(user)}
            accessibilityLabel={tr('accountSettings.labelDisplayName')}
          />
          <Pressable
            onPress={() => void onSaveDisplayName()}
            disabled={savingName || !user}
            style={({ pressed }) => [
              styles.saveBtn,
              (!user || savingName) && styles.saveBtnDisabled,
              pressed && user && !savingName && { opacity: 0.9 },
            ]}
          >
            {savingName ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnTxt}>{tr('accountSettings.saveDisplayName')}</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.cardBlock}>
          <Text style={styles.metaLabel}>{tr('accountSettings.labelEmail')}</Text>
          <Text style={styles.metaValue}>{user?.email ?? tr('accountSettings.emailMissing')}</Text>
          <Text style={styles.metaHint}>{providerLabel()}</Text>
        </View>

        <Text style={styles.section}>{tr('accountSettings.sectionPreferences')}</Text>
        <View style={styles.langRow}>
          {langs.map((code) => {
            const sel = lang === code;
            return (
              <Pressable
                key={code}
                onPress={() => setLang(code)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={tr(`onboarding.languages.${code}`)}
                style={[styles.langChip, sel && styles.langChipSel]}
              >
                <Globe color={sel ? theme.white : theme.gray600} size={14} />
                <Text style={[styles.langChipTxt, sel && styles.langChipTxtSel]}>
                  {tr(`onboarding.languages.${code}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.section}>{tr('accountSettings.sectionApp')}</Text>

        <View style={styles.cardBlock}>
          <Text style={styles.metaLabel}>{tr('accountSettings.activeRole')}</Text>
          <Text style={styles.metaValue}>{roleLabel()}</Text>
          {carrierData ? (
            <Text style={styles.metaHint}>
              {tr('accountSettings.carrierVehicleLine', { vehicle: carrierData.vehicle.model })}
            </Text>
          ) : null}
        </View>

        <NavRow label={tr('accountSettings.changeMode')} onPress={() => setStep('profile')} />

        {profile === 'client' ? (
          <NavRow label={tr('accountSettings.goClientHome')} onPress={() => setStep('home')} />
        ) : null}

        {profile === 'carrier' ? (
          <>
            <NavRow
              label={carrierData ? tr('accountSettings.editCarrier') : tr('accountSettings.completeCarrier')}
              onPress={openCarrierRegistrationFromAccountSettings}
            />
            {carrierData ? (
              <NavRow
                label={tr('accountSettings.goCarrierDashboard')}
                onPress={() => setStep('carrier-dashboard')}
              />
            ) : null}
          </>
        ) : null}

        <Text style={styles.section}>{tr('accountSettings.sectionHelp')}</Text>
        <NavRow
          label={tr('accountSettings.legalHelp')}
          icon={<HelpCircle color={theme.electricBlue} size={18} />}
          onPress={onLegalHelp}
        />

        <Text style={styles.section}>{tr('accountSettings.sectionSession')}</Text>
        <Pressable
          onPress={() => void onSignOut()}
          accessibilityRole="button"
          accessibilityLabel={tr('profile.signOut')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
        >
          <LogOut color={theme.gray500} size={18} />
          <Text style={styles.rowTxt}>{tr('profile.signOut')}</Text>
          <ChevronRight color={theme.gray600} size={18} style={styles.rowChevron} />
        </Pressable>

        <Pressable
          onPress={() => setDeleteConfirmVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={tr('profile.deleteAccount')}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
        >
          <Trash2 color="#ff6b6b" size={18} />
          <Text style={styles.rowDanger}>{tr('profile.deleteAccount')}</Text>
          <ChevronRight color={theme.gray600} size={18} style={styles.rowChevron} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function NavRow({ label, onPress, icon }: { label: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.88 }]}
    >
      {icon ?? <Package color={theme.electricBlue} size={18} />}
      <Text style={styles.rowTxt}>{label}</Text>
      <ChevronRight color={theme.gray600} size={18} style={styles.rowChevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.deepNight },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    position: 'relative',
  },
  confirmCard: {
    backgroundColor: theme.surfaceDark,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.white,
    marginBottom: 12,
  },
  confirmBody: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.gray500,
    lineHeight: 21,
    marginBottom: 20,
  },
  confirmActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' },
  confirmBtnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  confirmBtnGhostTxt: { fontSize: 15, fontWeight: '700', color: theme.gray500 },
  confirmBtnDanger: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,107,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.35)',
  },
  confirmBtnDangerTxt: { fontSize: 15, fontWeight: '800', color: '#ff6b6b' },
  confirmBtnPrimary: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: theme.electricBlue,
    alignItems: 'center',
  },
  confirmBtnPrimaryTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48 },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.72)',
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 28,
  },
  backSmall: {
    padding: 12,
    backgroundColor: theme.surfaceDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: theme.white, flex: 1 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.gray600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.gray600,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  field: { marginBottom: 16 },
  input: {
    backgroundColor: theme.surfaceDark,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: '600',
    color: theme.white,
    marginBottom: 10,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.electricBlue,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cardBlock: {
    backgroundColor: theme.surfaceDark,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginBottom: 8,
  },
  metaLabel: { fontSize: 10, fontWeight: '800', color: theme.gray600, textTransform: 'uppercase' },
  metaValue: { fontSize: 15, fontWeight: '700', color: theme.white, marginTop: 6 },
  metaHint: { fontSize: 12, fontWeight: '600', color: theme.gray500, marginTop: 8 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: theme.surfaceDark,
  },
  langChipSel: {
    borderColor: theme.electricBlue,
    backgroundColor: 'rgba(48,112,240,0.12)',
  },
  langChipTxt: { fontSize: 13, fontWeight: '700', color: theme.gray500 },
  langChipTxtSel: { color: theme.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowTxt: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.white },
  rowDanger: { flex: 1, fontSize: 16, fontWeight: '700', color: '#ff6b6b' },
  rowChevron: { marginLeft: 'auto' },
});
