import { useEffect, useState } from 'react';
import { getBiometricLabel } from '@/lib/biometric-auth';

/** Libellé natif (Face ID, Touch ID, Empreinte digitale…). */
export function useBiometricLabel(fallback = 'Biométrie'): string {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    void getBiometricLabel().then(setLabel);
  }, []);

  return label;
}
