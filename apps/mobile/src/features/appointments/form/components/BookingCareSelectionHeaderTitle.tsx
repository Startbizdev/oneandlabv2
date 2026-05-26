import { StyleSheet, Text, View } from 'react-native';
import type { ReactElement } from 'react';
import { BOOKING_CARE_SELECTION_TITLE } from '../utils/booking-wizard-titles';
import { colors } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function BookingCareSelectionHeaderTitle() {
  return (
    <View style={styles.wrap}>
      <Text
        style={styles.title}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        accessibilityRole="header"
      >
        {BOOKING_CARE_SELECTION_TITLE}
      </Text>
    </View>
  );
}

export function bookingCareSelectionHeaderTitle(): () => ReactElement {
  return () => <BookingCareSelectionHeaderTitle />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    letterSpacing: -0.35,
  },
});
