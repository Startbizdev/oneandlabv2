import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HeartPulse, Mail, Stethoscope, User } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { RegisterRoleCard } from '@/features/auth/components/RegisterRoleCard';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const ROLES: {
  role: RegisterRole;
  label: string;
  description: string;
  Icon: typeof User;
  accentColor: string;
  accentBg: string;
}[] = [
  {
    role: 'patient',
    label: 'Patient',
    description: 'Réserver des soins ou des prélèvements à domicile pour vous ou vos proches.',
    Icon: User,
    accentColor: colors.primary,
    accentBg: colors.primaryLight,
  },
  {
    role: 'nurse',
    label: 'Infirmier · Infirmière',
    description: 'Rejoindre le réseau Cary et gérer vos interventions à domicile.',
    Icon: HeartPulse,
    accentColor: '#0D9488',
    accentBg: '#CCFBF1',
  },
  {
    role: 'pro',
    label: 'Pro de santé',
    description: 'Médecin, sage-femme, pharmacien ou autre professionnel prescripteur.',
    Icon: Stethoscope,
    accentColor: '#D97706',
    accentBg: '#FFFBEB',
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Créer un compte"
      subtitle="Choisissez le profil qui correspond à votre situation"
      footer={
        onLoginPress ? (
          <Pressable onPress={onLoginPress} style={styles.loginLink} hitSlop={8}>
            <Text style={styles.loginText}>
              Déjà un compte ?{' '}
              <Text style={styles.loginAccent}>Se connecter</Text>
            </Text>
          </Pressable>
        ) : undefined
      }
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

        <View style={styles.list}>
          {ROLES.map((item) => (
            <RegisterRoleCard
              key={item.role}
              label={item.label}
              description={item.description}
              Icon={item.Icon}
              accentColor={item.accentColor}
              accentBg={item.accentBg}
              onPress={() => onSelectRole(item.role)}
            />
          ))}
        </View>
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
  list: {
    width: '100%',
    gap: spacing[3],
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  loginText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  loginAccent: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
});
