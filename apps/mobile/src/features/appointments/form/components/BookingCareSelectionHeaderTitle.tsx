import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { Text, View } from 'react-native';
import type { ReactElement } from 'react';
import { bookingCareSelectionTitle } from '../utils/booking-wizard-titles';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  role?: string;
  embedded?: boolean;
}

export function BookingCareSelectionHeaderTitle({ role, embedded }: Props) {
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
      fontSize: fontSize.xl,
      color: c.textPrimary,
      letterSpacing: -0.45,
      lineHeight: fontSize.xl * 1.15,
    },
  };
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles(
        'features_appointments_form_components_BookingCareSelectionHeaderTitle_tsx_styles',
        buildStyles,
      )[prop];
    }
    return undefined;
  },
});
