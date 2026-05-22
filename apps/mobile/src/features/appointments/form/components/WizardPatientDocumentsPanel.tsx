import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { fetchPatientDocuments } from '@/features/patients/api/patient-profile.service';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { colors, radius, spacing } from '@/theme';
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

export function WizardPatientDocumentsPanel({ patientUserId, documentsRoute }: Props) {
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
        <View style={styles.loadingRow}>
          <View style={styles.iconWrap}>
            <FolderOpen size={20} color={colors.primary} strokeWidth={2.25} />
          </View>
          <View style={styles.loadingTextCol}>
            <Text style={styles.loadingTitle}>Dossier patient</Text>
            <ActivityIndicator size="small" color={colors.textTertiary} style={styles.spinner} />
          </View>
        </View>
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

const styles = StyleSheet.create({
  card: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  loadingTextCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  loadingTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  spinner: {
    marginLeft: spacing[2],
  },
});
