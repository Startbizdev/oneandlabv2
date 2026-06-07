import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import { radius, spacing } from '@/theme';
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

function buildStyles(c: AppColors) {
  return {
  wrap: {
    paddingRight: HEADER_ACTION_MARGIN_RIGHT,
    paddingLeft: spacing[1],
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    minHeight: 44,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  btnPressed: {
    opacity: 0.88,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_notifications_components_NotificationsReadAllAction_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
