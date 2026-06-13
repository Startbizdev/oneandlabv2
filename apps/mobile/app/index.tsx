import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { useAppColors } from '@/theme/use-app-colors';

export default function Index() {
  const c = useAppColors();
  const { token, user, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  if (!token) return <Redirect href="/(auth)/welcome" />;
  if (user?.role && isMobileRole(user.role)) return <Redirect href={getRoleHome(user.role)} />;
  return <Redirect href="/(auth)/welcome" />;
}
