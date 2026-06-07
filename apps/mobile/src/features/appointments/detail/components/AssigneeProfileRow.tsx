import { Image, StyleSheet, Text, View } from 'react-native';
import { MessageCircle, Phone, User } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import { CompactAssigneeRating } from '@/features/appointments/detail/components/CompactAssigneeRating';
import type { AssigneeReviewSummary } from '@/features/appointments/detail/utils/assignee-review-display';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  /** Titre du poste (ex. Infirmier(e), Laboratoire). */
  title: string;
  name: string;
  profileImageUrl?: string | null;
  gender?: string | null;
  phone?: string;
  subtitle?: string;
  reviewSummary?: AssigneeReviewSummary | null;
  onViewProfile?: () => void;
  brandLogo?: 'cary';
  showDivider?: boolean;
}

const CONTACT_ICONS = {
  phone: Phone,
  message: MessageCircle,
} as const;

const AVATAR_SIZE = 40;

/** Carte profil compacte : identité → poste → lien profil → avis → contacts. */
export function AssigneeProfileRow({
  title,
  name,
  profileImageUrl,
  gender,
  phone,
  subtitle,
  reviewSummary,
  onViewProfile,
  brandLogo,
  showDivider = true,
}: Props) {
  const contactActions = buildPhoneContactActions(phone);

  const avatar =
    brandLogo === 'cary' ? (
      <Image
        source={require('../../../../../assets/logo-cary.png')}
        style={styles.logo}
        accessibilityLabel="Cary"
      />
    ) : (
      <ProfileAvatar
        profileImageUrl={profileImageUrl}
        seed={name}
        gender={gender}
        size={AVATAR_SIZE}
        style={styles.avatar}
      />
    );

  return (
    <View style={styles.block}>
      <View style={styles.profileRow}>
        <View style={styles.avatarWrap}>{avatar}</View>

        <View style={styles.meta}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {title}
          </Text>

          <CompactAssigneeRating summary={reviewSummary} />

          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {onViewProfile || contactActions.length > 0 ? (
        <View style={styles.actionsRow}>
          {onViewProfile ? (
            <Button
              title="Voir le profil"
              variant="muted"
              size="sm"
              leftIcon={<User size={13} color={colors.textSecondary} strokeWidth={2.25} />}
              onPress={onViewProfile}
              style={styles.actionButton}
              accessibilityLabel={`Voir le profil de ${name}`}
            />
          ) : null}
          {contactActions.map((action) => {
            const Icon = CONTACT_ICONS[action.icon];
            return (
              <Button
                key={action.key}
                title={action.label}
                variant="muted"
                size="sm"
                leftIcon={<Icon size={13} color={colors.textSecondary} strokeWidth={2.25} />}
                onPress={action.onPress}
                style={styles.actionButton}
              />
            );
          })}
        </View>
      ) : null}

      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingVertical: spacing[2.5],
    gap: spacing[2],
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  avatarWrap: {
    flexShrink: 0,
    paddingTop: 1,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.2,
  },
  role: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.25,
  },
  subtitle: {
    marginTop: spacing[0.5],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    width: '100%',
  },
  actionButton: {
    flex: 1,
    minWidth: 92,
    minHeight: 36,
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[2],
  },
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
  },
  logo: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    resizeMode: 'contain',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
    marginTop: spacing[1],
  },
});
