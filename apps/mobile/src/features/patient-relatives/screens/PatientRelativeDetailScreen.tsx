import { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, HeartPulse, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { SkeletonProfileScreen } from '@/components/ui/skeletons';
import { deletePatientRelative, updatePatientRelative } from '../api/patient-relatives.service';
import { PatientRelativeFormSheet } from '../components/PatientRelativeFormSheet';
import { relationshipLabel } from '../constants/relationship-types';
import { usePatientRelative } from '../hooks/use-patient-relative';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { bookingNewHref } from '@/navigation/role-hrefs';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { fetchProfileDocuments } from '@/features/patients/api/patient-profile.service';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { ageFromBirthDate, formatBirthDateFr } from '@oneandlab/shared-utils';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

export function PatientRelativeDetailScreen() {
  const styles = useStyles(buildStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  /** Quitte cette fiche même si la confirmation (route racine) est encore au premier plan, contrairement à `router.back()`. */
  const navigation = useNavigation();
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const q = usePatientRelative(id);

  const docsQ = useQuery({
    queryKey: queryKeys.documents.relative(id ?? ''),
    queryFn: async () => {
      const res = await fetchProfileDocuments({ relativeId: id! });
      if (!res.success) throw new Error(res.error ?? 'Documents indisponibles');
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const { refreshing, onRefresh } = useManualRefresh(() => Promise.all([q.refetch(), docsQ.refetch()]));

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
      setConfirmDelete(false);
      toast('Proche supprimé', { type: 'success' });
      navigation.goBack();
    },
    onError: (e) => handleApiError(e, toast, 'deleteRelative'),
  });

  if (q.isError || (!q.isLoading && !q.data)) {
    return (
      <StackChromeScreen title="Proche">
        <View style={styles.errorWrap}>
          <ErrorState
            error={q.error}
            title="Impossible de charger ce proche"
            onRetry={() => void q.refetch()}
          />
        </View>
      </StackChromeScreen>
    );
  }
  if (q.isLoading || !q.data) {
    return (
      <StackChromeScreen title="Proche">
        <SkeletonProfileScreen cards={2} />
      </StackChromeScreen>
    );
  }

  const r = q.data;
  const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
  const age = ageFromBirthDate(r.birth_date);
  const meta = [
    r.relationship_type ? relationshipLabel(r.relationship_type) : '',
    r.birth_date && age != null
      ? `${age} an${age > 1 ? 's' : ''} (${formatBirthDateFr(r.birth_date)})`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const contact = [r.phone, r.email].filter(Boolean).join('\n');
  const documentsCount = docsQ.data?.length ?? 0;
  const firstName = r.first_name?.trim() || name;
  const dossierItems: SettingsRowProps[] = [];
  if (r.profile_id) {
    dossierItems.push({
      icon: HeartPulse,
      label: 'Carnet de santé',
      onPress: () => router.push({ pathname: '/(patient)/relatives/[id]/health-record', params: { id: r.id } }),
    });
  }
  if (docsQ.isError && !docsQ.data) {
    dossierItems.push({
      icon: FileText,
      label: 'Documents',
      description: 'Indisponibles, touchez pour réessayer',
      onPress: () => void docsQ.refetch(),
    });
  } else {
    dossierItems.push({
      icon: FileText,
      label: 'Documents',
      value: documentsCount > 0 ? String(documentsCount) : undefined,
      onPress: () => router.push({ pathname: '/(patient)/relatives/[id]/documents', params: { id: r.id } }),
    });
  }

  return (
    <StackChromeScreen
      headerRight={
        <HeaderAction label="Modifier" accessibilityLabel="Modifier le proche" onPress={() => setEditOpen(true)} />
      }
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.hero}>
          <AppText style={styles.heroName} accessibilityRole="header">
            {name}
          </AppText>
          {meta ? <AppText variant="secondary">{meta}</AppText> : null}
          {contact ? <AppText variant="secondary">{contact}</AppText> : null}
        </View>

        <Button
          title="Réserver pour ce proche"
          onPress={() => router.push(bookingNewHref('/(patient)', { relative_id: r.id }))}
          fullWidth
          size="lg"
        />

        <SettingsSection title={firstName ? `Dossier de ${firstName}` : 'Dossier'} items={dossierItems} />

        <SettingsSection
          items={[
            {
              icon: Trash2,
              label: 'Supprimer ce proche',
              destructive: true,
              inlineAction: true,
              onPress: () => setConfirmDelete(true),
            },
          ]}
        />
      </ScrollView>

      <PatientRelativeFormSheet
        visible={editOpen}
        initial={r}
        saving={saveMut.isPending}
        onClose={() => setEditOpen(false)}
        onSubmit={(body) => saveMut.mutate(body)}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title={`Supprimer ${name || 'ce proche'} ?`}
        message="Sa fiche sera définitivement retirée de vos proches."
        confirmLabel="Supprimer"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    scroll: { padding: spacing[4], gap: spacing[6], paddingBottom: spacing[12] },
    errorWrap: { flex: 1, justifyContent: 'center' as const, padding: spacing[4] },
    hero: { gap: spacing[1] },
    heroName: {
      ...font.headingExtraBold,
      fontSize: fontSize['2xl'],
      color: c.textPrimary,
    },
  };
}
