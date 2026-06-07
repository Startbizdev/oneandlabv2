import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Download } from 'lucide-react-native';
import type { ProPrescriptionRow } from '../api/prescriptions.service';
import {
  formatPrescriptionDateTime,
  prescriptionPatientLabel,
} from '../utils/prescription-display';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  row: ProPrescriptionRow;
  onDownload: () => void;
  onOpenAppointment?: () => void;
  downloading: boolean;
}

export function PrescriptionHistoryCard({
  row,
  onDownload,
  onOpenAppointment,
  downloading,
}: Props) {
  return (
    <View style={[styles.card, elevation.xs]}>
      <View style={styles.top}>
        <View style={styles.dateBlock}>
          <Text style={styles.metaLabel}>Enregistrée le</Text>
          <Text style={styles.metaValue}>{formatPrescriptionDateTime(row.created_at)}</Text>
        </View>
        {row.appointment_status ? (
          <StatusBadge status={row.appointment_status} size="sm" />
        ) : null}
      </View>

      <View>
        <Text style={styles.metaLabel}>Patient</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {prescriptionPatientLabel(row)}
        </Text>
      </View>

      {row.appointment_id ? (
        <View>
          <Text style={styles.metaLabel}>Rendez-vous</Text>
          {onOpenAppointment ? (
            <Pressable onPress={onOpenAppointment}>
              <Text style={styles.link}>
                {formatPrescriptionDateTime(row.appointment_scheduled_at)}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.metaValue}>
              {formatPrescriptionDateTime(row.appointment_scheduled_at)}
            </Text>
          )}
        </View>
      ) : null}

      <View>
        <Text style={styles.metaLabel}>Fichier</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {row.file_name || '—'}
        </Text>
      </View>

      <Button
        title="Télécharger"
        variant="outline"
        size="sm"
        leftIcon={<Download size={14} color={colors.primary} strokeWidth={2} />}
        loading={downloading}
        onPress={onDownload}
        fullWidth
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  dateBlock: { flex: 1, gap: 2 },
  metaLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  link: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_prescriptions_components_PrescriptionHistoryCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
