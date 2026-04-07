import { useCallback, useEffect, useRef, useState } from 'react';
import type { PackageSize } from '../../shared/types';

const SCAN_PHASE_MS = 2500;
const RESULT_HOLD_MS = 1500;

type ScanId = string | 'express';

/**
 * Simula escaneo IA con timeouts cancelables al desmontar o al iniciar otro escaneo.
 */
export function useAiScanFlow(
  onExpressSize: (s: PackageSize) => void,
  onPackageSize: (id: string, s: PackageSize) => void,
  onHidePrice: () => void
) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ size: PackageSize; label: string } | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const handleAIScan = useCallback(
    (id: ScanId) => {
      clearTimers();
      setIsScanning(true);

      const t1 = setTimeout(() => {
        const sizes: PackageSize[] = ['XS', 'S', 'M', 'H'];
        const detectedSize = sizes[Math.floor(Math.random() * sizes.length)];

        if (id === 'express') {
          onExpressSize(detectedSize);
        } else {
          onPackageSize(id, detectedSize);
        }

        setScanResult({
          size: detectedSize,
          label: `Medida [${detectedSize}] detectada con éxito`,
        });

        const t2 = setTimeout(() => {
          setIsScanning(false);
          setScanResult(null);
          onHidePrice();
        }, RESULT_HOLD_MS);
        timersRef.current.push(t2);
      }, SCAN_PHASE_MS);
      timersRef.current.push(t1);
    },
    [clearTimers, onExpressSize, onPackageSize, onHidePrice]
  );

  return { isScanning, scanResult, handleAIScan };
}
