import { View } from 'react-native';
import { Stack } from 'expo-router';
import { bookingWizardScreenOptions, onboardingScreenOptions, stackHeaderOptions } from '@/navigation/screen-options';
import { useStyles, useTheme, type Theme } from '@/theme';

export default function ProLayout() {
  const theme = useTheme();
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.stackHost}>
      <Stack screenOptions={stackHeaderOptions(theme)}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={onboardingScreenOptions(theme)} />
        <Stack.Screen name="appointment/[id]/care-photo/[photoId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="appointment/[id]/exchange" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="appointment/[id]/prescription" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="appointments/new" options={bookingWizardScreenOptions(theme)} />
        <Stack.Screen name="ai" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="commandes-pharmacie/[id]/ordonnances" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="commandes-recues/[id]/ordonnances" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    stackHost: { flex: 1, backgroundColor: c.background },
  };
}
