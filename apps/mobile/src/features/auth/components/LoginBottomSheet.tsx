import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
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

function sheetSubtitle({ step, email }: LoginFlowMeta): string | undefined {
  switch (step) {
    case 'password':
      return email || undefined;
    case 'otp':
      return email ? `Code envoyé à ${email}` : undefined;
    case 'forgot-sent':
      return 'Consultez votre boîte e-mail';
    default:
      return undefined;
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
    <SheetModal
      visible={visible}
      onClose={handleClose}
      title={sheetTitle(meta)}
      subtitle={sheetSubtitle(meta)}
    >
      <View style={styles.content}>
        <LoginFlow onSuccess={onSuccess} onEmailNotFound={onEmailNotFound} onMetaChange={setMeta} />
        {showRegister ? (
          <Pressable onPress={onRegisterPress} style={styles.registerLink} accessibilityRole="button">
            <AppText variant="secondary" style={styles.registerText}>
              Pas encore de compte ? <AppText style={styles.registerAccent}>Créer un compte</AppText>
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
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
    registerText: { textAlign: 'center' as const },
    registerAccent: { ...font.semiBold, color: c.textLink },
  };
}
