import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HeartPulse, Mail, Stethoscope, User, type LucideIcon } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoreMenuSection } from '@/features/profile/components/MoreMenuSection';
import type { MoreMenuItemProps } from '@/features/profile/components/MoreMenuItem';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const REGISTER_ROLES: {
  role: RegisterRole;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}[] = [
  {
    role: 'patient',
    label: 'Patient',
    icon: User,
    iconColor: colors.primary,
    iconBg: colors.primaryLight,
  },
  {
    role: 'nurse',
    label: 'Infirmier(ère)',
    icon: HeartPulse,
    iconColor: '#0D9488',
    iconBg: '#CCFBF1',
  },
  {
    role: 'pro',
    label: 'Professionnel de santé',
    icon: Stethoscope,
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
  },
];

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
  const hasEmail = Boolean(pendingEmail?.trim());

  const roleItems: MoreMenuItemProps[] = REGISTER_ROLES.map((item) => ({
    icon: item.icon,
    label: item.label,
    iconColor: item.iconColor,
    iconBg: item.iconBg,
    onPress: () => onSelectRole(item.role),
  }));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Créer un compte"
      subtitle="Choisissez le profil qui correspond à votre situation"
    >
      <View style={styles.body}>
        {hasEmail ? (
          <View style={styles.emailBanner}>
            <Mail size={16} color={colors.primary} strokeWidth={2} />
            <View style={styles.emailTextCol}>
              <Text style={styles.emailLabel}>Aucun compte trouvé pour</Text>
              <Text style={styles.emailValue} numberOfLines={2}>
                {pendingEmail}
              </Text>
            </View>
          </View>
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

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: spacing[4],
  },
  emailBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  emailTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  emailLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emailValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  loginLink: {
    alignItems: 'center',
    paddingTop: spacing[1],
    paddingBottom: spacing[1],
  },
  loginText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loginAccent: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
