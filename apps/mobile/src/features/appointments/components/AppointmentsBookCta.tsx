import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { BookingPremiumStepCta } from '@/features/appointments/form/components/BookingPremiumStepCta';
import { colors, spacing } from '@/theme';

interface Props {
  href: Href;
  label?: string;
}

const DEFAULT_LABEL = 'Nouveau rendez-vous';

function AppointmentsBookCtaComponent({ href, label = DEFAULT_LABEL }: Props) {
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
        leadingIcon={<CalendarPlus size={18} color={colors.primary} strokeWidth={2.25} />}
        onPress={onPress}
      />
    </View>
  );
}

export const AppointmentsBookCta = React.memo(AppointmentsBookCtaComponent);

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
});
