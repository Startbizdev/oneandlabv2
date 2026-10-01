import { View } from 'react-native';
import { MessageCircle, Phone } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { buildPhoneContactActions } from '@/utils/contact-actions';
import { useAppColors } from '@/theme/use-app-colors';
import { ICON_STROKE_WIDTH, spacing, iconSize, AppText, useStyles } from '@/theme';

type Props = {
  name: string;
  seed: string;
  profileImageUrl?: string | null;
  gender?: string | null;
  phone?: string | null;
};

const CONTACT_ICONS = { phone: Phone, message: MessageCircle } as const;

export function PassagePatientHeader({ name, seed, profileImageUrl, gender, phone }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const contacts = buildPhoneContactActions(phone);

  return (
    <View style={styles.row}>
      <ProfileAvatar profileImageUrl={profileImageUrl} seed={seed} gender={gender} size={iconSize['3xl']} />
      <AppText variant="headline" style={styles.name}>
        {name}
      </AppText>
      {contacts.map((action) => {
        const Icon = CONTACT_ICONS[action.icon];
        return (
          <IconActionButton key={action.key} label={action.label} variant="muted" onPress={action.onPress}>
            <Icon size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </IconActionButton>
        );
      })}
    </View>
  );
}

function buildStyles() {
  return {
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[3],
      minWidth: 0,
    },
    name: { flex: 1, minWidth: 0 },
  };
}
