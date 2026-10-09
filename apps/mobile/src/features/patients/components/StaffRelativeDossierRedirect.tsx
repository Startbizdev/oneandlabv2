import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { fetchPatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { queryKeys } from '@/lib/query-keys';
import { staffPatientHref } from '@/navigation/role-hrefs';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles } from '@/theme';

type Props = {
  rolePrefix: StaffRoutePrefix;
  holderId: string;
  relativeId: string;
};

/** Fiche titulaire ouverte pour un proche (ancien lien) : bascule sur le dossier du proche, jamais sur le titulaire. */
export function StaffRelativeDossierRedirect({ rolePrefix, holderId, relativeId }: Props) {
  const styles = useStyles(buildStyles);
  const relativeQ = useQuery({
    queryKey: queryKeys.patients.relative(holderId, relativeId),
    queryFn: async () => {
      const res = await fetchPatientRelative(relativeId, holderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Proche introuvable');
      return res.data;
    },
    enabled: Boolean(holderId),
  });

  const profileId = relativeQ.data?.profile_id?.trim();
  if (profileId) return <Redirect href={staffPatientHref(rolePrefix, profileId)} />;

  return (
    <StackChromeScreen>
      {relativeQ.isError ? (
        <View style={styles.state}>
          <ErrorState title="Proche introuvable" error={relativeQ.error} onRetry={() => void relativeQ.refetch()} />
        </View>
      ) : relativeQ.data || !holderId ? (
        <View style={styles.state}>
          <EmptyState illustration="error" title="Dossier du proche pas encore disponible" />
        </View>
      ) : (
        <SkeletonProfileScreen cards={2} />
      )}
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    state: { flex: 1, minWidth: 0, justifyContent: 'center' as const, paddingHorizontal: spacing[4] },
  };
}
