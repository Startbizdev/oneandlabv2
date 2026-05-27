import { Fragment } from 'react';
import { Stack } from 'expo-router';
import { OfferQueueHost } from '@/features/appointments/components/OfferQueueHost';
import { useGlobalOfferPolling } from '@/features/appointments/hooks/use-global-offer-polling';
import { notificationsScreenOptions } from '@/navigation/notifications-screen-options';
import { bookingWizardScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';

export default function NurseLayout() {
  useGlobalOfferPolling();

  return (
    <Fragment>
    <Stack screenOptions={stackHeaderOptions()}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="appointment/[id]" options={{ title: 'Détail du rendez-vous' }} />
      <Stack.Screen
        name="appointment/[id]/care-photo/[photoId]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen name="appointment/[id]/edit" options={{ title: 'Reprendre le RDV' }} />
      <Stack.Screen name="reviews" options={{ title: 'Mes avis' }} />
      <Stack.Screen name="abonnement" options={{ headerTitleAlign: 'left' }} />
      <Stack.Screen name="informations-legales" options={{ headerTitleAlign: 'left' }} />
      <Stack.Screen name="web" options={{ headerTitleAlign: 'left' }} />
      <Stack.Screen name="prescriptions" options={{ title: 'Prescriptions' }} />
      <Stack.Screen name="appointments/new" options={bookingWizardScreenOptions()} />
      <Stack.Screen name="patient/[id]" options={{ title: 'Patient' }} />
      <Stack.Screen name="patient/[id]/history" options={{ title: 'Historique' }} />
      <Stack.Screen name="patient/[id]/documents" options={{ headerTitleAlign: 'left' }} />
      <Stack.Screen name="notifications" options={notificationsScreenOptions()} />
    </Stack>
    <OfferQueueHost detailPathPrefix="/(nurse)/appointment" />
    </Fragment>
  );
}
