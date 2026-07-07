import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { fetchPatientDocuments } from '@/features/patients/api/patient-profile.service';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  patientUserId: string;
  documentsRoute: string;
}

function dossierSubtitle(count: number): string {
  if (count === 0) {
    return 'Vitale, mutuelle… · ouvrir pour ajouter';
  }
  if (count === 1) {
    return '1 document enregistré';
  }
  return `${count} documents enregistrés`;
}

export function WizardPatientDocumentsPanel({
  patientUserId, documentsRoute }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_WizardPatientDocumentsPanel_tsx_styles');
  const router = useRouter();

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(patientUserId),
    queryFn: async () => {
      const res = await fetchPatientDocuments(patientUserId);
      return res.data ?? [];
    },
    enabled: Boolean(patientUserId),
  });

  useFocusEffect(
    useCallback(() => {
      if (patientUserId) void docsQ.refetch();
    }, [patientUserId, docsQ.refetch]),
  );

  if (!patientUserId || !documentsRoute) return null;

  const count = docsQ.data?.length ?? 0;
  const loading = docsQ.isLoading && docsQ.data === undefined;

  return (
    <View style={styles.card}>
      {loading ? (
        <Cluster
          gap={spacing[3]}
          style={styles.loadingRow}
          leading={
            <View style={styles.iconWrap}>
              <FolderOpen size={iconSize.md} color={c.primary} strokeWidth={2.25} />
            </View>
          }
          actions={
            <ActivityIndicator size="small" color={c.textTertiary} style={styles.spinner} />
          }
        >
          <AppText style={styles.loadingTitle}>Dossier patient</AppText>
        </Cluster>
      ) : (
        <ProfileNavRow
          icon={FolderOpen}
          title="Dossier patient"
          subtitle={dossierSubtitle(count)}
          onPress={() => router.push(documentsRoute as never)}
        />
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    width: '100%' as const,
    alignSelf: 'stretch' as const,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
    overflow: 'hidden' as const,
  },
  loadingRow: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  loadingTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  spinner: {
    marginLeft: spacing[2],
  },
};
}

