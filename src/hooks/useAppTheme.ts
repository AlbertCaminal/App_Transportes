import { useAppStore } from '../store/appStore';
import { paletteFor } from '../theme';

export function useAppTheme() {
  return paletteFor(useAppStore((s) => s.colorScheme));
}
