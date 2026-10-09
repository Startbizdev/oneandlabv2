import { useAppColors } from '@/theme/use-app-colors';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { BookingPremiumStepCta } from '@/features/appointments/form/components/BookingPremiumStepCta';
import { ICON_STROKE_WIDTH, spacing, iconSize, useStyles, type Theme } from '@/theme';

interface Props {
  href: Href;
  label?: string;
  /** Sans marge verticale — espacement géré par le parent (`gap`). */
  flush?: boolean;
}

const DEFAULT_LABEL = 'Nouveau rendez-vous';

function AppointmentsBookCtaComponent({ href, label = DEFAULT_LABEL, flush = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const router = useRouter();

  const onPress = () => router.push(href);

  return (
    <View style={[styles.wrap, flush && styles.wrapFlush]}>
      <BookingPremiumStepCta
        variant="list"
        showStepBadge={false}
        title={label}
        leadingIcon={<CalendarPlus size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
        onPress={onPress}
      />
    </View>
  );
}

export const AppointmentsBookCta = React.memo(AppointmentsBookCtaComponent);

function buildStyles({ colors: c }: Theme) {
  return {
  wrap: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  wrapFlush: {
    marginTop: 0,
    marginBottom: 0,
  },
};
}
