import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { HeartPulse, Mail, Stethoscope, User, type LucideIcon } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { REGISTER_META } from '@/features/auth/constants/register-meta';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const REGISTER_ROLE_META: {
  role: RegisterRole;
  icon: LucideIcon;
  accent: 'primary' | 'success' | 'warning';
}[] = [
  { role: 'patient', icon: User, accent: 'primary' },
  { role: 'nurse', icon: HeartPulse, accent: 'success' },
  { role: 'pro', icon: Stethoscope, accent: 'warning' },
];

function roleIconColors(c: AppColors, accent: 'primary' | 'success' | 'warning') {
  switch (accent) {
    case 'success':
      return { iconColor: c.success, iconBg: c.successLight };
    case 'warning':
      return { iconColor: c.warning, iconBg: c.warningLight };
    default:
      return { iconColor: c.primary, iconBg: c.primaryLight };
  }
}

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
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const hasEmail = Boolean(pendingEmail?.trim());

  const roleItems: SettingsRowProps[] = REGISTER_ROLE_META.map((item) => {
    const ic = roleIconColors(c, item.accent);
    const meta = REGISTER_META[item.role];
    return {
      icon: item.icon,
      label: meta.headerTitle,
      description: meta.headerSubtitle,
      iconColor: ic.iconColor,
      iconBg: ic.iconBg,
      onPress: () => onSelectRole(item.role),
    };
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Créer un compte"
      subtitle="Qui êtes-vous ?"
      disableScroll
    >
      <View style={styles.body}>
        {hasEmail ? (
          <Cluster
            gap={spacing[3]}
            align="start"
            leading={<Mail size={iconSize.sm} color={c.primary} strokeWidth={2} />}
            style={styles.emailBanner}
          >
            <View style={styles.emailTextCol}>
              <AppText style={styles.emailLabel}>Aucun compte pour</AppText>
              <AppText style={styles.emailValue} numberOfLines={2}>
                {pendingEmail}
              </AppText>
            </View>
          </Cluster>
        ) : null}

        <SettingsSection title="Je suis…" items={roleItems} />

        <AppText style={styles.preleveurNote}>
          Préleveur ? Votre accès est créé par votre laboratoire : connectez-vous avec l&apos;e-mail
          qu&apos;il a enregistré.
        </AppText>

        {onLoginPress ? (
          <Pressable onPress={onLoginPress} style={styles.loginLink} accessibilityRole="button">
            <AppText style={styles.loginText}>
              Déjà un compte ?{' '}
              <AppText style={styles.loginAccent}>Se connecter</AppText>
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  body: {
    width: '100%' as const,
    gap: spacing[4],
  },
  emailBanner: {
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  emailTextCol: {
    gap: 2,
  },
  emailLabel: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  emailValue: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  preleveurNote: {
    ...font.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
    color: c.textTertiary,
    paddingHorizontal: spacing[1],
  },
  loginLink: {
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  loginText: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  loginAccent: {
    ...font.bold,
    color: c.primary,
  },
};
}

