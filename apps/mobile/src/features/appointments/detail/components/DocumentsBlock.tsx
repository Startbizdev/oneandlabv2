import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CreditCard, FileText, FlaskConical, Shield, Camera } from 'lucide-react-native';
import { DocumentDownloadButton } from '@/features/documents/components/DocumentDownloadButton';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import type { LucideIcon } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonList } from '@/components/ui/skeletons';
import { downloadMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useToast } from '@/providers/ToastProvider';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import {
  filterListDocuments,
  getDocumentTypeLabel,
} from '../utils/document-labels';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  resultats: FlaskConical,
  autres_assurances: FileText,
  care_photo: Camera,
  cancellation_photo: Camera,
  other: FileText,
};

interface Props {
  docs: MedicalDocumentRow[];
  loading?: boolean;
  omitCarePhotos?: boolean;
  appointmentId?: string;
}

function DocIcon({ type }: { type: string }) {
  const Icon = DOC_ICONS[type] ?? FileText;
  return (
    <View style={styles.docIcon}>
      <Icon size={16} color={colors.primary} strokeWidth={2} />
    </View>
  );
}

function DocumentRow({
  doc,
  downloading,
  downloaded,
  onDownload,
}: {
  doc: MedicalDocumentRow;
  downloading: boolean;
  downloaded: boolean;
  onDownload: (doc: MedicalDocumentRow) => void;
}) {
  const label = getDocumentTypeLabel(doc.document_type);
  const sub = doc.file_name?.trim();

  return (
    <View style={styles.docRow}>
      <DocIcon type={doc.document_type} />
      <View style={styles.docBody}>
        <Text style={styles.docLabel}>{label}</Text>
        {sub ? (
          <Text style={styles.docFile} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <DocumentDownloadButton
        downloaded={downloaded}
        downloading={downloading}
        onPress={() => onDownload(doc)}
        accessibilityLabel={`Télécharger ${label}`}
      />
    </View>
  );
}

export function DocumentsBlock({
  docs,
  loading,
  omitCarePhotos = true,
  appointmentId,
}: Props) {
  const { show: toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const scopeKey = appointmentId
    ? `apt:${appointmentId}`
    : `docs:${docs.map((d) => d.id).join(',')}`;
  const { isDownloaded, markDownloaded } = useDownloadedDocumentIds(scopeKey);

  const list = filterListDocuments(docs, { omitCarePhotos });

  const handleDownload = useCallback(
    async (doc: MedicalDocumentRow) => {
      setDownloadingId(doc.id);
      const res = await downloadMedicalDocument(doc.id, doc.file_name);
      setDownloadingId(null);
      if (res.ok) {
        await markDownloaded(doc.id);
        toast('Document prêt à enregistrer', { type: 'success' });
      } else {
        toast(res.error ?? 'Téléchargement impossible', { type: 'error' });
      }
    },
    [toast, markDownloaded],
  );

  if (loading) {
    return (
      <Card shadow="sm" padding="md">
        <Skeleton height={14} width={100} borderRadius={radius.sm} />
        <SkeletonList count={2} itemHeight={52} gap={spacing[2]} />
      </Card>
    );
  }

  if (!list.length) return null;

  return (
    <Card shadow="sm" padding="none">
      {list.map((d, i) => (
        <View
          key={d.id}
          style={[styles.docRowWrap, i > 0 && styles.docRowBorder]}
        >
          <DocumentRow
            doc={d}
            downloading={downloadingId === d.id}
            downloaded={isDownloaded(d.id)}
            onDownload={handleDownload}
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  skeletonRows: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  docRowWrap: {
    paddingHorizontal: spacing[4],
  },
  docRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  docFile: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  downloadBtnPressed: {
    opacity: 0.7,
  },
  downloadBtnDisabled: {
    opacity: 0.5,
  },
});
