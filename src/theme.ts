import type { ColorScheme } from '../shared/types';

/**
 * Paleta compartida por pantallas. Los nombres históricos (`white`, `deepNight`, `textOnDark*`)
 * se mantienen para no reescribir toda la UI: en modo claro, `white` es el texto principal oscuro.
 */
export interface AppPalette {
  electricBlue: string;
  chipValueBlue: string;
  deepNight: string;
  surfaceDark: string;
  brandBlue: string;
  bgRoot: string;
  white: string;
  gray500: string;
  gray600: string;
  gray700: string;
  gray800: string;
  /** Placeholders de `TextInput` sobre `surfaceDark` / fondos oscuros (no usar `gray800` en oscuro). */
  inputPlaceholder: string;
  textOnDarkSecondary: string;
  textOnDarkMuted: string;
  success: string;
  borderSubtle: string;
  borderMuted: string;
  borderStrong: string;
  divider: string;
  hairlineDot: string;
  fillSoft: string;
  fillMedium: string;
  overlayModal: string;
  overlayBlocking: string;
  mapCollapseBorder: string;
  /** Botones cuadrado/flotante sobre el mapa (atrás, perfil, ayuda). */
  mapHudFloatingBg: string;
  mapHudFloatingBorder: string;
  /** Barra tipo pill («Cerrar mapa») sobre el mapa. */
  mapHudBarBg: string;
  langChipSelectedBg: string;
  onPrimary: string;
  mapMarkerLabelBg: string;
  mapSharedMarkerBorder: string;
}

export const darkPalette: AppPalette = {
  electricBlue: '#3070F0',
  chipValueBlue: '#93C5FD',
  deepNight: '#0B0E14',
  surfaceDark: '#161B22',
  brandBlue: '#38BDF8',
  bgRoot: '#020617',
  white: '#F8FAFC',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  inputPlaceholder: '#94A3B8',
  textOnDarkSecondary: '#CBD5E1',
  textOnDarkMuted: '#94A3B8',
  success: '#10B981',
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderMuted: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.06)',
  hairlineDot: 'rgba(255,255,255,0.05)',
  fillSoft: 'rgba(255,255,255,0.05)',
  fillMedium: 'rgba(255,255,255,0.1)',
  overlayModal: 'rgba(0,0,0,0.6)',
  overlayBlocking: 'rgba(10,14,26,0.72)',
  mapCollapseBorder: 'rgba(255,255,255,0.18)',
  mapHudFloatingBg: 'rgba(22,27,34,0.9)',
  mapHudFloatingBorder: 'rgba(255,255,255,0.1)',
  mapHudBarBg: 'rgba(11,14,20,0.94)',
  langChipSelectedBg: 'rgba(48,112,240,0.12)',
  onPrimary: '#FFFFFF',
  mapMarkerLabelBg: 'rgba(11,14,20,0.9)',
  mapSharedMarkerBorder: 'rgba(255,255,255,0.85)',
};

export const lightPalette: AppPalette = {
  electricBlue: '#1D4ED8',
  chipValueBlue: '#1E40AF',
  deepNight: '#FFFFFF',
  surfaceDark: '#F1F5F9',
  brandBlue: '#0369A1',
  bgRoot: '#CBD5E1',
  white: '#020617',
  gray500: '#475569',
  gray600: '#334155',
  gray700: '#1E293B',
  gray800: '#64748B',
  inputPlaceholder: '#475569',
  textOnDarkSecondary: '#1E293B',
  textOnDarkMuted: '#475569',
  success: '#047857',
  borderSubtle: 'rgba(15,23,42,0.12)',
  borderMuted: 'rgba(15,23,42,0.18)',
  borderStrong: 'rgba(15,23,42,0.26)',
  divider: 'rgba(15,23,42,0.14)',
  hairlineDot: 'rgba(15,23,42,0.14)',
  fillSoft: 'rgba(15,23,42,0.06)',
  fillMedium: 'rgba(15,23,42,0.12)',
  overlayModal: 'rgba(15,23,42,0.5)',
  overlayBlocking: 'rgba(241,245,249,0.94)',
  mapCollapseBorder: 'rgba(15,23,42,0.22)',
  mapHudFloatingBg: 'rgba(255,255,255,0.97)',
  mapHudFloatingBorder: 'rgba(15,23,42,0.18)',
  mapHudBarBg: 'rgba(255,255,255,0.97)',
  langChipSelectedBg: 'rgba(37,99,235,0.14)',
  onPrimary: '#FFFFFF',
  mapMarkerLabelBg: 'rgba(255,255,255,0.97)',
  mapSharedMarkerBorder: 'rgba(15,23,42,0.35)',
};

export function paletteFor(scheme: ColorScheme): AppPalette {
  return scheme === 'light' ? lightPalette : darkPalette;
}

/** Compatibilidad con imports estáticos y tests; preferir `useAppTheme()` en pantallas. */
export const theme = darkPalette;
