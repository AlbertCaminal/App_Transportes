import { useCallback, useEffect, useRef, useState } from 'react';
import type { PackagePhysicalSpec } from '../../shared/types';
import { formatPackageSpecsLine } from '../utils/packageSpecsFormat';

const SCAN_PHASE_MS = 2500;
const RESULT_HOLD_MS = 1500;

type ScanId = string | 'express';

function randomSpecs(): PackagePhysicalSpec {
  const r = Math.random;
  const lengthCm = 30 + Math.floor(r() * 100);
  const widthCm = 20 + Math.floor(r() * 80);
  const heightCm = 15 + Math.floor(r() * 60);
  const weightKg = Math.round((2 + r() * 48) * 10) / 10;
  return { lengthCm, widthCm, heightCm, weightKg };
}

/**
 * Simula escaneo IA con timeouts cancelables al desmontar o al iniciar otro escaneo.
 */
export function useAiScanFlow(
  onExpressSpecs: (s: PackagePhysicalSpec) => void,
  onPackageSpecs: (id: string, s: PackagePhysicalSpec) => void,
  onHidePrice: () => void
) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ specs: PackagePhysicalSpec; label: string } | null>(null);
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
        const detected = randomSpecs();

        if (id === 'express') {
          onExpressSpecs(detected);
        } else {
          onPackageSpecs(id, detected);
        }

        setScanResult({
          specs: detected,
          label: `${formatPackageSpecsLine(detected)} detectadas`,
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
    [clearTimers, onExpressSpecs, onPackageSpecs, onHidePrice]
  );

  return { isScanning, scanResult, handleAIScan };
}
