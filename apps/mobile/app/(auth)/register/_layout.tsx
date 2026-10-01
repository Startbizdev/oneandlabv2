import { Stack } from 'expo-router';
import { REGISTER_META } from '@/features/auth/constants/register-meta';
import { registerHeaderTitle } from '@/navigation/RegisterHeaderTitle';
import { stackHeaderOptions } from '@/navigation/screen-options';
import { STACK_HEADER_CATALOG } from '@/navigation/stack-header-catalog';
import { useTheme } from '@/theme';

const patient = REGISTER_META.patient;
const nurse = REGISTER_META.nurse;
const pro = REGISTER_META.pro;

export default function RegisterLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions(theme),
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="patient"
        options={{
          headerTitle: registerHeaderTitle(patient.headerTitle, patient.headerSubtitle, patient.Icon),
        }}
      />
      <Stack.Screen
        name="nurse"
        options={{
          headerTitle: registerHeaderTitle(nurse.headerTitle, nurse.headerSubtitle, nurse.Icon),
        }}
      />
      <Stack.Screen
        name="pro"
        options={{
          headerTitle: registerHeaderTitle(pro.headerTitle, pro.headerSubtitle, pro.Icon),
        }}
      />
      <Stack.Screen name="merci" options={{ title: STACK_HEADER_CATALOG.merci.title, headerShown: false }} />
    </Stack>
  );
}
