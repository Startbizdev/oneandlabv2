import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Mail, MessageCircle, Navigation, Phone } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type ContactAction = {
  key: string;
  label: string;
  onPress: () => void;
  icon?: 'phone' | 'message' | 'email' | 'waze';
};

const ICONS = {
  phone: Phone,
  message: MessageCircle,
  email: Mail,
  waze: Navigation,
} as const;

export function ContactActionBar({ actions }: { actions: ContactAction[] }) {
  if (!actions.length) return null;
  return (
    <View style={styles.wrap}>
      {actions.map((a) => {
        const Icon = ICONS[a.icon ?? 'phone'];
        return (
          <Pressable key={a.key} onPress={a.onPress} style={styles.btn}>
            <Icon size={16} color={colors.primary} strokeWidth={2.25} />
            <Text style={styles.label}>{a.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
});
