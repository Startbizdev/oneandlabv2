import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';

export default function Index() {
  const { token, user, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator color="#1CC7B5" size="large" />
      </View>
    );
  }

  if (!token) return <Redirect href="/(auth)/welcome" />;
  if (user?.role && isMobileRole(user.role)) return <Redirect href={getRoleHome(user.role)} />;
  return <Redirect href="/(auth)/welcome" />;
}
