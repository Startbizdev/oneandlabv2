import { layoutRowWrap } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import type { PrescriptionProfileGap } from '../utils/prescription-profile-gaps';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  gaps: PrescriptionProfileGap[];
  onEditPatient?: () => void;
  onSignPrescriber?: () => void;
  prescriberRole?: string;
}

export function PrescriptionProfileGapsAlert({
  gaps,
  onEditPatient,
  onSignPrescriber,
  prescriberRole,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionProfileGapsAlert');
  const router = useRouter();

  if (gaps.length === 0) return null;

  const patientGaps = gaps.filter((g) => g.action === 'edit_patient');
  const prescriberGaps = gaps.filter((g) => g.action !== 'edit_patient');

  const onGapPress = (gap: PrescriptionProfileGap) => {
    if (gap.action === 'edit_patient') {
      onEditPatient?.();
      return;
    }
    if (gap.action === 'sign_prescriber') {
      onSignPrescriber?.();
      return;
    }
    if (prescriberRole === 'nurse') {
      router.push('/profile/nurse/coordinates' as never);
      return;
    }
    router.push('/profile' as never);
  };

  return (
    <Cluster
      align="start"
      gap={spacing[2.5]}
      style={styles.box}
      leading={<AlertTriangle size={iconSize.mdSm} color={c.warning} strokeWidth={2.25} />}
    >
      <View style={styles.body}>
        <AppText style={styles.title}>À compléter pour l'ordonnance</AppText>
        <AppText style={styles.subtitle}>
          Ces informations figureront sur le PDF. Vous pouvez générer quand même, mais le document sera
          incomplet.
        </AppText>

        {patientGaps.length > 0 ? (
          <View style={styles.group}>
            <AppText style={styles.groupLabel}>Fiche patient</AppText>
            {patientGaps.map((gap) => (
              <GapRow key={gap.id} gap={gap} onPress={() => onGapPress(gap)} styles={styles} />
            ))}
          </View>
        ) : null}

        {prescriberGaps.length > 0 ? (
          <View style={styles.group}>
            <AppText style={styles.groupLabel}>Votre profil</AppText>
            {prescriberGaps.map((gap) => (
              <GapRow key={gap.id} gap={gap} onPress={() => onGapPress(gap)} styles={styles} />
            ))}
          </View>
        ) : null}
      </View>
    </Cluster>
  );
}

function GapRow({
  gap,
  onPress,
  styles,
}: {
  gap: PrescriptionProfileGap;
  onPress: () => void;
  styles: ReturnType<typeof buildStyles>;
}) {
  return (
    <View style={styles.row}>
      <AppText style={styles.rowMessage}>· {gap.message}</AppText>
      <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button">
        <AppText style={styles.rowAction}>{gap.actionLabel}</AppText>
      </Pressable>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    box: {
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.warningMid,
      backgroundColor: c.warningLight,
    },
    body: { minWidth: 0, flex: 1, gap: spacing[2] },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.45,
    },
    group: { gap: spacing[1] },
    groupLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.warning,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.3,
    },
    row: {
      ...layoutRowWrap(spacing[1.5]),
      alignItems: 'center' as const,
    },
    rowMessage: {
      minWidth: 0,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textPrimary,
      flexShrink: 1,
    },
    rowAction: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
    },
  };
}
