import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { HEADER_ACTION_MARGIN_RIGHT } from '@/navigation/HeaderActionButton';

interface Props {
  onPress: () => void;
  loading?: boolean;
}

export function NotificationsReadAllAction({ onPress, loading }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Tout marquer comme lu"
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <CheckCheck size={15} color={colors.primary} strokeWidth={2.2} />
            <Text style={styles.label}>Tout lu</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingRight: HEADER_ACTION_MARGIN_RIGHT,
    paddingLeft: spacing[1],
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 7,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  btnPressed: {
    opacity: 0.88,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
});
