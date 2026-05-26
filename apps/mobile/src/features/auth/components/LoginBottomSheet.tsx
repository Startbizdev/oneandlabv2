import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    >
      <View style={styles.content}>
        <LoginFlow
          onSuccess={onSuccess}
          onEmailNotFound={onEmailNotFound}
          onStepChange={(s, mail) => {
            setStep(s);
            if (mail) setEmail(mail);
          }}
        />
        {onRegisterPress && step === 'email' ? (
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

const styles = StyleSheet.create({
  content: {
    width: '100%',
    gap: spacing[4],
  },
  registerLink: {
    alignItems: 'center',
    paddingTop: spacing[1],
  },
  registerText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  registerAccent: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
