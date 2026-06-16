import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { patientFolderHeaderTitle } from '@/navigation/PatientFolderHeaderTitle';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { fetchPatientProfile } from '../api/patient-profile.service';
import { SkeletonList } from '@/components/ui/skeletons';
import { spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

export function StaffPatientDocumentsScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_patients_screens_StaffPatientDocumentsScreen_tsx_styles');
  const { id } = useLocalSearchParams<{ id: string }>();
  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, styles.content);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientProfile(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });

  const patientFullName = useMemo(() => {
    if (!profileQ.data) return undefined;
    const n = `${profileQ.data.first_name ?? ''} ${profileQ.data.last_name ?? ''}`.trim();
    return n || undefined;
  }, [profileQ.data]);

  const screenOptions = useMemo(
    () => ({
      headerTitle: patientFolderHeaderTitle(patientFullName),
      headerTitleAlign: 'left' as const,
    }),
    [patientFullName],
  );

  if (profileQ.isLoading && !profileQ.data) {
    return (
      <StackChromeScreen>
        <Stack.Screen options={screenOptions} />
        <View style={styles.loading}>
          <SkeletonList count={3} itemHeight={56} gap={10} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        {...spreadTabSceneScrollProps(scrollConfig)}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching}
            onRefresh={() => void profileQ.refetch()}
            tintColor={c.primary}
            progressViewOffset={scrollConfig.refreshProgressOffset}
          />
        }
      >
        {id ? <ProfileDocumentsPremiumPanel patientUserId={id} /> : null}
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    screen: { minWidth: 0, flex: 1, backgroundColor: c.background },
    loading: { minWidth: 0, flex: 1, padding: spacing[4] },
    content: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[10],
      flexGrow: 1,
      width: '100%' as const,
    },
  };
}
