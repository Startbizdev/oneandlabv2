import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ContactActionBar, type ContactAction } from './layout/ContactActionBar';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  name: string;
  profileImageUrl?: string | null;
  gender?: string | null;
  phone?: string;
  subtitle?: string;
  publicSlug?: string | null;
  onViewProfile?: () => void;
}

function phoneActions(phone?: string): ContactAction[] {
  const tel = String(phone ?? '').trim().replace(/\s/g, '');
  if (!tel) return [];
  return [
    {
      key: 'phone',
      label: 'Appeler',
      icon: 'phone',
      onPress: () => void Linking.openURL(`tel:${tel}`),
    },
    {
      key: 'sms',
      label: 'Message',
      icon: 'message',
      onPress: () => void Linking.openURL(`sms:${tel}`),
    },
  ];
}

const AVATAR = 40;

export function AssigneeProfileRow({
  title,
  name,
  profileImageUrl,
  gender,
  phone,
  subtitle,
  publicSlug,
  onViewProfile,
}: Props) {
  const actions = phoneActions(phone);
  const slug = publicSlug?.trim();

  return (
    <View style={styles.wrap}>
      <Text style={styles.rowTitle}>{title}</Text>
      <View style={styles.row}>
        <ProfileAvatar
          profileImageUrl={profileImageUrl}
          seed={name}
          gender={gender}
          size={AVATAR}
          style={styles.avatarClip}
        />
        <View style={styles.body}>
          <Text style={styles.name}>{name}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          {actions.length > 0 ? <ContactActionBar actions={actions} /> : null}
          {slug && onViewProfile ? (
            <Pressable onPress={onViewProfile} hitSlop={8}>
              <Text style={styles.profileLink}>Voir le profil</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  rowTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
  },
  avatarClip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    gap: spacing[2],
    minWidth: 0,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  profileLink: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
});
