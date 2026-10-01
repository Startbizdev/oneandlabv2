import { useEffect, useState } from 'react';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { enableBiometricLogin } from '@/lib/biometric-auth';
import { useAuthStore } from '@/store/auth-store';
import { useBiometricOfferStore } from '@/features/auth/utils/offer-biometric-enrollment';

/** Feuille « Activer Face ID ? » proposée après connexion ou en fin d'onboarding. */
export function BiometricEnrollmentOfferHost() {
  const offer = useBiometricOfferStore((s) => s.offer);
  const setOffer = useBiometricOfferStore((s) => s.setOffer);
  const token = useAuthStore((s) => s.token);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!token) setOffer(null);
  }, [token, setOffer]);

  if (!offer) return null;

  const decline = () => {
    setOffer(null);
    offer.onDone();
  };

  const accept = async () => {
    setEnabling(true);
    const result = await enableBiometricLogin(offer.token, offer.user);
    setEnabling(false);
    if (!result.ok && !result.cancelled && result.message) {
      offer.onError?.(result.message);
    }
    setOffer(null);
    offer.onDone();
  };

  return (
    <ConfirmSheet
      visible
      tone="primary"
      title={`Activer ${offer.label} ?`}
      message="Reconnectez-vous en un instant, sans code e-mail, sur cet appareil."
      confirmLabel="Activer"
      cancelLabel="Plus tard"
      loading={enabling}
      onConfirm={() => void accept()}
      onClose={decline}
    />
  );
}
