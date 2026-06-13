import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
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
import { iconSize, radius, spacing } from '@/theme';
import { layoutRow } from '@/theme/layout-styles';
import { Download, Eye } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const styles = useThemedStyles(buildRowStyles, 'PrescriptionHistoryCard');
  const title = prescriptionHistoryRowTitle(row, { showPatient });
  const hint = prescriptionHistoryRowHint(row, { showPatient });
  const busy = downloading || previewing;
  const lotLabel = prescriptionLotLabelFromMeta(
    row.appointment_batch_count,
    row.appointment_type,
  );
  const linkedApt = row.appointment_id ? prescriptionRowAsAppointment(row) : null;

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
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          <Text style={styles.hint} numberOfLines={2}>
            {hint}
          </Text>
          {linkedApt ? (
            <Stack gap={spacing[0.5]} style={styles.careBlock}>
              {lotLabel ? (
                <Text style={styles.lotLabel} numberOfLines={1}>
                  {lotLabel}
                </Text>
              ) : null}
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
              backgroundColor={c.surfaceAlt}
              style={styles.actionBtn}
            >
              <Eye size={iconSize.sm} color={c.textSecondary} strokeWidth={2.25} />
            </IconActionButton>
          ) : null}
          <IconActionButton
            label="Télécharger l'ordonnance"
            onPress={onDownload}
            loading={downloading}
            disabled={busy}
            variant="secondary"
            backgroundColor={c.primaryLight}
            style={styles.actionBtn}
          >
            <Download size={iconSize.sm} color={c.primary} strokeWidth={2.25} />
          </IconActionButton>
        </View>
      }
    />
  );
}

/** Conteneur liste bordée (style table). */
export function PrescriptionHistoryList({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(buildListStyles, 'PrescriptionHistoryList');

  return <View style={styles.table}>{children}</View>;
}

function buildRowStyles(c: AppColors) {
  return {
    row: {
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[3],
      alignItems: 'flex-start' as const,
    },
    textCol: {
      minWidth: 0,
      flex: 1,
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.3,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.35,
    },
    careBlock: {
      minWidth: 0,
      alignSelf: 'stretch' as const,
      paddingTop: spacing[0.5],
    },
    lotLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
      letterSpacing: 0.15,
    },
    actionGroup: {
      ...layoutRow(spacing[1]),
      flexShrink: 0,
      alignItems: 'center' as const,
      paddingTop: spacing[0.5],
    },
    actionBtn: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
    },
  };
}

function buildListStyles(c: AppColors) {
  return {
    table: {
      minWidth: 0,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
  };
}
