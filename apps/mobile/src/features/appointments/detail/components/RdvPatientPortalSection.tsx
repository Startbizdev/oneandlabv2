import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Phone, MessageSquare, Mail } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import {
  getRelationshipLabel,
  patientDisplayName,
} from '@/utils/appointment-detail-display';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
}

/** Bloc patient / proche — équivalent `#patientPortalFooter` + infos compte sur le web. */
export function RdvPatientPortalSection({ apt }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvPatientPortalSection_tsx_RdvPatientPortalSection_styles');

  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const rel = (
    apt as Appointment & {
      relative?: { relationship_type?: string; first_name?: string; last_name?: string };
    }
  ).relative;

  const accountName = `${fd.first_name ?? ''} ${fd.last_name ?? ''}`.trim() || '—';
  const phone = String(fd.phone ?? '');
  const email = String(fd.email ?? '');

  return (
    <Card shadow="sm" padding="md">
      {rel ? (
        <View style={styles.block}>
          <AppText style={styles.label}>Pour qui</AppText>
          <AppText style={styles.value}>{patientDisplayName(apt) || '—'}</AppText>
          {rel.relationship_type ? (
            <AppText style={styles.hint}>{getRelationshipLabel(rel.relationship_type)}</AppText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.block}>
        <AppText style={styles.label}>{rel ? 'Titulaire du compte' : 'Patient'}</AppText>
        <AppText style={styles.value}>{accountName}</AppText>
        <Row wrap gap={spacing[2]} style={styles.actions}>
          {phone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${phone}`)}>
              <Row gap={6} align="center" style={styles.chip}>
                <Phone size={iconSize.xs} color={c.primary} strokeWidth={2} />
                <AppText style={styles.chipText}>Appeler</AppText>
              </Row>
            </Pressable>
          ) : null}
          {phone ? (
            <Pressable onPress={() => void Linking.openURL(`sms:${phone}`)}>
              <Row gap={6} align="center" style={styles.chip}>
                <MessageSquare size={iconSize.xs} color={c.primary} strokeWidth={2} />
                <AppText style={styles.chipText}>Message</AppText>
              </Row>
            </Pressable>
          ) : null}
          {email ? (
            <Pressable onPress={() => void Linking.openURL(`mailto:${email}`)}>
              <Row gap={6} align="center" style={styles.chip}>
                <Mail size={iconSize.xs} color={c.primary} strokeWidth={2} />
                <AppText style={styles.chipText}>E-mail</AppText>
              </Row>
            </Pressable>
          ) : null}
        </Row>
      </View>
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  block: {
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  value: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  actions: {
    marginTop: spacing[2],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
};
}
