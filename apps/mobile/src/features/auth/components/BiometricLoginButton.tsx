import { iconSize } from '@/theme';
import { useCallback, useEffect, useState } from 'react';
import { ScanFace } from 'lucide-react-native';
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
import { Button } from '@/components/ui/Button';

interface Props {
  onSuccess: () => void;
}

export function BiometricLoginButton({ onSuccess }: Props) {
  const setSession = useAuthStore((s) => s.setSession);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const { show: toast } = useToast();
  const [available, setAvailable] = useState(false);
  const [label, setLabel] = useState('Face ID');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const ok = await canUseBiometricLogin();
      setAvailable(ok);
      if (ok) setLabel(await getBiometricLabel());
    })();
  }, []);

  const signIn = useCallback(async () => {
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
          setAvailable(false);
          toast('Face ID à réactiver', {
            message:
              'Connectez-vous par email, puis réactivez Face ID dans Profil > Sécurité.',
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
        setAvailable(false);
        await useAuthStore.getState().clearSession();
        toast('Session expirée', {
          message: 'Connectez-vous avec votre email, puis réactivez Face ID si besoin.',
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
  }, [fetchMe, onSuccess, setSession, toast]);

  if (!available) return null;

  return (
    <Button
      title={`Connexion ${label}`}
      size="lg"
      fullWidth
      loading={loading}
      onPress={() => void signIn()}
      leftIcon={<ScanFace size={iconSize.md} color="#FFFFFF" strokeWidth={2} />}
    />
  );
}
