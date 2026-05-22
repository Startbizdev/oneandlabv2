import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Phone, MessageSquare, Mail } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Card } from '@/components/ui/Card';
import {
  getRelationshipLabel,
  patientDisplayName,
} from '@/utils/appointment-detail-display';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  apt: Appointment;
}

/** Bloc patient / proche — équivalent `#patientPortalFooter` + infos compte sur le web. */
export function RdvPatientPortalSection({ apt }: Props) {
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
        <View style={styles.actions}>
          {phone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${phone}`)} style={styles.chip}>
              <Phone size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.chipText}>Appeler</Text>
            </Pressable>
          ) : null}
          {phone ? (
            <Pressable
              onPress={() => void Linking.openURL(`sms:${phone}`)}
              style={styles.chip}
            >
              <MessageSquare size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.chipText}>Message</Text>
            </Pressable>
          ) : null}
          {email ? (
            <Pressable
              onPress={() => void Linking.openURL(`mailto:${email}`)}
              style={styles.chip}
            >
              <Mail size={14} color={colors.primary} strokeWidth={2} />
              <Text style={styles.chipText}>E-mail</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  block: {
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
});
