import { AppText, useStyles, font, type Theme } from '@/theme';
import { View } from 'react-native';
import type { ReactElement } from 'react';
import { bookingCareSelectionTitle } from '../utils/booking-wizard-titles';

interface Props {
  role?: string;
  embedded?: boolean;
}

export function BookingCareSelectionHeaderTitle({ role, embedded }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View style={embedded ? styles.wrapEmbedded : styles.wrap}>
      <AppText
        style={styles.title}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        accessibilityRole="header"
      >
        {bookingCareSelectionTitle(role)}
      </AppText>
    </View>
  );
}

export function bookingCareSelectionHeaderTitle(role?: string): () => ReactElement {
  return () => <BookingCareSelectionHeaderTitle role={role} />;
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
      ...font.heading,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      letterSpacing: -0.35,
      lineHeight: fontSize.lg * 1.2,
    },
  };
}
