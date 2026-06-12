import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Download, Eye } from 'lucide-react-native';
import type { ProPrescriptionRow } from '../api/prescriptions.service';
import {
  formatPrescriptionDateCompact,
  formatPrescriptionDateTime,
  prescriptionCareLabel,
  prescriptionCreneauLabel,
  prescriptionKindShortLabel,
  prescriptionPatientLabel,
} from '../utils/prescription-display';
import { MiniDateCalendar } from '@/components/ui/MiniDateCalendar';
import { StatusBadge } from '@/components/ui/Badge';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  row: ProPrescriptionRow;
  onDownload: () => void;
  onPreview?: () => void;
  onOpenAppointment?: () => void;
  downloading: boolean;
  previewing?: boolean;
  showPatient?: boolean;
}

export function PrescriptionHistoryCard({
  row,
  onDownload,
  onPreview,
  onOpenAppointment,
  downloading,
  previewing = false,
  showPatient = true,
}: Props) {
  const styles = useCardStyles();
  const recordedAt = formatPrescriptionDateTime(row.generated_at || row.created_at);
  const kindLabel = prescriptionKindShortLabel(row.prescription_kind);
  const linked = Boolean(row.appointment_id);

  const actions = (
    <View style={styles.actions}>
      {onPreview ? (
        <Pressable
          onPress={onPreview}
          disabled={previewing}
          accessibilityRole="button"
          accessibilityLabel="Voir l'ordonnance"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          hitSlop={6}
        >
          {previewing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Eye size={16} color={colors.primary} strokeWidth={2} />
          )}
        </Pressable>
      ) : null}
      <Pressable
        onPress={onDownload}
        disabled={downloading}
        accessibilityRole="button"
        accessibilityLabel="Télécharger l'ordonnance"
        style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
        hitSlop={6}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Download size={16} color={colors.primary} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );

  if (!linked) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.main}>
            <Text style={styles.standaloneTitle}>Sans rendez-vous</Text>
            <Text style={styles.metaLine}>
              {recordedAt}
              {kindLabel ? ` · ${kindLabel}` : ''}
            </Text>
            {showPatient ? (
              <Text style={styles.patientLine} numberOfLines={1}>
                {prescriptionPatientLabel(row)}
              </Text>
            ) : null}
          </View>
          {actions}
        </View>
      </View>
    );
  }

  const rdvBody = (
    <>
      <MiniDateCalendar date={row.appointment_scheduled_at} size="xs" variant="brand" />
      <View style={styles.rdvCol}>
        <View style={styles.creneauRow}>
          <Text style={styles.creneau} numberOfLines={1}>
            {prescriptionCreneauLabel(row)}
          </Text>
          {row.appointment_status ? (
            <StatusBadge status={row.appointment_status} size="sm" dotOnly />
          ) : null}
        </View>
        <Text style={styles.careTag} numberOfLines={1}>
          {prescriptionCareLabel(row)}
        </Text>
      </View>
      {onOpenAppointment ? (
        <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} />
      ) : null}
    </>
  );

  return (
    <View style={styles.card}>
      {onOpenAppointment ? (
        <Pressable
          onPress={onOpenAppointment}
          style={({ pressed }) => [styles.rdvPress, pressed && styles.rdvPressed]}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le rendez-vous"
        >
          {rdvBody}
        </Pressable>
      ) : (
        <View style={styles.rdvPress}>{rdvBody}</View>
      )}

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.footerMeta} numberOfLines={1}>
            Enregistrée {formatPrescriptionDateCompact(row.generated_at || row.created_at)}
            {showPatient ? ` · ${prescriptionPatientLabel(row)}` : ''}
          </Text>
        </View>
        {actions}
      </View>
    </View>
  );
}

function useCardStyles() {
  return getThemedStyles(
    'features_prescriptions_components_PrescriptionHistoryCard_tsx_styles',
    buildStyles,
  ) as ReturnType<typeof buildStyles>;
}

function buildStyles(c: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
    },
    main: { flex: 1, minWidth: 0, gap: 2 },
    standaloneTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    metaLine: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    patientLine: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      marginTop: 2,
    },
    rdvPress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2.5],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    rdvPressed: { backgroundColor: c.surfaceAlt },
    rdvCol: { flex: 1, minWidth: 0, gap: 2 },
    creneauRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    creneau: {
      flex: 1,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    careTag: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    footerText: { flex: 1, minWidth: 0 },
    footerMeta: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1.5],
      flexShrink: 0,
    },
    iconBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    iconBtnPressed: { opacity: 0.75 },
  });
}
