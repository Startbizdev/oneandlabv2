import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Phone, MessageSquare, Mail } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import {
  getRelationshipLabel,
  patientDisplayName,
} from '@/utils/appointment-detail-display';
import { spacing } from '@/theme';
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
          <Text style={styles.label}>Pour qui</Text>
          <Text style={styles.value}>{patientDisplayName(apt) || '—'}</Text>
          {rel.relationship_type ? (
            <Text style={styles.hint}>{getRelationshipLabel(rel.relationship_type)}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.label}>{rel ? 'Titulaire du compte' : 'Patient'}</Text>
        <Text style={styles.value}>{accountName}</Text>
        <Row wrap gap={spacing[2]} style={styles.actions}>
          {phone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${phone}`)}>
              <Row gap={6} align="center" style={styles.chip}>
                <Phone size={14} color={c.primary} strokeWidth={2} />
                <Text style={styles.chipText}>Appeler</Text>
              </Row>
            </Pressable>
          ) : null}
          {phone ? (
            <Pressable onPress={() => void Linking.openURL(`sms:${phone}`)}>
              <Row gap={6} align="center" style={styles.chip}>
                <MessageSquare size={14} color={c.primary} strokeWidth={2} />
                <Text style={styles.chipText}>Message</Text>
              </Row>
            </Pressable>
          ) : null}
          {email ? (
            <Pressable onPress={() => void Linking.openURL(`mailto:${email}`)}>
              <Row gap={6} align="center" style={styles.chip}>
                <Mail size={14} color={c.primary} strokeWidth={2} />
                <Text style={styles.chipText}>E-mail</Text>
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
