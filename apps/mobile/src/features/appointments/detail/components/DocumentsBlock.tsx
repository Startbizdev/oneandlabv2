import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { CreditCard, FileText, FlaskConical, Shield, Camera } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { DocumentDownloadButton } from '@/features/documents/components/DocumentDownloadButton';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import type { LucideIcon } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonList } from '@/components/ui/skeletons';
import { openMedicalDocument } from '@/lib/downloads/download-medical-document';
import { useToast } from '@/providers/ToastProvider';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import {
  filterListDocuments,
  getDocumentTypeLabel,
} from '../utils/document-labels';
import { formatDocumentFileSubtitle } from '@/utils/document-display-name';
import { radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'DocumentsBlock.DocIcon');
  const Icon = DOC_ICONS[type] ?? FileText;
  return (
    <View style={styles.docIcon}>
      <Icon size={iconSize.sm} color={c.primary} strokeWidth={2} />
    </View>
  );
}

function DocumentRow({
  doc,
  downloading,
  onOpen,
}: {
  doc: MedicalDocumentRow;
  downloading: boolean;
  onOpen: (doc: MedicalDocumentRow) => void;
}) {
  const styles = useThemedStyles(buildStyles, 'DocumentsBlock.DocumentRow');
  const label = getDocumentTypeLabel(doc.document_type);
  const sub = formatDocumentFileSubtitle(doc.document_type, null, doc.created_at);

  return (
    <Pressable
      onPress={() => onOpen(doc)}
      disabled={downloading}
      style={({ pressed }) => [styles.docRow, pressed && styles.docRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${label}`}
    >
      <Cluster
        gap={spacing[3]}
        leading={<DocIcon type={doc.document_type} />}
        actions={
          <DocumentDownloadButton
            downloading={downloading}
            onPress={() => onOpen(doc)}
            accessibilityLabel={`Ouvrir ${label}`}
          />
        }
      >
        <View style={styles.docBody}>
          <AppText style={styles.docLabel}>{label}</AppText>
          <AppText style={styles.docFile} numberOfLines={1}>
            {sub}
          </AppText>
        </View>
      </Cluster>
    </Pressable>
  );
}

export function DocumentsBlock({
  docs,
  loading,
  omitCarePhotos = true,
  appointmentId,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_DocumentsBlock_tsx_styles');
  const { show: toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const scopeKey = appointmentId
    ? `apt:${appointmentId}`
    : `docs:${docs.map((d) => d.id).join(',')}`;
  const { isDownloaded, markDownloaded } = useDownloadedDocumentIds(scopeKey);

  const list = filterListDocuments(docs, { omitCarePhotos });

  const handleOpen = useCallback(
    async (doc: MedicalDocumentRow) => {
      setDownloadingId(doc.id);
      const res = await openMedicalDocument(doc.id, doc.file_name);
      setDownloadingId(null);
      if (res.ok) {
        await markDownloaded(doc.id);
        toast('Document ouvert', { type: 'success' });
      } else {
        toast(res.error ?? 'Ouverture impossible', { type: 'error' });
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
            onOpen={handleOpen}
          />
        </View>
      ))}
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  skeletonRows: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  docRowWrap: {
    paddingHorizontal: spacing[4],
  },
  docRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  docRow: {
    paddingVertical: spacing[3],
  },
  docRowPressed: {
    opacity: 0.88,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  docBody: {
    gap: 2,
  },
  docLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  docFile: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  downloadBtnPressed: {
    opacity: 0.7,
  },
  downloadBtnDisabled: {
    opacity: 0.5,
  },
};
}

