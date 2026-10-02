import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Row } from '@/components/layout/primitives';
import { ErrorState } from '@/components/ui/ErrorState';
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
import { H_PADDING, radius, spacing, progressRingSize, AppText, useStyles, type Theme } from '@/theme';

type Props = {
  patientId: string;
  /** `passage` = onglet prise en charge ; `screen` = fiche patient plein écran */
  variant?: 'passage' | 'screen';
  /** Contexte de saisie des constantes (passage, RDV…). */
  clinicalVitalContext?: ClinicalVitalContext;
};

export function PassageFormHealthRecordPanel({
  patientId,
  variant = 'passage',
  clinicalVitalContext,
}: Props) {
  const styles = useStyles(variant === 'screen' ? buildScreenStyles : buildPassageStyles);
  const userRole = useAuthStore((s) => s.user?.role);
  const showClinicalVitals = userRole === 'nurse' || userRole === 'pro';
  const [editSectionId, setEditSectionId] = useState<string | null>(null);
  const [editSectionOpen, setEditSectionOpen] = useState(false);
  const [editPatientOpen, setEditPatientOpen] = useState(false);

  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.staffRecap(patientId),
    queryFn: () => fetchStaffHealthRecord(patientId),
    enabled: Boolean(patientId),
  });

  const { data, refetch } = recapQ;
  const percent = data?.completion?.percent ?? 0;
  const heroSubtitle = healthRecordStaffHeroSubtitle(percent, data?.completion?.missing_count ?? 0);

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
        <ErrorState title="Carnet indisponible" error={recapQ.error} onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.wrap}>
        <View style={styles.heroCard}>
          <Row gap={spacing[4]} align="center">
            <HealthRecordProgressRing percent={percent} size={progressRingSize.lg} strokeWidth={6} />
            <View style={styles.heroText}>
              {variant === 'passage' ? <AppText variant="headline">Carnet de santé</AppText> : null}
              <AppText variant="secondary">{heroSubtitle}</AppText>
            </View>
          </Row>
          <AppText variant="caption">Déclaré par le patient, vous pouvez le compléter.</AppText>
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
            onEdit={(sectionId) => {
              setEditSectionId(sectionId);
              setEditSectionOpen(true);
            }}
          />
        ))}

        <Button title="Modifier la fiche patient" variant="secondary" onPress={() => setEditPatientOpen(true)} />

        {data?.disclaimer_fr ? <AppText variant="caption">{data.disclaimer_fr}</AppText> : null}
      </View>

      <PassageFormHealthRecordSectionSheet
        visible={editSectionOpen}
        patientId={patientId}
        sectionId={editSectionId}
        onClose={() => setEditSectionOpen(false)}
      />

      <StaffPatientEditSheet
        visible={editPatientOpen}
        patientId={patientId}
        onClose={() => setEditPatientOpen(false)}
        onSaved={() => void refetch()}
      />
    </>
  );
}

function buildPassageStyles(t: Theme) {
  return buildStyles(t, H_PADDING);
}

function buildScreenStyles(t: Theme) {
  return buildStyles(t, 0);
}

function buildStyles({ colors: c }: Theme, paddingHorizontal: number) {
  return {
    wrap: {
      gap: spacing[3],
      paddingHorizontal,
      paddingBottom: spacing[10],
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[3],
    },
    heroText: { flex: 1, minWidth: 0, gap: spacing[1] },
  };
}
