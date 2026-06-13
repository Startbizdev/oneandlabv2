import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { User, FileCheck, XCircle } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import {
  computePreleveurBannerPhase,
  preleveurBannerSubtitle,
  preleveurBannerTitle,
} from '@/utils/preleveur-live-banner';
import type { MedicalDocumentRow } from '../../api/appointment-detail.service';
import { PatientListCard, PatientListRow } from './PatientListPrimitives';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function PatientPreleveurAlerts({
  batch }: { batch: Appointment[] }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientEngagementSections');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const alerts = useMemo(
    () =>
      batch
        .map((appt) => {
          const phase = computePreleveurBannerPhase(appt, now);
          if (phase === 'hidden') return null;
          return { appt, phase };
        })
        .filter(Boolean) as { appt: Appointment; phase: 'en_route' | 'arrive' }[],
    [batch, now],
  );

  if (!alerts.length) return null;

  return (
    <>
      {alerts.map(({ appt, phase }) => (
        <Cluster
          key={appt.id}
          gap={spacing[3]}
          align="start"
          style={[styles.alertCard, phase === 'arrive' && styles.alertArrive]}
          leading={
            <User
              size={20}
              color={phase === 'arrive' ? c.success : c.primary}
              strokeWidth={2}
            />
          }
        >
          <View style={styles.alertTexts}>
            <Text style={styles.alertTitle}>{preleveurBannerTitle(appt, phase)}</Text>
            <Text style={styles.alertSub}>{preleveurBannerSubtitle(appt, phase)}</Text>
          </View>
        </Cluster>
      ))}
    </>
  );
}

export function PatientFooterActions({
  batch,
  documents,
  canceled,
  cancelCount,
  onCancel,
  onScrollToDocuments,
}: {
  batch: Appointment[];
  documents: MedicalDocumentRow[];
  canceled: boolean;
  cancelCount: number;
  onCancel: () => void;
  onScrollToDocuments?: () => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientEngagementSections');
  const resultats = documents.filter((d) => d.document_type === 'resultats');
  const completed = batch.filter((a) => a.status === 'completed');

  if (canceled) return null;

  const rows: { label: string; node: ReactNode; last?: boolean }[] = [];

  if (resultats.length > 0) {
    rows.push({
      label: 'Résultats',
      node: (
        <Pressable onPress={onScrollToDocuments}>
          <Row gap={spacing[2]} align="center" style={styles.actionBtn}>
            <FileCheck size={16} color={c.primary} strokeWidth={2} />
            <Text style={styles.actionBtnText}>Voir les résultats</Text>
          </Row>
        </Pressable>
      ),
    });
  }

  if (cancelCount > 0) {
    rows.push({
      label: 'Annulation',
      last: true,
      node: (
        <Pressable onPress={onCancel}>
          <Row gap={spacing[2]} align="center" style={[styles.actionBtn, styles.actionBtnDanger]}>
            <XCircle size={16} color={c.error} strokeWidth={2} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
              {cancelCount > 1 ? 'Annuler les rendez-vous du lot' : 'Annuler le rendez-vous'}
            </Text>
          </Row>
        </Pressable>
      ),
    });
  }

  if (!rows.length && !completed.length) return null;

  return (
    <PatientListCard title="Actions">
      {rows.map((r, i) => (
        <PatientListRow key={r.label} label={r.label} last={r.last ?? i === rows.length - 1}>
          {r.node}
        </PatientListRow>
      ))}
    </PatientListCard>
  );
}

function buildStyles(c: AppColors) {
  return {
    alertCard: {
      backgroundColor: c.primaryLight,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.primaryMid,
      padding: spacing[4],
    },
    alertArrive: {
      backgroundColor: c.successLight,
      borderColor: c.successMid,
    },
    alertTexts: { gap: 4 },
    alertTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    alertSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: 18,
    },
    actionBtn: {
      alignSelf: 'flex-start' as const,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      backgroundColor: c.primaryLight,
    },
    actionBtnDanger: {
      backgroundColor: c.errorLight,
    },
    actionBtnText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
    },
    actionBtnTextDanger: {
      color: c.error,
    },
  };
}
