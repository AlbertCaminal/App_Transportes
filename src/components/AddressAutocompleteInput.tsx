import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useT } from '../i18n/useT';
import { isMapboxConfigured } from '../config/mapbox';
import { suggestAddresses, type AddressSuggestion } from '../services/mapbox/suggest';
import { primeGeocodeCache } from '../services/mapbox/geocodeCache';
import { canConsumeMapbox } from '../services/mapbox/quota';

/**
 * 400 ms cubre bien escritura humana sin disparar llamada por cada tecla; en
 * combinación con la cache + dedupe in-flight del servicio, una sesión típica
 * de 1 dirección termina con 1-2 peticiones a Mapbox como máximo.
 */
const DEBOUNCE_MS = 400;
const MIN_QUERY_LEN = 3;

function autocompleteStyles(theme: AppPalette) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
      width: '100%',
    },
    input: {
      color: theme.white,
      fontSize: 15,
      fontWeight: '600',
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 6,
      backgroundColor: theme.surfaceDark,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      paddingVertical: 6,
      zIndex: 9999,
      elevation: 24,
      /** En web la sombra ayuda al contraste del dropdown sobre el mapa. */
      shadowColor: '#000',
      shadowOpacity: 0.55,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      maxHeight: 240,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.surfaceDark,
    },
    /** Cada sugerencia tiene fondo sólido propio para que nada del fondo se cuele. */
    rowItem: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.surfaceDark,
    },
    rowText: {
      color: theme.white,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    rowSubtle: {
      color: theme.textOnDarkMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    notConfiguredHint: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textOnDarkMuted,
      marginTop: 6,
      paddingHorizontal: 6,
    },
  });
}

interface Props {
  value: string;
  onChangeText: (next: string) => void;
  /**
   * Callback opcional al elegir una sugerencia (con coords). Se llama además
   * de `onChangeText`. Útil si el padre quiere precachear el geocoding o
   * recolectar `[lng, lat]` para posteriores cálculos. Es la señal "el usuario
   * ha confirmado esta dirección"; el mapa puede actualizarse aquí.
   */
  onSelectSuggestion?: (s: AddressSuggestion) => void;
  placeholder?: string;
  /** A11y label del input. Si no se provee, usa el placeholder. */
  accessibilityLabel?: string;
  /** Estilos opcionales: contenedor del input + estilo del TextInput. */
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  /** Render personalizado del input (por defecto, un TextInput de la app). */
  renderInput?: (params: {
    value: string;
    onChangeText: (next: string) => void;
    onFocus: () => void;
    onBlur: () => void;
  }) => React.ReactNode;
}

/**
 * Input con autocompletado de direcciones reales (Mapbox Geocoding).
 *
 * - Debounce 400 ms; consulta solo con ≥3 caracteres.
 * - `AbortController`: cancela las peticiones obsoletas cuando el usuario
 *   sigue tecleando o se desmonta el componente.
 * - Cierre del dropdown en blur (con pequeño delay para permitir el tap en
 *   una sugerencia).
 * - Si no hay token Mapbox, se degrada al input simple sin sugerencias y
 *   muestra una pista discreta.
 */
export default function AddressAutocompleteInput({
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder,
  accessibilityLabel,
  containerStyle,
  inputStyle,
  renderInput,
}: Props) {
  const tr = useT();
  const theme = useAppTheme();
  const styles = useMemo(() => autocompleteStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const configured = isMapboxConfigured();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      if (!configured) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (q.length < MIN_QUERY_LEN) {
        setItems([]);
        setLoading(false);
        return;
      }
      abortRef.current?.abort();
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      abortRef.current = controller;
      setLoading(true);
      const out = await suggestAddresses(q, controller ? { signal: controller.signal } : undefined);
      if (lastQueryRef.current !== q) return;
      setItems(out);
      setLoading(false);
    },
    [configured]
  );

  const handleChangeText = useCallback(
    (next: string) => {
      onChangeText(next);
      lastQueryRef.current = next.trim();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(next.trim());
      }, DEBOUNCE_MS);
    },
    [onChangeText, runSearch]
  );

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    blurTimerRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  const handlePickSuggestion = useCallback(
    (s: AddressSuggestion) => {
      onChangeText(s.placeName);
      primeGeocodeCache(s.placeName, s.center[0], s.center[1]);
      onSelectSuggestion?.(s);
      setItems([]);
      setOpen(false);
      abortRef.current?.abort();
    },
    [onChangeText, onSelectSuggestion]
  );

  const overQuota = configured && !canConsumeMapbox('geocoding');
  const showDropdown =
    open && configured && (loading || items.length > 0 || value.trim().length >= MIN_QUERY_LEN);

  // El wrap eleva su z-index sólo mientras está abierto: así el dropdown
  // queda por encima de los siguientes inputs/secciones (en RN-web los
  // hermanos posteriores ganan el stacking por defecto). Al cerrarse, se
  // baja para no estorbar a otros desplegables.
  const wrapStyle: ViewStyle = open
    ? { ...styles.wrap, zIndex: 9999, ...(containerStyle ?? {}) }
    : { ...styles.wrap, ...(containerStyle ?? {}) };

  return (
    <View style={wrapStyle}>
      {renderInput ? (
        renderInput({ value, onChangeText: handleChangeText, onFocus: handleFocus, onBlur: handleBlur })
      ) : (
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? tr('addressSuggest.placeholder')}
          placeholderTextColor={theme.inputPlaceholder}
          accessibilityLabel={accessibilityLabel ?? placeholder ?? tr('addressSuggest.placeholder')}
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="street-address"
          textContentType="streetAddressLine1"
          returnKeyType="search"
          style={[styles.input, inputStyle]}
        />
      )}
      {showDropdown ? (
        <View style={styles.dropdown} accessibilityLiveRegion="polite">
          {loading ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color={theme.electricBlue} />
              <Text style={styles.rowSubtle}>{tr('addressSuggest.loading')}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.rowItem}>
              <Text style={styles.rowSubtle}>
                {overQuota ? tr('addressSuggest.overQuota') : tr('addressSuggest.noResults')}
              </Text>
            </View>
          ) : (
            items.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => handlePickSuggestion(s)}
                accessibilityRole="button"
                accessibilityLabel={s.placeName}
                style={({ pressed }) => [styles.rowItem, pressed && { backgroundColor: theme.fillSoft }]}
              >
                <Text style={styles.rowText} numberOfLines={2}>
                  {s.placeName}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
      {!configured ? (
        <Text style={styles.notConfiguredHint}>{tr('addressSuggest.notConfigured')}</Text>
      ) : null}
    </View>
  );
}
