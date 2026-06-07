import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CalendarPlus } from 'lucide-react-native';
import { BookingPremiumStepCta } from '@/features/appointments/form/components/BookingPremiumStepCta';
import { colors, spacing } from '@/theme';

interface Props {
  href: Href;
  label?: string;
  subtitle?: string;
}

const DEFAULT_SUBTITLE = 'NOUVEAU RENDEZ-VOUS';

export function AppointmentsBookCta({
  href,
  label = 'Prendre un rendez-vous',
  subtitle = DEFAULT_SUBTITLE,
}: Props) {
  const router = useRouter();

  const onPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(href);
  }, [href, router]);

  return (
    <View style={styles.wrap}>
      <BookingPremiumStepCta
        showStepBadge={false}
        title={label}
        subtitle={subtitle}
        leadingIcon={<CalendarPlus size={20} color={colors.primary} strokeWidth={2.5} />}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
});
