import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { LoginFlow, type LoginFlowMeta } from '@/features/auth/components/LoginFlow';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEmailNotFound?: (email: string) => void;
  onRegisterPress?: () => void;
}

const INITIAL_META: LoginFlowMeta = { step: 'email', email: '' };

function sheetTitle({ step }: LoginFlowMeta): string {
  return step === 'forgot' || step === 'forgot-sent' ? 'Mot de passe oublié' : 'Connexion';
}

function sheetSubtitle({ step, email }: LoginFlowMeta): string {
  switch (step) {
    case 'password':
      return email ? `Mot de passe du compte ${email}` : 'Entrez votre mot de passe Cary';
    case 'otp':
      return email ? `Code envoyé à ${email}` : 'Saisissez le code reçu par e-mail';
    case 'forgot':
      return 'Nous vous enverrons les instructions';
    case 'forgot-sent':
      return 'Consultez votre boîte e-mail';
    default:
      return 'Saisissez votre e-mail pour continuer';
  }
}

export function LoginBottomSheet({
  visible,
  onClose,
  onSuccess,
  onEmailNotFound,
  onRegisterPress,
}: Props) {
  const styles = useStyles(buildStyles);
  const [meta, setMeta] = useState<LoginFlowMeta>(INITIAL_META);

  function handleClose() {
    setMeta(INITIAL_META);
    onClose();
  }

  const showRegister = onRegisterPress && meta.step === 'email';

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={sheetTitle(meta)}
      subtitle={sheetSubtitle(meta)}
      disableScroll
    >
      <View style={styles.content}>
        <LoginFlow onSuccess={onSuccess} onEmailNotFound={onEmailNotFound} onMetaChange={setMeta} />
        {showRegister ? (
          <Pressable onPress={onRegisterPress} style={styles.registerLink} accessibilityRole="button">
            <AppText style={styles.registerText}>
              Pas encore de compte ?{' '}
              <AppText style={styles.registerAccent}>Créer un compte</AppText>
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    content: {
      width: '100%' as const,
      gap: spacing[4],
    },
    registerLink: {
      minHeight: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    registerText: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
    registerAccent: {
      ...font.bold,
      color: c.primary,
    },
  };
}
