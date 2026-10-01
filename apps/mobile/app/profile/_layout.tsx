import { Stack } from 'expo-router';
import { stackHeaderOptions } from '@/navigation/screen-options';
import { useTheme } from '@/theme';
import { StackSceneInsetLayout } from '@/navigation/StackSceneInsetLayout';

export default function ProfileLayout() {
  const theme = useTheme();
  return (
    <StackSceneInsetLayout>
      <Stack screenOptions={stackHeaderOptions(theme)}>
        <Stack.Screen name="index" />
      </Stack>
    </StackSceneInsetLayout>
  );
}
