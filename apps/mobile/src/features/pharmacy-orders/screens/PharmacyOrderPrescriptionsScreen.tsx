import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Download, Eye, FileText } from 'lucide-react-native';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { EmptyState } from '@/components/ui/EmptyState';
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
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PharmacyOrderPrescriptionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = String(id ?? '');
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const scrollConfig = useStackScrollConfig(styles.content);
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

  if (orderQ.isError) {
    return (
      <StackChromeScreen>
        <EmptyState
          Icon={FileText}
          title="Ordonnances indisponibles"
          description={orderQ.error instanceof Error ? orderQ.error.message : 'Réessayez plus tard.'}
          actionLabel="Réessayer"
          onAction={() => void orderQ.refetch()}
        />
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={c.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={scrollConfig.contentContainerStyle}
          {...spreadTabSceneScrollProps(scrollConfig)}
        >
          <AppText style={styles.lead}>
            {docIds.length === 1
              ? '1 ordonnance jointe à cette commande.'
              : `${docIds.length} ordonnances jointes à cette commande.`}
          </AppText>

          {!docIds.length ? (
            <EmptyState
              Icon={FileText}
              title="Aucune ordonnance"
              description="Aucun fichier n’a été joint à cette commande."
            />
          ) : (
            <View style={styles.list}>
              {docIds.map((documentId, index) => {
                const meta = docsQ[index]?.data;
                const title =
                  docIds.length > 1 ? `Ordonnance ${index + 1}` : 'Ordonnance';
                const subtitle = meta
                  ? formatDocumentFileSubtitle(meta.document_type, meta.file_name, meta.created_at)
                  : 'Chargement…';

                return (
                  <ListRowShell
                    key={documentId}
                    leading={
                      <View style={styles.iconWrap}>
                        <FileText size={iconSize.md} color={c.primary} strokeWidth={2} />
                      </View>
                    }
                    body={
                      <View style={styles.body}>
                        <AppText style={styles.rowTitle}>{title}</AppText>
                        <AppText style={styles.rowSub} numberOfLines={2}>
                          {subtitle}
                        </AppText>
                      </View>
                    }
                    trailing={
                      <Row style={styles.actions}>
                        <IconActionButton
                          label={`Voir ${title}`}
                          onPress={() => {
                            void openDoc(documentId, meta?.file_name);
                          }}
                        >
                          <Eye size={iconSize.sm} color={c.primary} strokeWidth={2.5} />
                        </IconActionButton>
                        <IconActionButton
                          label={`Télécharger ${title}`}
                          onPress={() => {
                            void downloadDoc(documentId, meta?.file_name);
                          }}
                        >
                          <Download size={iconSize.sm} color={c.primary} strokeWidth={2.5} />
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

function buildStyles(c: AppColors) {
  return {
    content: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[8],
      gap: spacing[3],
    },
    loader: { marginTop: spacing[10] },
    lead: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    list: { gap: spacing[2] },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: c.primaryLight,
    },
    body: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    rowTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    rowSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    actions: {
      alignItems: 'center' as const,
      gap: spacing[1],
    },
  };
}
