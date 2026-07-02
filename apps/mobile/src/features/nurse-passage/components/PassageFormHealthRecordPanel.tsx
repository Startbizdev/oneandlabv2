import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HeartPulse } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/Button';
import { fetchStaffHealthRecord } from '@/features/health-record/api/health-record.service';
import { HealthRecordProgressRing } from '@/features/health-record/components/HealthRecordProgressRing';
import { HealthRecordSectionRecap } from '@/features/health-record/components/HealthRecordSectionRecap';
import { healthRecordQueryKeys } from '@/features/health-record/hooks/use-health-record-completion';
import { healthRecordStaffHeroSubtitle } from '@/features/health-record/utils/health-record-display';
import type { ClinicalVitalContext } from '@oneandlab/shared-types';
import { ClinicalVitalsPanel } from '@/features/health-record/components/ClinicalVitalsPanel';
import { StaffPatientEditSheet } from '@/features/patients/components/StaffPatientEditSheet';
import { useAuthStore } from '@/store/auth-store';
import { PassageFormHealthRecordSectionSheet } from './PassageFormHealthRecordSectionSheet';
import { elevation, H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  patientId: string;
  /** `passage` = onglet prise en charge ; `screen` = fiche patient plein écran */
  variant?: 'passage' | 'screen';
  /** Incrémenter pour forcer un rechargement (pull-to-refresh parent). */
  refreshKey?: number;
  /** Contexte de saisie des constantes (passage, RDV…). */
  clinicalVitalContext?: ClinicalVitalContext;
};

export function PassageFormHealthRecordPanel({
  patientId,
  variant = 'passage',
  refreshKey = 0,
  clinicalVitalContext,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles((c) => buildStyles(c, variant));
  const userRole = useAuthStore((s) => s.user?.role);
  const showClinicalVitals = userRole === 'nurse' || userRole === 'pro';
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editPatientOpen, setEditPatientOpen] = useState(false);

  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.staffRecap(patientId),
    queryFn: () => fetchStaffHealthRecord(patientId),
    enabled: Boolean(patientId),
  });

  const data = recapQ.data;
  const percent = data?.completion?.percent ?? 0;
  const heroSubtitle = healthRecordStaffHeroSubtitle(percent, data?.completion?.missing_count ?? 0);

  useEffect(() => {
    if (refreshKey > 0) void recapQ.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on refreshKey only
  }, [refreshKey]);

  if (recapQ.isLoading && !data) {
    return (
      <View style={styles.wrap}>
        <SkeletonList count={4} itemHeight={56} gap={spacing[2]} />
      </View>
    );
  }

  if (recapQ.isError) {
    return (
      <View style={styles.wrap}>
        <EmptyState
          title="Carnet inaccessible"
          description={
            recapQ.error instanceof Error ? recapQ.error.message : 'Impossible de charger le carnet.'
          }
          actionLabel="Réessayer"
          onAction={() => void recapQ.refetch()}
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Données déclarées par le patient — vous pouvez les compléter ou corriger ici.
          </Text>
        </View>

        <View style={[styles.heroCard, elevation.sm]}>
          <Row gap={spacing[4]} align="center">
            <HealthRecordProgressRing percent={percent} size={72} strokeWidth={6} />
            <View style={styles.heroText}>
              <Row gap={spacing[2]} align="center">
                <View style={[styles.heroIcon, { backgroundColor: c.primaryLight }]}>
                  <HeartPulse size={16} color={c.primary} strokeWidth={2} />
                </View>
                <Text style={styles.heroTitle}>Carnet de santé</Text>
              </Row>
              <Text style={styles.heroSub}>{heroSubtitle}</Text>
            </View>
          </Row>
        </View>

        {showClinicalVitals ? (
          <ClinicalVitalsPanel
            patientId={patientId}
            context={clinicalVitalContext ?? (variant === 'passage' ? { type: 'passage' } : { type: 'general' })}
          />
        ) : null}

        {(data?.sections ?? []).map((section) => (
          <HealthRecordSectionRecap
            key={section.id}
            section={section}
            onEdit={(sectionId) => setEditSectionId(sectionId)}
          />
        ))}

        <Button title="Modifier la fiche patient" variant="secondary" onPress={() => setEditPatientOpen(true)} />

        <Text style={styles.disclaimer}>{data?.disclaimer_fr}</Text>
      </View>

      <PassageFormHealthRecordSectionSheet
        visible={Boolean(editSectionId)}
        patientId={patientId}
        sectionId={editSectionId}
        onClose={() => setEditSectionId(null)}
      />

      <StaffPatientEditSheet
        visible={editPatientOpen}
        patientId={patientId}
        onClose={() => setEditPatientOpen(false)}
        onSaved={() => void recapQ.refetch()}
      />
    </>
  );
}

function buildStyles(c: AppColors, variant: 'passage' | 'screen' = 'passage') {
  return {
    wrap: {
      gap: spacing[3],
      paddingHorizontal: variant === 'screen' ? 0 : H_PADDING,
      paddingBottom: spacing[10],
    },
    banner: {
      backgroundColor: c.warningLight ?? c.primaryLight,
      borderRadius: radius.lg,
      padding: spacing[3],
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    bannerText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: 20,
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
    },
    heroIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    heroText: { flex: 1, minWidth: 0, gap: spacing[1] },
    heroTitle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    heroSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    disclaimer: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.45,
    },
  };
}
