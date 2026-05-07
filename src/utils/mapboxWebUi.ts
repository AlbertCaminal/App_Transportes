import { StyleSheet } from 'react-native';
import type { AppPalette } from '../theme';

/** Estilos compartidos: panel ETA, loading y viñeta (mapas cliente + transportista web). */
export function createWebMapOverlayStyleSheet(theme: AppPalette) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    loading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.deepNight}59`,
      zIndex: 50,
    },
    vignette: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '35%',
      backgroundColor: theme.deepNight,
      opacity: 0.45,
      zIndex: 5,
    },
    etaChip: {
      position: 'absolute',
      zIndex: 55,
      borderRadius: 16,
      backgroundColor: theme.surfaceDark,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      gap: 8,
      maxWidth: 340,
    },
    etaTitle: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: '800',
      color: theme.white,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    etaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      minHeight: 22,
    },
    etaLabel: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '600',
      color: theme.textOnDarkSecondary,
      flex: 1,
      paddingRight: 6,
    },
    etaValue: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '800',
      color: theme.chipValueBlue,
      flexShrink: 0,
      textAlign: 'right',
    },
    etaFootnote: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: '500',
      color: theme.textOnDarkMuted,
      marginTop: 4,
    },
  });
}

export function computeWebEtaChipLayout(
  winW: number,
  insetsBottom: number,
  bottomChromeInsetPx: number,
  /** Positivo sube el chip; negativo lo baja (cabecera densa en transportista). */
  etaChipBottomAdjustPx = 0
): {
  bottom: number;
  left: number;
  width: number;
  paddingVertical: number;
  paddingHorizontal: number;
} {
  const safeBottom = Math.max(12, insetsBottom + 6) + bottomChromeInsetPx + etaChipBottomAdjustPx;
  const gutter = winW < 360 ? 10 : winW < 600 ? 14 : 20;
  const maxChip = Math.min(340, winW - gutter * 2);
  const left = Math.max(gutter, (winW - maxChip) / 2);
  const compact = winW < 400;
  return {
    bottom: safeBottom,
    left,
    width: maxChip,
    paddingVertical: compact ? 10 : 12,
    paddingHorizontal: compact ? 12 : 14,
  };
}

/** Origen (punto sólido); modo programado añade insignia 📅. */
export function webOriginMarkerEl(isProgrammed: boolean, t: AppPalette): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  if (isProgrammed) {
    const badge = document.createElement('div');
    badge.style.marginBottom = '6px';
    badge.style.padding = '6px';
    badge.style.borderRadius = '10px';
    badge.style.background = t.electricBlue;
    badge.style.border = `1px solid ${t.borderStrong}`;
    badge.textContent = '📅';
    badge.style.fontSize = '14px';
    wrap.appendChild(badge);
  }
  const dot = document.createElement('div');
  dot.style.width = '20px';
  dot.style.height = '20px';
  dot.style.borderRadius = '10px';
  dot.style.background = t.onPrimary;
  dot.style.border = `3px solid ${t.electricBlue}`;
  wrap.appendChild(dot);
  return wrap;
}

/** Etiqueta de parada / destino (anillo + texto). */
export function webParadaLabelMarkerEl(label: string, t: AppPalette): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  const ring = document.createElement('div');
  ring.style.width = '18px';
  ring.style.height = '18px';
  ring.style.borderRadius = '9px';
  ring.style.border = `2px solid ${t.brandBlue}`;
  const cap = document.createElement('div');
  cap.style.marginTop = '6px';
  cap.style.padding = '5px 11px';
  cap.style.borderRadius = '9px';
  cap.style.background = t.mapMarkerLabelBg;
  cap.style.border = `1px solid ${t.borderStrong}`;
  cap.style.fontSize = '10px';
  cap.style.fontWeight = '900';
  cap.style.color = t.brandBlue;
  cap.style.textTransform = 'uppercase';
  cap.style.letterSpacing = '0.05em';
  cap.style.fontFamily = 'system-ui, sans-serif';
  cap.textContent = label;
  wrap.appendChild(ring);
  wrap.appendChild(cap);
  return wrap;
}

/**
 * Marcador «transportista» (pill verde + icono camión). `topLabel` = p. ej. «Transportista» o «Tú».
 */
export function webCarrierTruckMarkerEl(topLabel: string, t: AppPalette): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.width = 'max-content';
  wrap.style.maxWidth = 'none';
  wrap.style.overflow = 'visible';
  const cap = document.createElement('div');
  cap.style.maxWidth = 'none';
  cap.style.overflow = 'visible';
  cap.style.textOverflow = 'clip';
  cap.style.padding = '7px 12px';
  cap.style.borderRadius = '12px';
  cap.style.background = 'rgba(34,197,94,0.92)';
  cap.style.border = `1px solid ${t.borderStrong}`;
  cap.style.fontSize = '12px';
  cap.style.fontWeight = '900';
  cap.style.color = t.white;
  cap.style.fontFamily = 'system-ui, sans-serif';
  cap.style.whiteSpace = 'nowrap';
  cap.textContent = topLabel;
  const dot = document.createElement('div');
  dot.style.marginTop = '6px';
  dot.style.width = '40px';
  dot.style.height = '40px';
  dot.style.borderRadius = '14px';
  dot.style.background = t.electricBlue;
  dot.style.border = `2px solid ${t.onPrimary}`;
  dot.style.alignItems = 'center';
  dot.style.justifyContent = 'center';
  dot.style.display = 'flex';
  dot.style.fontSize = '20px';
  dot.textContent = '🚚';
  wrap.appendChild(cap);
  wrap.appendChild(dot);
  return wrap;
}
