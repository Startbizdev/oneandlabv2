import { useCallback, useEffect, useState } from 'react';

/** Délai avant de pouvoir redemander un code (le backend limite à 15 demandes / 15 min par IP). */
export const OTP_RESEND_DELAY_SECONDS = 60;

export function useResendCountdown(delaySeconds = OTP_RESEND_DELAY_SECONDS) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const restart = useCallback(() => setRemaining(delaySeconds), [delaySeconds]);
  const reset = useCallback(() => setRemaining(0), []);

  return { remaining, restart, reset };
}
