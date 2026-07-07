import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Image, StyleSheet, View } from 'react-native';
import { MessageCircle, Phone, User } from 'lucide-react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { Button } from '@/components/ui/Button';
import { CompactAssigneeRating } from '@/features/appointments/detail/components/CompactAssigneeRating';
import type { AssigneeReviewSummary } from '@/features/appointments/detail/utils/assignee-review-display';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_AssigneeProfileRow_tsx_AssigneeProfileRow_styles');

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
      <Cluster
        gap={spacing[3]}
        align="start"
        leading={<View style={styles.avatarWrap}>{avatar}</View>}
      >
        <View style={styles.meta}>
          <AppText style={styles.name} numberOfLines={2}>
            {name}
          </AppText>
          <AppText style={styles.role} numberOfLines={1}>
            {title}
          </AppText>

          <CompactAssigneeRating summary={reviewSummary} />

          {subtitle ? (
            <AppText style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </Cluster>

      {onViewProfile || contactActions.length > 0 ? (
        <Row wrap gap={spacing[1.5]} style={styles.actionsRow}>
          {onViewProfile ? (
            <Button
              title="Voir le profil"
              variant="muted"
              size="sm"
              leftIcon={<User size={iconSize.xs} color={c.textSecondary} strokeWidth={2.25} />}
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
                leftIcon={<Icon size={iconSize.xs} color={c.textSecondary} strokeWidth={2.25} />}
                onPress={action.onPress}
                style={styles.actionButton}
              />
            );
          })}
        </Row>
      ) : null}

      {showDivider ? <View style={styles.divider} /> : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  block: {
    paddingVertical: spacing[2.5],
    gap: spacing[2],
  },
  avatarWrap: {
    flexShrink: 0,
    paddingTop: 1,
  },
  meta: {
    gap: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.2,
  },
  role: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.25,
  },
  subtitle: {
    marginTop: spacing[0.5],
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.45,
  },
  actionsRow: {
    width: '100%' as const,
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
    borderColor: c.borderLight,
    borderRadius: radius.full,
  },
  logo: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
    resizeMode: 'contain' as const,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.borderLight,
    marginTop: spacing[1],
  },
};
}
