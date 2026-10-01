import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { fetchPatientDocuments } from '@/features/patients/api/patient-profile.service';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { radius, useStyles, type Theme } from '@/theme';

interface Props {
  patientUserId: string;
  documentsHref: Href;
}

function dossierDescription(count: number | null): string {
  if (count === null) return 'Chargement…';
  if (count === 0) return 'Aucun document · Vitale, mutuelle…';
  if (count === 1) return '1 document enregistré';
  return `${count} documents enregistrés`;
}

export function WizardPatientDocumentsPanel({ patientUserId, documentsHref }: Props) {
  const styles = useStyles(buildStyles);
  const router = useRouter();

  const docsQ = useQuery({
    queryKey: queryKeys.documents.patient(patientUserId),
    queryFn: async () => {
      const res = await fetchPatientDocuments(patientUserId);
      return res.data ?? [];
    },
    enabled: Boolean(patientUserId),
  });

  const { refetch } = docsQ;
  useFocusEffect(
    useCallback(() => {
      if (patientUserId) void refetch();
    }, [patientUserId, refetch]),
  );

  if (!patientUserId) return null;

  const loading = docsQ.isLoading && docsQ.data === undefined;

  return (
    <View style={styles.card}>
      <SettingsRow
        icon={FolderOpen}
        label="Dossier patient"
        description={
          docsQ.isError && docsQ.data === undefined
            ? 'Documents indisponibles · touchez pour ouvrir'
            : dossierDescription(loading ? null : (docsQ.data?.length ?? 0))
        }
        onPress={() => router.push(documentsHref)}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    card: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
  };
}
