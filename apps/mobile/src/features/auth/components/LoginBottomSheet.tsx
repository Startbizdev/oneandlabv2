import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { LoginFlow, type LoginFlowMeta } from '@/features/auth/components/LoginFlow';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEmailNotFound?: (email: string) => void;
  onRegisterPress?: () => void;
}

export function LoginBottomSheet({
  visible,
  onClose,
  onSuccess,
  onEmailNotFound,
  onRegisterPress,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_auth_components_LoginBottomSheet_tsx_styles');
  const [meta, setMeta] = useState<LoginFlowMeta>({
    mode: 'code',
    step: 'email',
    email: '',
    passwordView: 'login',
  });

  const isForgot = meta.mode === 'password' && meta.passwordView !== 'login';

  const title = useMemo(() => {
    if (isForgot) return 'Mot de passe oublié';
    return 'Connexion';
  }, [isForgot]);

  const subtitle = useMemo(() => {
    if (meta.passwordView === 'forgot-sent') return 'Consultez votre email';
    if (meta.passwordView === 'forgot') return 'Nous vous enverrons les instructions';
    if (meta.mode === 'password') return 'Entrez votre mot de passe Cary';
    if (meta.step === 'otp') return meta.email ? `Code envoyé à ${meta.email}` : 'Saisissez le code reçu';
    return 'Recevez un code sécurisé par email';
  }, [meta]);

  function handleClose() {
    setMeta({ mode: 'code', step: 'email', email: '', passwordView: 'login' });
    onClose();
  }

  const showRegister = onRegisterPress && meta.mode === 'code' && meta.step === 'email';

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={title} subtitle={subtitle} disableScroll>
      <View style={styles.content}>
        <LoginFlow onSuccess={onSuccess} onEmailNotFound={onEmailNotFound} onMetaChange={setMeta} />
        {showRegister ? (
          <Pressable onPress={onRegisterPress} style={styles.registerLink} hitSlop={8}>
            <Text style={styles.registerText}>
              Pas encore de compte ?{' '}
              <Text style={styles.registerAccent}>Créer un compte</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    content: {
      width: '100%' as const,
      gap: spacing[4],
    },
    registerLink: {
      alignItems: 'center' as const,
      paddingTop: spacing[1],
    },
    registerText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
    registerAccent: {
      fontFamily: fontFamily.bold,
      color: c.primary,
    },
  };
}

