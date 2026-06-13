import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { LabResultListItem } from '@oneandlab/shared-types';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { LabResultsFeed } from '@/features/lab-results/components/LabResultsFeed';
import { openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import {
  EMPTY_RDV_IMAGE,
  EMPTY_RDV_IMAGE_HEIGHT,
  EMPTY_RDV_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
import { fetchLabResults } from '../api/lab-results.service';
import { spacing } from '@/theme';

type RoleMode = 'patient' | 'nurse' | 'pro';

interface Props {
  role: RoleMode;
  rolePrefix: '/(patient)' | '/(nurse)' | '/(pro)';
}

export function LabResultsScreen({ role, rolePrefix }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_lab_results_screens_LabResultsScreen_tsx_LabResultsScreen_styles');

  const router = useRouter();
  const { show: toast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const resultsQ = useQuery({
    queryKey: queryKeys.labResults.list(debouncedSearch.trim()),
    queryFn: async () => {
      const res = await fetchLabResults(debouncedSearch.trim());
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data.items ?? [];
    },
  });

  const emptyCopy = useMemo(() => {
    if (role === 'patient') {
      return {
        title: 'Aucun résultat',
        description:
          'Vos résultats d’analyses apparaîtront ici dès que le laboratoire les aura déposés.',
      };
    }
    return {
      title: 'Aucun résultat',
      description: 'Les résultats déposés par les laboratoires pour vos patients s’afficheront ici.',
    };
  }, [role]);

  const handleOpenDocument = useCallback(
    async (item: LabResultListItem) => {
      const id = item.medical_document_id ?? item.id;
      setOpeningId(id);
      const res = await openMedicalDocument(id, item.file_name ?? undefined);
      setOpeningId(null);
      if (res.ok) {
        toast('Document ouvert', { type: 'success' });
      } else {
        toast(res.error ?? 'Ouverture impossible', { type: 'error' });
      }
    },
    [toast],
  );

  const openAppointment = useCallback(
    (appointmentId: string) => {
      router.push(`${rolePrefix}/appointment/${appointmentId}?segment=documents` as never);
    },
    [rolePrefix, router],
  );

  const items = resultsQ.data ?? [];
  const isSearching = debouncedSearch.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <AppointmentsListFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Rechercher un patient, une analyse…"
          embedded
        />
      </View>

      {resultsQ.isLoading && !resultsQ.data ? (
        <View style={styles.loading}>
          <SkeletonList count={5} itemHeight={88} gap={10} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            imageSource={EMPTY_RDV_IMAGE}
            imageWidth={EMPTY_RDV_IMAGE_WIDTH}
            imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
            title={isSearching ? 'Aucun résultat trouvé' : emptyCopy.title}
            description={
              isSearching
                ? 'Essayez un autre mot-clé (patient, type d’analyse, fichier…).'
                : emptyCopy.description
            }
          />
        </View>
      ) : (
        <LabResultsFeed
          items={items}
          role={role}
          openingId={openingId}
          refreshing={resultsQ.isRefetching}
          onRefresh={() => void resultsQ.refetch()}
          onOpenDocument={handleOpenDocument}
          onOpenAppointment={openAppointment}
        />
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  searchWrap: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  loading: { paddingHorizontal: spacing[4] },
  empty: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing[4],
    justifyContent: 'center' as const,
  },
};
}
