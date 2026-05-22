import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Mail, Shield } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { LoginFlow } from '@/features/auth/components/LoginFlow';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type LoginStep = 'email' | 'otp';

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
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');

  const subtitle = useMemo(() => {
    if (step === 'otp') return `Code envoyé à ${email}`;
    return 'Recevez un code sécurisé par email';
  }, [step, email]);

  const headerIcon =
    step === 'otp' ? (
      <Shield size={20} color={colors.primary} strokeWidth={2} />
    ) : (
      <Mail size={20} color={colors.primary} strokeWidth={2} />
    );

  function handleClose() {
    setStep('email');
    setEmail('');
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Connexion"
      subtitle={subtitle}
      headerIcon={headerIcon}
      footer={
        onRegisterPress ? (
          <Pressable onPress={onRegisterPress} style={styles.footerLink}>
            <Text style={styles.footerText}>
              Pas encore de compte ?{' '}
              <Text style={styles.footerAccent}>Créer un compte</Text>
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      <LoginFlow
        onSuccess={onSuccess}
        onEmailNotFound={onEmailNotFound}
        onStepChange={(s, mail) => {
          setStep(s);
          if (mail) setEmail(mail);
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footerLink: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  footerText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  footerAccent: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
