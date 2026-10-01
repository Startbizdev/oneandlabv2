import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText } from 'lucide-react-native';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Row } from '@/components/layout/primitives';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { queryKeys } from '@/lib/query-keys';
import { openMedicalDocument, cacheMedicalDocument } from '@/lib/downloads/download-medical-document';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import { useToast } from '@/providers/ToastProvider';
import { fetchPharmacyOrder } from '../api/pharmacy-orders.service';
import { fetchMedicalDocumentById } from '@/features/appointments/api/medical-documents.service';
import { formatDocumentFileSubtitle } from '@/utils/document-display-name';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

/** Ordonnances jointes à une commande pharmacie : aperçu et téléchargement. */
export function PharmacyOrderPrescriptionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = String(id ?? '');
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();

  const orderQ = useQuery({
    queryKey: queryKeys.pharmacyOrders.detail(orderId),
    queryFn: async () => {
      const res = await fetchPharmacyOrder(orderId);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Commande introuvable');
      return res.data;
    },
    enabled: !!orderId,
  });

  const docIds = orderQ.data?.prescription_document_ids ?? [];

  const docsQ = useQueries({
    queries: docIds.map((documentId) => ({
      queryKey: ['medical-document', documentId] as const,
      queryFn: async () => {
        const res = await fetchMedicalDocumentById(documentId);
        if (!res.success || !res.data) throw new Error(res.error ?? 'Document introuvable');
        return res.data;
      },
      enabled: !!documentId,
    })),
  });

  const loading = orderQ.isLoading || docsQ.some((q) => q.isLoading);

  const openDoc = async (documentId: string, fileName?: string) => {
    const res = await openMedicalDocument(documentId, fileName);
    if (!res.ok) toast(res.error ?? 'Ouverture impossible', { type: 'error' });
  };

  const downloadDoc = async (documentId: string, fileName?: string) => {
    const cached = await cacheMedicalDocument(documentId, fileName);
    if (!cached.ok || !cached.localUri) {
      toast(cached.error ?? 'Téléchargement impossible', { type: 'error' });
      return;
    }
    const exported = await exportLocalFile(cached.localUri, fileName);
    if (!exported.ok) toast(exported.error ?? 'Enregistrement impossible', { type: 'error' });
  };

  if (orderQ.isError && !orderQ.data) {
    return (
      <StackChromeScreen>
        <View style={styles.errorWrap}>
          <ErrorState title="Ordonnances indisponibles" error={orderQ.error} onRetry={() => void orderQ.refetch()} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={c.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!docIds.length ? (
            <EmptyState illustration="prescriptions" title="Aucune ordonnance jointe" />
          ) : (
            <View style={styles.list}>
              {docIds.map((documentId, index) => {
                const docQ = docsQ[index];
                const meta = docQ?.data;
                const title = docIds.length > 1 ? `Ordonnance ${index + 1}` : 'Ordonnance';
                const subtitle = meta
                  ? formatDocumentFileSubtitle(meta.created_at)
                  : docQ?.isError
                    ? 'Informations indisponibles'
                    : null;

                return (
                  <ListRowShell
                    key={documentId}
                    topBorder={index > 0}
                    leading={
                      <View style={styles.iconWrap}>
                        <FileText size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                      </View>
                    }
                    body={
                      <View style={styles.body}>
                        <AppText style={styles.rowTitle}>{title}</AppText>
                        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
                      </View>
                    }
                    trailing={
                      <Row style={styles.actions}>
                        <IconActionButton
                          label={`Voir ${title}`}
                          variant="muted"
                          onPress={() => {
                            void openDoc(documentId, meta?.file_name);
                          }}
                        >
                          <Eye size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                        </IconActionButton>
                        <IconActionButton
                          label={`Télécharger ${title}`}
                          variant="secondary"
                          onPress={() => {
                            void downloadDoc(documentId, meta?.file_name);
                          }}
                        >
                          <Download size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
                        </IconActionButton>
                      </Row>
                    }
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    content: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    loader: { marginTop: spacing[10] },
    errorWrap: { flex: 1, paddingTop: spacing[3] },
    list: {
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    iconWrap: {
      width: spacing[10],
      height: spacing[10],
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.surfaceAlt,
    },
    body: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    rowTitle: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    actions: {
      alignItems: 'center' as const,
      gap: spacing[2],
    },
  };
}
