import { Pressable, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { REGISTER_META } from '@/features/auth/constants/register-meta';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

const REGISTER_ROLES: RegisterRole[] = ['patient', 'nurse', 'pro'];

interface Props {
  visible: boolean;
  onClose: () => void;
  pendingEmail?: string;
  onSelectRole: (role: RegisterRole) => void;
  onLoginPress?: () => void;
}

export function RegisterBottomSheet({
  visible,
  onClose,
  pendingEmail,
  onSelectRole,
  onLoginPress,
}: Props) {
  const styles = useStyles(buildStyles);
  const email = pendingEmail?.trim() ?? '';

  const roleItems: SettingsRowProps[] = REGISTER_ROLES.map((role) => {
    const meta = REGISTER_META[role];
    return {
      icon: meta.Icon,
      label: meta.headerTitle,
      description: meta.headerSubtitle,
      onPress: () => onSelectRole(role),
    };
  });

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Créer un compte"
      subtitle={email ? `Aucun compte pour ${email}` : 'Qui êtes-vous ?'}
    >
      <View style={styles.body}>
        <SettingsSection items={roleItems} />

        <AppText variant="caption" style={styles.note}>
          Préleveur ? Votre laboratoire crée votre accès : connectez-vous avec l&apos;e-mail qu&apos;il a
          enregistré.
        </AppText>

        {onLoginPress ? (
          <Pressable onPress={onLoginPress} style={styles.loginLink} accessibilityRole="button">
            <AppText variant="secondary" style={styles.centered}>
              Déjà un compte ? <AppText style={styles.loginAccent}>Se connecter</AppText>
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    body: { width: '100%' as const, gap: spacing[4] },
    note: { paddingHorizontal: spacing[1] },
    centered: { textAlign: 'center' as const },
    loginLink: {
      minHeight: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    loginAccent: { ...font.semiBold, color: c.textLink },
  };
}
