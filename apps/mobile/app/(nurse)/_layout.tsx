import { Fragment } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OfferQueueHost } from '@/features/appointments/components/OfferQueueHost';
import { useGlobalOfferPolling } from '@/features/appointments/hooks/use-global-offer-polling';
import { bookingWizardScreenOptions, onboardingScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';
import { useStyles, useTheme, type Theme } from '@/theme';

export default function NurseLayout() {
  const theme = useTheme();
  const styles = useStyles(buildStyles);
  useGlobalOfferPolling();

  return (
    <Fragment>
    <View style={styles.stackHost}>
    <Stack screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={onboardingScreenOptions(theme)} />
      <Stack.Screen name="appointment/[id]/care-photo/[photoId]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="appointment/[id]/exchange" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="appointment/[id]/prescription" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="appointment/[id]/documents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="passage/[seriesId]/documents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="appointments/new" options={bookingWizardScreenOptions(theme)} />
      <Stack.Screen name="ai" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="commandes-pharmacie/[id]/ordonnances" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="commandes-pharmacie/[id]/messages" options={{ animation: 'slide_from_right' }} />
    </Stack>
    </View>
    <OfferQueueHost />
    </Fragment>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    stackHost: { flex: 1, backgroundColor: c.background },
  };
}
