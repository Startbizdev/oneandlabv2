import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { BookingPremiumStepCta } from '@/features/appointments/form/components/BookingPremiumStepCta';
import { spacing } from '@/theme';

interface Props {
  href: Href;
  label?: string;
}

const DEFAULT_LABEL = 'Nouveau rendez-vous';

function AppointmentsBookCtaComponent({ href, label = DEFAULT_LABEL }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_components_AppointmentsBookCta_tsx_AppointmentsBookCtaComponent_styles');

  const router = useRouter();

  const onPress = useCallback(() => {
    router.push(href);
  }, [href, router]);

  return (
    <View style={styles.wrap}>
      <BookingPremiumStepCta
        variant="list"
        showStepBadge={false}
        title={label}
        leadingIcon={<CalendarPlus size={18} color={c.primary} strokeWidth={2.25} />}
        onPress={onPress}
      />
    </View>
  );
}

export const AppointmentsBookCta = React.memo(AppointmentsBookCtaComponent);

function buildStyles(c: AppColors) {
  return {
  wrap: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
};
}
