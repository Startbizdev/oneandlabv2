import { iconSize, useAppColors } from '@/theme';
import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import {
  canUseBiometricLogin,
  disableBiometricLogin,
  getBiometricLabel,
  loginWithBiometric,
  refreshBiometricCredentials,
} from '@/lib/biometric-auth';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { useToast } from '@/providers/ToastProvider';
import { showAppNotAccessibleAlert } from '@/lib/auth/mobile-access';
import { PROFILE_SECURITY_MENU } from '@/features/profile/constants/profile-security-menu';
import { Button } from '@/components/ui/Button';

interface Props {
  onSuccess: () => void;
}

/** Bouton secondaire : la connexion par e-mail reste l'action principale de l'accueil. */
export function BiometricLoginButton({ onSuccess }: Props) {
  const c = useAppColors();
  const setSession = useAuthStore((s) => s.setSession);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  /** Libellé plateforme (Face ID, Touch ID, Empreinte digitale…) ; null tant que la biométrie est indisponible. */
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!(await canUseBiometricLogin())) return;
      setLabel(await getBiometricLabel());
    })();
  }, []);

  const signIn = useCallback(async () => {
    if (!label) return;
    setLoading(true);
    try {
      const result = await loginWithBiometric();

      if (!result.ok) {
        if (result.reason === 'cancelled') return;
        if (result.reason === 'auth_failed') {
          toast('Connexion impossible', {
            message: result.message ?? 'Réessayez ou connectez-vous par email.',
            type: 'error',
          });
          return;
        }
        if (result.reason === 'missing_credentials') {
          setLabel(null);
          toast(`${label} à réactiver`, {
            message: `Connectez-vous par email, puis réactivez ${label} dans « ${PROFILE_SECURITY_MENU.label} » depuis votre profil.`,
            type: 'error',
          });
          return;
        }
        toast('Connexion impossible', {
          message: 'Utilisez votre email et un code.',
          type: 'error',
        });
        return;
      }

      await setSession(result.token, result.user);
      const me = await fetchMe();
      if (!me) {
        await disableBiometricLogin();
        setLabel(null);
        await useAuthStore.getState().clearSession();
        toast('Session expirée', {
          message: `Connectez-vous avec votre email, puis réactivez ${label} si besoin.`,
          type: 'error',
        });
        return;
      }

      const sessionToken = useAuthStore.getState().token;
      if (sessionToken) {
        await refreshBiometricCredentials(sessionToken, me);
      }

      const role = me.role ?? result.user.role;
      if (!role || !isMobileRole(role)) {
        await useAuthStore.getState().clearSession();
        showAppNotAccessibleAlert(role);
        return;
      }
      onSuccess();
    } catch {
      toast('Connexion impossible', {
        message: 'Réessayez ou connectez-vous par email.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchMe, label, onSuccess, setSession, toast]);

  if (!label) return null;

  const Icon = label === 'Touch ID' || label === 'Empreinte digitale' ? Fingerprint : ScanFace;

  return (
    <Button
      title={`Connexion avec ${label}`}
      variant="secondary"
      size="lg"
      fullWidth
      loading={loading}
      onPress={() => void signIn()}
      leftIcon={<Icon size={iconSize.md} color={c.textLink} strokeWidth={2} />}
    />
  );
}
