import { useAppColors } from '@/theme/use-app-colors';
import { ListRowShell } from '@/components/ui/ListRowShell';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import type { ProPrescriptionRow } from '../api/prescriptions.service';
import {
  prescriptionHistoryRowHint,
  prescriptionHistoryRowTitle,
  prescriptionLotLabelFromMeta,
} from '../utils/prescription-display';
import { prescriptionRowAsAppointment } from '../utils/prescription-row-appointment';
import { Stack } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, iconSize, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { layoutRow } from '@/theme/layout-styles';
import { Download, Eye } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

interface RowProps {
  row: ProPrescriptionRow;
  onDownload: () => void;
  onPreview?: () => void;
  onOpenAppointment?: () => void;
  downloading: boolean;
  previewing?: boolean;
  showPatient?: boolean;
  topBorder?: boolean;
}

/** Ligne d'historique d'ordonnance : titre, contexte, aperçu et téléchargement. */
export function PrescriptionHistoryCard({
  row,
  onDownload,
  onPreview,
  onOpenAppointment,
  downloading,
  previewing = false,
  showPatient = true,
  topBorder = false,
}: RowProps) {
  const c = useAppColors();
  const styles = useStyles(buildRowStyles);
  const title = prescriptionHistoryRowTitle(row, { showPatient });
  const hint = prescriptionHistoryRowHint(row, { showPatient });
  const busy = downloading || previewing;
  const lotLabel = prescriptionLotLabelFromMeta(row.appointment_batch_count, row.appointment_type);
  const linkedApt = row.appointment_id ? prescriptionRowAsAppointment(row) : null;

  const titleText = <AppText style={styles.title}>{title}</AppText>;

  return (
    <ListRowShell
      topBorder={topBorder}
      style={styles.row}
      body={
        <Stack gap={spacing[1]} style={styles.textCol}>
          {onOpenAppointment ? (
            <Pressable
              onPress={onOpenAppointment}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le rendez-vous lié, ${title}`}
            >
              {titleText}
            </Pressable>
          ) : (
            titleText
          )}
          {hint ? <AppText variant="caption">{hint}</AppText> : null}
          {linkedApt ? (
            <Stack gap={spacing[0.5]} style={styles.careBlock}>
              {lotLabel ? <AppText variant="caption">{lotLabel}</AppText> : null}
              <RdvCareTagsRow apt={linkedApt} tone="neutral" density="compact" />
            </Stack>
          ) : null}
        </Stack>
      }
      actions={
        <View style={styles.actionGroup}>
          {onPreview ? (
            <IconActionButton
              label="Voir l'ordonnance"
              onPress={onPreview}
              loading={previewing}
              disabled={busy}
              variant="muted"
            >
              <Eye size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            </IconActionButton>
          ) : null}
          <IconActionButton
            label="Télécharger l'ordonnance"
            onPress={onDownload}
            loading={downloading}
            disabled={busy}
            variant="secondary"
          >
            <Download size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </IconActionButton>
        </View>
      }
    />
  );
}

function buildRowStyles({ colors: c, fontSize }: Theme) {
  return {
    row: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      alignItems: 'flex-start' as const,
    },
    textCol: {
      minWidth: 0,
      flex: 1,
    },
    title: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    careBlock: {
      minWidth: 0,
      alignSelf: 'stretch' as const,
      paddingTop: spacing[0.5],
    },
    actionGroup: {
      ...layoutRow(spacing[2]),
      flexShrink: 0,
      alignItems: 'center' as const,
    },
  };
}
