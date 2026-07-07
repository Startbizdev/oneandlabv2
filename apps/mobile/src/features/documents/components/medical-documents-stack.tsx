import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  CreditCard,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Plus,
  RefreshCw,
  Shield,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';
import {
  formatDocumentFileSubtitle,
  formatDocumentRowTitle,
} from '@/utils/document-display-name';
import { getRdvDetailSectionStyles } from '@/features/appointments/detail/components/layout/rdv-detail-section-styles';
import { SkeletonList } from '@/components/ui/skeletons';
import {
  cacheMedicalDocument,
  getCachedMedicalDocumentUri,
} from '@/lib/downloads/download-medical-document';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';
import { useToast } from '@/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { useDownloadedDocumentIds } from '@/features/documents/hooks/use-downloaded-document-ids';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export const MEDICAL_DOC_ICONS: Record<string, LucideIcon> = {
  carte_vitale: CreditCard,
  carte_mutuelle: Shield,
  ordonnance: FileText,
  resultats: FlaskConical,
  autres_assurances: FileText,
  other: FileText,
};

export type MedicalDocumentStackItem = {
  id: string;
  document_type: string;
  file_name?: string;
  created_at?: string;
  source?: 'appointment' | 'patient_profile' | 'profile';
  profile_newer_than_appointment?: boolean;
};

function buildDocumentRowHint(doc: MedicalDocumentStackItem): string {
  const base = formatDocumentFileSubtitle(doc.document_type, null, doc.created_at);
  const tags: string[] = [];
  if (doc.profile_newer_than_appointment) tags.push('Version profil à jour');
  if (tags.length === 0) return base;
  return `${base} · ${tags.join(' · ')}`;
}

export type DocumentStackRow =
  | { key: string; kind: 'open'; doc: MedicalDocumentStackItem }
  | { key: string; kind: 'add'; docType: string };

export function buildDocumentStackRows(
  list: MedicalDocumentStackItem[],
  orderedTypes: readonly string[],
  uploadTypesFiltered: readonly string[],
): DocumentStackRow[] {
  const rows: DocumentStackRow[] = [];
  const seenDocIds = new Set<string>();

  for (const docType of orderedTypes) {
    for (const doc of list.filter((d) => d.document_type === docType)) {
      rows.push({ key: `open-${doc.id}`, kind: 'open', doc });
      seenDocIds.add(doc.id);
    }
    if (uploadTypesFiltered.includes(docType)) {
      rows.push({ key: `add-${docType}`, kind: 'add', docType });
    }
  }

  for (const doc of list) {
    if (!seenDocIds.has(doc.id)) {
      rows.push({ key: `open-${doc.id}`, kind: 'open', doc });
    }
  }

  return rows;
}

export function filterUploadTypesForStack(
  orderedTypes: readonly string[],
  existingTypes: Set<string>,
  options?: { alwaysAllowReplace?: readonly string[] },
): string[] {
  const replaceAlways = new Set(options?.alwaysAllowReplace ?? ['other', 'autres_assurances']);
  return orderedTypes.filter((t) => replaceAlways.has(t) || !existingTypes.has(t));
}

// --- en-tête carte ---

export function MedicalDocumentsStackHead({
  title,
  subtitle,
  loading,
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
}) {
  const c = useAppColors();
  const section = getRdvDetailSectionStyles();
  const styles = useThemedStyles(buildHeadStyles);

  if (loading) {
    return (
      <View style={section.card}>
        <View style={styles.head}>
          <AppText style={[styles.title, { color: c.textPrimary }]}>{title}</AppText>
        </View>
        <View style={styles.skeletonPad}>
          <SkeletonList count={3} itemHeight={72} gap={spacing[2]} />
        </View>
      </View>
    );
  }

  return (
    <Cluster
      align="start"
      gap={spacing[3]}
      style={styles.head}
      leading={
        <View style={[styles.headIcon, { backgroundColor: c.primaryLight }]}>
          <FileText size={iconSize.sm} color={c.primary} strokeWidth={2.25} />
        </View>
      }
    >
      <View style={styles.headText}>
        <AppText style={[styles.title, { color: c.textPrimary }]}>{title}</AppText>
        <AppText style={[styles.sub, { color: c.textSecondary }]}>{subtitle}</AppText>
      </View>
    </Cluster>
  );
}

export function useMedicalDocumentsStackHeadStyles() {
  return useThemedStyles(buildHeadStyles);
}

// --- ligne : [ icône | texte pressable | actions ] (doc RN flexbox + DetailActionList) ---

type StackRowTone = 'primary' | 'muted' | 'ready';

function DocumentStackRow({
  topBorder,
  rowExtraStyle,
  disabled,
  tone,
  onLeadingPress,
  leadingLabel,
  Icon,
  label,
  hint,
  actions,
}: {
  topBorder: boolean;
  rowExtraStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  tone: StackRowTone;
  onLeadingPress: () => void;
  leadingLabel: string;
  Icon: LucideIcon;
  label: string;
  hint: string;
  actions: ReactNode;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildRowStyles);

  const iconBg =
    tone === 'ready' ? c.successLight : tone === 'muted' ? c.surfaceAlt : c.primaryLight;
  const iconColor =
    tone === 'ready' ? c.success : tone === 'muted' ? c.textSecondary : c.primary;
  const hintColor = tone === 'ready' ? c.success : c.textSecondary;

  return (
    <ListRowShell
      topBorder={topBorder}
      style={[rowExtraStyle, disabled && styles.rowDisabled]}
      leading={
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Icon size={iconSize.md} color={iconColor} strokeWidth={2.25} />
        </View>
      }
      onBodyPress={onLeadingPress}
      bodyAccessibilityLabel={leadingLabel}
      bodyDisabled={disabled}
      body={
        <>
          <AppText
            style={[styles.label, styles.shrinkText, { color: c.textPrimary }]}
            numberOfLines={2}
          >
            {label}
          </AppText>
          <AppText
            style={[styles.hint, styles.shrinkText, { color: hintColor }]}
            numberOfLines={2}
          >
            {hint}
          </AppText>
        </>
      }
      actions={actions}
    />
  );
}

// --- document existant ---

export function MedicalDocumentOpenRow({
  doc,
  topBorder,
  busyAction,
  canReplace,
  onDownload,
  onPreview,
  onReplace,
}: {
  doc: MedicalDocumentStackItem;
  topBorder: boolean;
  busyAction: 'download' | 'replace' | null;
  canReplace: boolean;
  onDownload: () => void;
  onPreview: () => void;
  onReplace: () => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildRowStyles);
  const Icon = MEDICAL_DOC_ICONS[doc.document_type] ?? FileText;
  const label = formatDocumentRowTitle(doc.document_type);
  const hint = buildDocumentRowHint(doc);

  const busy = busyAction !== null;
  const pillBg = c.surface;
  const pillColor = c.success;

  return (
    <DocumentStackRow
      topBorder={topBorder}
      rowExtraStyle={styles.rowReady}
      disabled={busy}
      tone="ready"
      onLeadingPress={onPreview}
      leadingLabel={`Aperçu ${label}`}
      Icon={Icon}
      label={label}
      hint={hint}
      actions={
        <>
          <IconActionButton
            label={`Aperçu ${label}`}
            onPress={onPreview}
            disabled={busy}
            backgroundColor={pillBg}
          >
            <Eye size={iconSize.sm} color={pillColor} strokeWidth={2.25} />
          </IconActionButton>
          {canReplace ? (
            <IconActionButton
              label={`Remplacer ${label}`}
              onPress={onReplace}
              disabled={busy}
              loading={busyAction === 'replace'}
              backgroundColor={pillBg}
            >
              <RefreshCw size={iconSize.sm} color={pillColor} strokeWidth={2.25} />
            </IconActionButton>
          ) : null}
          <IconActionButton
            label={`Enregistrer ${label}`}
            onPress={onDownload}
            disabled={busy}
            loading={busyAction === 'download'}
            variant="secondary"
            backgroundColor={pillBg}
          >
            <Download size={iconSize.sm} color={pillColor} strokeWidth={2.25} />
          </IconActionButton>
        </>
      }
    />
  );
}

export function MedicalDocumentOpenRowContainer({
  doc,
  topBorder,
  cacheScopeKey,
  canReplace = false,
  onPreview,
  onReplace,
}: {
  doc: MedicalDocumentStackItem;
  topBorder: boolean;
  /** Persistance « déjà téléchargé » (AsyncStorage), ex. `apt:{id}` ou `patient:{id}`. */
  cacheScopeKey: string;
  canReplace?: boolean;
  onPreview: (localUri: string, fileName?: string) => void;
  onReplace?: () => void | Promise<void>;
}) {
  const { show: toast } = useToast();
  const { markDownloaded } = useDownloadedDocumentIds(cacheScopeKey);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'download' | 'replace' | null>(null);
  const refreshGen = useRef(0);

  const refreshCache = useCallback(async () => {
    const gen = ++refreshGen.current;
    const uri = await getCachedMedicalDocumentUri(doc.id, doc.file_name);
    if (gen !== refreshGen.current) return;
    logMedDoc('row:cache', { docId: doc.id, fileName: doc.file_name, cachedUri: uri });
    setLocalUri(uri);
    if (uri) void markDownloaded(doc.id);
  }, [doc.file_name, doc.id, markDownloaded]);

  useEffect(() => {
    void refreshCache();
  }, [refreshCache, doc.id, doc.file_name, doc.created_at]);

  const handleDownload = useCallback(async () => {
    refreshGen.current += 1;
    setBusyAction('download');
    logMedDoc('row:export:START', { docId: doc.id, fileName: doc.file_name, cached: Boolean(localUri) });

    let uri = localUri;
    if (!uri) {
      const res = await cacheMedicalDocument(doc.id, doc.file_name);
      logMedDoc('row:download:RESULT', {
        docId: doc.id,
        ok: res.ok,
        localUri: res.localUri,
        error: res.error,
      });
      if (res.ok && res.localUri) {
        uri = res.localUri;
      } else {
        uri = await getCachedMedicalDocumentUri(doc.id, doc.file_name);
        if (!uri) {
          setBusyAction(null);
          toast(res.error ?? 'Impossible de récupérer le document', { type: 'error' });
          return;
        }
      }
    }

    setLocalUri(uri);
    await markDownloaded(doc.id);

    const exported = await exportLocalFile(uri, doc.file_name);
    setBusyAction(null);

    if (!exported.ok) {
      toast(exported.error ?? 'Enregistrement impossible', { type: 'error' });
    }
  }, [doc.file_name, doc.id, localUri, markDownloaded, toast]);

  const handlePreview = useCallback(async () => {
    if (!localUri) {
      setBusyAction('download');
      logMedDoc('row:preview:AUTO_DOWNLOAD', { docId: doc.id });
      const res = await cacheMedicalDocument(doc.id, doc.file_name);
      setBusyAction(null);
      if (!res.ok || !res.localUri) {
        toast(res.error ?? 'Téléchargez le document avant l’aperçu', { type: 'error' });
        return;
      }
      setLocalUri(res.localUri);
      await markDownloaded(doc.id);
      logMedDoc('row:preview:OPEN', { docId: doc.id, fileName: doc.file_name, localUri: res.localUri });
      void inspectMedDocFile(res.localUri, 'row:preview:file');
      onPreview(res.localUri, doc.file_name);
      return;
    }
    logMedDoc('row:preview:OPEN', { docId: doc.id, fileName: doc.file_name, localUri });
    void inspectMedDocFile(localUri, 'row:preview:file');
    onPreview(localUri, doc.file_name);
  }, [doc.file_name, doc.id, localUri, markDownloaded, onPreview, toast]);

  const handleReplace = useCallback(async () => {
    if (!onReplace) return;
    refreshGen.current += 1;
    setBusyAction('replace');
    setLocalUri(null);
    try {
      await onReplace();
      await refreshCache();
    } finally {
      setBusyAction(null);
    }
  }, [onReplace, refreshCache]);

  return (
    <MedicalDocumentOpenRow
      doc={doc}
      topBorder={topBorder}
      busyAction={busyAction}
      canReplace={canReplace && Boolean(onReplace)}
      onDownload={() => void handleDownload()}
      onPreview={() => void handlePreview()}
      onReplace={() => void handleReplace()}
    />
  );
}

// --- ajout document ---

export function MedicalDocumentAddRow({
  docType,
  topBorder,
  uploading,
  onAdd,
}: {
  docType: string;
  topBorder: boolean;
  uploading: boolean;
  onAdd: (type: string) => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildRowStyles);
  const Icon = MEDICAL_DOC_ICONS[docType] ?? FileText;
  const label = getDocumentTypeLabel(docType);
  const pick = () => onAdd(docType);

  return (
    <DocumentStackRow
      topBorder={topBorder}
      rowExtraStyle={styles.rowAdd}
      disabled={uploading}
      tone="muted"
      onLeadingPress={pick}
      leadingLabel={`Ajouter ${label}`}
      Icon={Icon}
      label={label}
      hint={uploading ? 'Envoi en cours…' : 'Appareil photo, galerie ou fichier'}
      actions={
        <IconActionButton
          label={`Ajouter ${label}`}
          onPress={pick}
          disabled={uploading}
          loading={uploading}
          variant="secondary"
          backgroundColor={c.primaryLight}
        >
          <Plus size={iconSize.sm} color={c.primary} strokeWidth={2.5} />
        </IconActionButton>
      }
    />
  );
}

// --- styles ---

function buildHeadStyles(c: AppColors) {
  return {
    head: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[3],
    },
    headIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      letterSpacing: -0.2,
    },
    sub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
    },
    skeletonPad: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[4],
    },
    emptyRow: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[5],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    emptyText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      textAlign: 'center' as const,
    },
  };
}

function buildRowStyles(c: AppColors) {
  return {
    rowAdd: { backgroundColor: c.surfaceSubtle },
    rowReady: { backgroundColor: c.successSurface },
    rowDisabled: { opacity: 0.65 },
    iconWrap: {
      width: spacing[10],
      height: spacing[10],
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: spacing[3],
      flexShrink: 0,
    },
    shrinkText: { minWidth: 0, flexShrink: 1 },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.3,
    },
    hint: {
      marginTop: spacing[0.5],
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: fontSize.xs * 1.35,
    },
    actionBtn: {
      minWidth: spacing[9],
      minHeight: spacing[9],
      width: spacing[9],
      height: spacing[9],
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: radius.full,
    },
  };
}
