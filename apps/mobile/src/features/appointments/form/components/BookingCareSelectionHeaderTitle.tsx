import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Text, View } from 'react-native';
import type { ReactElement } from 'react';
import { bookingCareSelectionTitle } from '../utils/booking-wizard-titles';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  role?: string;
  embedded?: boolean;
}

export function BookingCareSelectionHeaderTitle({ role, embedded }: Props) {
  const styles = useThemedStyles(buildStyles, 'BookingCareSelectionHeaderTitle');
  return (
    <View style={embedded ? styles.wrapEmbedded : styles.wrap}>
      <Text
        style={styles.title}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        accessibilityRole="header"
      >
        {bookingCareSelectionTitle(role)}
      </Text>
    </View>
  );
}

export function bookingCareSelectionHeaderTitle(role?: string): () => ReactElement {
  return () => <BookingCareSelectionHeaderTitle role={role} />;
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
    },
    wrapEmbedded: {
      width: '100%' as const,
    },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      letterSpacing: -0.35,
      lineHeight: fontSize.lg * 1.2,
    },
  };
}
