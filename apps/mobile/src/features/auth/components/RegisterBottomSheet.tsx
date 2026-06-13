import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { HeartPulse, Mail, Stethoscope, User, type LucideIcon } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoreMenuSection } from '@/features/profile/components/MoreMenuSection';
import type { MoreMenuItemProps } from '@/features/profile/components/MoreMenuItem';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const REGISTER_ROLE_META: {
  role: RegisterRole;
  label: string;
  icon: LucideIcon;
  accent: 'primary' | 'success' | 'warning';
}[] = [
  { role: 'patient', label: 'Patient', icon: User, accent: 'primary' },
  { role: 'nurse', label: 'Infirmier(ère)', icon: HeartPulse, accent: 'success' },
  { role: 'pro', label: 'Professionnel de santé', icon: Stethoscope, accent: 'warning' },
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
  const styles = useThemedStyles(buildStyles, 'features_auth_components_RegisterBottomSheet_tsx_styles');
  const hasEmail = Boolean(pendingEmail?.trim());

  const roleItems: MoreMenuItemProps[] = REGISTER_ROLE_META.map((item) => {
    const ic = roleIconColors(c, item.accent);
    return {
      icon: item.icon,
      label: item.label,
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
      subtitle="Choisissez le profil qui correspond à votre situation"
    >
      <View style={styles.body}>
        {hasEmail ? (
          <Cluster
            gap={spacing[3]}
            align="start"
            leading={<Mail size={16} color={c.primary} strokeWidth={2} />}
            style={styles.emailBanner}
          >
            <View style={styles.emailTextCol}>
              <Text style={styles.emailLabel}>Aucun compte trouvé pour</Text>
              <Text style={styles.emailValue} numberOfLines={2}>
                {pendingEmail}
              </Text>
            </View>
          </Cluster>
        ) : null}

        <MoreMenuSection title="Profil" items={roleItems} />

        {onLoginPress ? (
          <Pressable onPress={onLoginPress} style={styles.loginLink} hitSlop={8}>
            <Text style={styles.loginText}>
              Déjà un compte ?{' '}
              <Text style={styles.loginAccent}>Se connecter</Text>
            </Text>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
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
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  emailValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  loginLink: {
    alignItems: 'center' as const,
    paddingTop: spacing[1],
    paddingBottom: spacing[1],
  },
  loginText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
  },
  loginAccent: {
    fontFamily: fontFamily.bold,
    color: c.primary,
  },
};
}

