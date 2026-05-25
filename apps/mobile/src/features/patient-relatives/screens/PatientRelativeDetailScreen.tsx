import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { PatientDetailHubCard } from '@/features/appointments/detail/components/patient/PatientDetailHubCard';
import { DetailActionList } from '@/features/appointments/detail/components/layout/DetailActionList';
import {
  deletePatientRelative,
  fetchPatientRelative,
  updatePatientRelative,
} from '../api/patient-relatives.service';
import { PatientRelativeFormSheet } from '../components/PatientRelativeFormSheet';
import { relationshipLabel } from '../constants/relationship-types';
import { fetchProfileDocuments } from '@/features/patients/api/patient-profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PatientRelativeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const q = useQuery({
    queryKey: ['patient-relatives', id],
    queryFn: async () => {
      const res = await fetchPatientRelative(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Proche introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });

  const docsQ = useQuery({
    queryKey: queryKeys.documents.relative(id ?? ''),
    queryFn: async () => {
      const res = await fetchProfileDocuments({ relativeId: id! });
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const documentsCount = docsQ.data?.length ?? 0;

  const saveMut = useMutation({
    mutationFn: (body: Parameters<typeof updatePatientRelative>[1]) =>
      updatePatientRelative(id!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      void qc.invalidateQueries({ queryKey: ['patient-relatives', id] });
      setEditOpen(false);
      toast('Proche mis à jour', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'updateRelative'),
  });

  const deleteMut = useMutation({
    mutationFn: () => deletePatientRelative(id!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      toast('Proche supprimé', { type: 'success' });
      router.back();
    },
    onError: (e) => handleApiError(e, toast, 'deleteRelative'),
  });

  const onDelete = useCallback(() => {
    const name = `${q.data?.first_name ?? ''} ${q.data?.last_name ?? ''}`.trim() || 'ce proche';
    Alert.alert('Supprimer', `Supprimer ${name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMut.mutate() },
    ]);
  }, [deleteMut, q.data]);

  const deleteActions = useMemo(
    () => [
      {
        key: 'delete',
        label: 'Supprimer ce proche',
        hint: 'Action irréversible',
        icon: Trash2,
        tone: 'destructive' as const,
        onPress: onDelete,
        loading: deleteMut.isPending,
        showChevron: false,
      },
    ],
    [deleteMut.isPending, onDelete],
  );

  const book = () => {
    router.push(`/(patient)/booking/new?relative_id=${encodeURIComponent(id!)}` as never);
  };

  const openDocuments = () => {
    router.push(`/(patient)/relatives/${id}/documents` as never);
  };

  if (q.isLoading || !q.data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Proche' }} />
        <SkeletonProfileScreen cards={2} />
      </>
    );
  }

  const r = q.data;
  const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();

  return (
    <>
      <Stack.Screen
        options={{
          title: name || 'Proche',
          headerRight: () => (
            <Text onPress={() => setEditOpen(true)} style={styles.headerEdit}>
              Modifier
            </Text>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching || docsQ.isRefetching}
            onRefresh={() => {
              void q.refetch();
              void docsQ.refetch();
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.heroName}>{name}</Text>
          {r.relationship_type ? (
            <Text style={styles.heroSub}>{relationshipLabel(r.relationship_type)}</Text>
          ) : null}
          {r.birth_date ? (
            <Text style={styles.heroSub}>Né(e) le {formatBirthDateFr(r.birth_date)}</Text>
          ) : null}
          {r.phone ? <Text style={styles.heroSub}>{r.phone}</Text> : null}
          {r.email ? <Text style={styles.heroSub}>{r.email}</Text> : null}
        </View>

        <Button title="Réserver pour ce proche" onPress={book} fullWidth size="lg" />

        <PatientDetailHubCard documentsCount={documentsCount} onDocuments={openDocuments} />

        <DetailActionList actions={deleteActions} edgeToEdge={false} />
      </ScrollView>

      <PatientRelativeFormSheet
        visible={editOpen}
        initial={r}
        saving={saveMut.isPending}
        onClose={() => setEditOpen(false)}
        onSubmit={(body) => saveMut.mutate(body)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[12] },
  hero: { gap: spacing[1] },
  heroName: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['2xl'],
    color: colors.textPrimary,
  },
  heroSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  headerEdit: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    marginRight: spacing[2],
  },
});
