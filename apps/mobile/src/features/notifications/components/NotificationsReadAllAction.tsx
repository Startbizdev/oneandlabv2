import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { ActivityIndicator, Pressable, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { CheckCheck } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { HEADER_ACTION_MARGIN_RIGHT } from '@/navigation/HeaderActionButton';

interface Props {
  onPress: () => void;
  loading?: boolean;
}

export function NotificationsReadAllAction({
  onPress, loading }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_notifications_components_NotificationsReadAllAction_tsx_styles');
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
          <ActivityIndicator size="small" color={c.primary} />
        ) : (
          <Row gap={spacing[1.5]} align="center">
            <CheckCheck size={iconSize.xs} color={c.primary} strokeWidth={2.2} />
            <AppText style={styles.label}>Tout lu</AppText>
          </Row>
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

