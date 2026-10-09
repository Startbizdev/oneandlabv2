import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LabResultListItem } from '@oneandlab/shared-types';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { LabResultsFeed } from '@/features/lab-results/components/LabResultsFeed';
import { useLabResultsInfinite } from '@/features/lab-results/hooks/use-lab-results-infinite';
import { openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useToast } from '@/providers/ToastProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentDocumentsHref } from '@/navigation/role-hrefs';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { H_PADDING, spacing, useStyles, type Theme } from '@/theme';

type RoleMode = 'patient' | 'nurse' | 'pro';

interface Props {
  role: RoleMode;
  rolePrefix: '/(patient)' | '/(nurse)' | '/(pro)';
}

export function LabResultsScreen({ role, rolePrefix }: Props) {
  const styles = useStyles(buildStyles);

  const router = useRouter();
  const { show: toast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const resultsQ = useLabResultsInfinite(debouncedSearch.trim());

  const handleOpenDocument = useCallback(
    async (item: LabResultListItem) => {
      const id = item.medical_document_id ?? item.id;
      setOpeningId(id);
      try {
        const res = await openMedicalDocument(id, item.file_name ?? undefined);
        if (!res.ok) toast(res.error ?? 'Ouverture impossible', { type: 'error' });
      } catch (error) {
        console.warn('[lab-results] ouverture du document impossible', error);
        toast('Ouverture impossible', { type: 'error' });
      } finally {
        setOpeningId(null);
      }
    },
    [toast],
  );

  const openAppointment = useCallback(
    (appointmentId: string) => {
      router.push(appointmentDocumentsHref(rolePrefix, appointmentId));
    },
    [rolePrefix, router],
  );

  const askCaryAboutResult = useCallback(
    (item: LabResultListItem) => {
      router.push(
        buildAiDeepLink(role, {
          conversation_type: 'lab_results',
          lab_result_id: item.medical_document_id ?? item.id,
          patient_id: item.patient_id ?? undefined,
        }),
      );
    },
    [role, router],
  );

  const items = useMemo(() => resultsQ.data?.pages.flatMap((p) => p.items) ?? [], [resultsQ.data]);
  const total = resultsQ.data?.pages[0]?.pagination.total ?? items.length;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = resultsQ;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const isSearching = debouncedSearch.trim().length > 0;
  const showSearch = search.trim().length > 0 || items.length > 0;
  const { refreshing, onRefresh } = useManualRefresh(() => resultsQ.refetch());

  return (
    <StackChromeScreen>
      <View style={styles.container}>
        {showSearch ? (
          <View style={styles.searchWrap}>
            <AppointmentsListFilterBar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={
                role === 'patient' ? 'Rechercher une analyse…' : 'Rechercher un patient, une analyse…'
              }
              embedded
            />
          </View>
        ) : null}

        {resultsQ.isLoading && !resultsQ.data ? (
          <View style={styles.loading}>
            <SkeletonList count={5} itemHeight={88} gap={spacing[3]} />
          </View>
        ) : resultsQ.isError && !resultsQ.data ? (
          <View style={styles.empty}>
            <ErrorState
              title="Résultats indisponibles"
              error={resultsQ.error}
              onRetry={() => void resultsQ.refetch()}
            />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            {isSearching ? (
              <EmptyState
                illustration="search"
                title="Aucun résultat"
                description="Essayez un autre mot-clé."
              />
            ) : (
              <EmptyState
                illustration="results"
                title="Aucun résultat d’analyse"
                description="Ils s’affichent ici dès que le laboratoire les partage."
              />
            )}
          </View>
        ) : (
          <LabResultsFeed
            items={items}
            total={total}
            role={role}
            loadingMore={isFetchingNextPage}
            onEndReached={loadMore}
            openingId={openingId}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenDocument={handleOpenDocument}
            onOpenAppointment={openAppointment}
            onAskCary={askCaryAboutResult}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  searchWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  loading: { paddingHorizontal: H_PADDING, paddingTop: spacing[2] },
  empty: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: H_PADDING,
    justifyContent: 'center' as const,
  },
  listContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
};
}
