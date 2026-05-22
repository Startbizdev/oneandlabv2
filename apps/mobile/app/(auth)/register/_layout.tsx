import { Stack } from 'expo-router';
import { REGISTER_META } from '@/features/auth/constants/register-meta';
import { ProfileStackBackButton } from '@/navigation/ProfileStackBackButton';
import { registerHeaderTitle } from '@/navigation/RegisterHeaderTitle';
import { stackHeaderOptions } from '@/navigation/screen-options';

const patient = REGISTER_META.patient;
const nurse = REGISTER_META.nurse;
const pro = REGISTER_META.pro;

export default function RegisterLayout() {
  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions(),
        headerShown: true,
        headerLeft: () => <ProfileStackBackButton />,
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
      <Stack.Screen name="merci" options={{ title: 'Confirmation', headerShown: false }} />
    </Stack>
  );
}
