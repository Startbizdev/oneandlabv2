import { Image, StyleSheet } from 'react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { DetailEntityRow } from '@/components/ui/DetailEntityRow';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { colors, radius } from '@/theme';

interface Props {
  title: string;
  name: string;
  profileImageUrl?: string | null;
  gender?: string | null;
  phone?: string;
  subtitle?: string;
  publicSlug?: string | null;
  onViewProfile?: () => void;
  brandLogo?: 'cary';
  showDivider?: boolean;
}

export function AssigneeProfileRow({
  title,
  name,
  profileImageUrl,
  gender,
  phone,
  subtitle,
  publicSlug,
  onViewProfile,
  brandLogo,
  showDivider = true,
}: Props) {
  const slug = publicSlug?.trim();
  const hasProfile = Boolean(slug && onViewProfile);

  const leading =
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
        size={36}
        style={styles.avatar}
      />
    );

  return (
    <DetailEntityRow
      eyebrow={title}
      title={name}
      subtitle={subtitle}
      leading={leading}
      contactActions={buildPhoneContactActions(phone)}
      onProfilePress={hasProfile ? onViewProfile : undefined}
      profileAccessibilityLabel={`Voir le profil de ${name}`}
      showDivider={showDivider}
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    resizeMode: 'contain',
  },
});
