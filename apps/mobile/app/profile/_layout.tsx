import { Stack } from 'expo-router';
import { stackHeaderOptions } from '@/navigation/screen-options';
import { useTheme } from '@/theme';

export default function ProfileLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={stackHeaderOptions(theme)}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
