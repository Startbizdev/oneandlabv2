import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { FlaskConical } from 'lucide-react-native';
import type { LabResultListItem } from '@oneandlab/shared-types';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { DocumentDownloadButton } from '@/features/documents/components/DocumentDownloadButton';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import { downloadMedicalDocument } from '@/lib/downloads/download-medical-document';
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
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

type RoleMode = 'patient' | 'nurse' | 'pro';

interface Props {
  role: RoleMode;
  rolePrefix: '/(patient)' | '/(nurse)' | '/(pro)';
}

function patientName(item: LabResultListItem): string {
  const n = `${item.patient_first_name ?? ''} ${item.patient_last_name ?? ''}`.trim();
  return n || 'Patient';
}

function formatSubtitle(item: LabResultListItem, role: RoleMode): string {
  const parts: string[] = [];
  if (role !== 'patient') {
    parts.push(patientName(item));
  }
  if (item.category_name) {
    parts.push(item.category_name);
  }
  const date = item.appointment_scheduled_at ?? item.created_at;
  if (date) {
    const d = dayjs(date);
    if (d.isValid()) {
      parts.push(`RDV ${d.format('D MMM YYYY')}`);
    }
  }
  if (item.file_name?.trim()) {
    const raw = item.file_name.trim();
    parts.push(raw.length > 28 ? `${raw.slice(0, 25)}…` : raw);
  }
  return parts.join(' · ') || 'Résultats PDF';
}

function ResultRow({
  item,
  role,
  downloading,
  downloaded,
  onDownload,
  onOpenAppointment,
}: {
  item: LabResultListItem;
  role: RoleMode;
  downloading: boolean;
  downloaded: boolean;
  onDownload: () => void;
  onOpenAppointment: () => void;
}) {
  return (
    <Pressable
      onPress={onOpenAppointment}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={styles.iconWrap}>
        <FlaskConical size={18} color={colors.primary} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Résultats d&apos;analyses</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {formatSubtitle(item, role)}
        </Text>
      </View>
      <DocumentDownloadButton
        downloaded={downloaded}
        downloading={downloading}
        onPress={onDownload}
        accessibilityLabel="Télécharger les résultats"
      />
    </Pressable>
  );
}

export function LabResultsScreen({ role, rolePrefix }: Props) {
  const router = useRouter();
  const { show: toast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { isDownloaded, markDownloaded } = useDownloadedDocumentIds(`lab-results:${role}`);

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

  const handleDownload = useCallback(
    async (item: LabResultListItem) => {
      const id = item.medical_document_id ?? item.id;
      setDownloadingId(id);
      const res = await downloadMedicalDocument(id, item.file_name ?? undefined);
      setDownloadingId(null);
      if (res.ok) {
        await markDownloaded(id);
        toast('Document prêt à enregistrer', { type: 'success' });
      } else {
        toast(res.error ?? 'Téléchargement impossible', { type: 'error' });
      }
    },
    [markDownloaded, toast],
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
          <SkeletonList count={5} itemHeight={72} gap={10} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.medical_document_id ?? item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={resultsQ.isRefetching}
              onRefresh={() => void resultsQ.refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const medicalId = item.medical_document_id ?? item.id;
            return (
              <ResultRow
                item={item}
                role={role}
                downloading={downloadingId === medicalId}
                downloaded={isDownloaded(medicalId)}
                onDownload={() => void handleDownload(item)}
                onOpenAppointment={() => openAppointment(item.appointment_id)}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
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
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={styles.count}>
                {items.length} résultat{items.length > 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  loading: { paddingHorizontal: spacing[4] },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  count: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  sep: { height: spacing[2] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  cardPressed: { opacity: 0.92 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
});
