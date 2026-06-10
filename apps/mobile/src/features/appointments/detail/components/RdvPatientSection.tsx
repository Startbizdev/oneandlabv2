import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import React, { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Phone, MessageSquare, Mail, AlertTriangle } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import type { Appointment } from '@oneandlab/shared-types';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { Card } from '@/components/ui/Card';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import {
  bookingContactName,
  getRelationshipLabel,
  patientDisplayName,
} from '@/utils/appointment-detail-display';
import { appointmentBeneficiaryAvatarMeta } from '../utils/patient-appointment-display';
import { spacing, elevation } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

interface ActionChipProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function ActionChip({ icon, label, onPress }: ActionChipProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, elevation.xs]}>
      {icon}
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

function ContactRow({ phone, email }: { phone: string; email: string }) {
  const callPhone = useCallback(() => void Linking.openURL(`tel:${phone}`), [phone]);
  const smsPhone = useCallback(() => void Linking.openURL(`sms:${phone}`), [phone]);
  const sendEmail = useCallback(() => void Linking.openURL(`mailto:${email}`), [email]);

  if (!phone && !email) return null;

  return (
    <View style={styles.actions}>
      {phone ? (
        <ActionChip
          icon={<Phone size={14} color={colors.primary} strokeWidth={2} />}
          label="Appeler"
          onPress={callPhone}
        />
      ) : null}
      {phone ? (
        <ActionChip
          icon={<MessageSquare size={14} color={colors.primary} strokeWidth={2} />}
          label="Message"
          onPress={smsPhone}
        />
      ) : null}
      {email ? (
        <ActionChip
          icon={<Mail size={14} color={colors.primary} strokeWidth={2} />}
          label="E-mail"
          onPress={sendEmail}
        />
      ) : null}
    </View>
  );
}

interface Props {
  apt: Appointment;
  role: string;
}

export function RdvPatientSection({ apt, role }: Props) {
  if (role === 'patient') return null;

  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const rel = (
    apt as Appointment & {
      relative?: {
        relationship_type?: string;
        is_minor?: boolean;
        age_years?: number;
        birth_date?: string;
        gender?: string;
      };
    }
  ).relative;

  const name = patientDisplayName(apt) || '—';
  const avatar = appointmentBeneficiaryAvatarMeta(apt);
  const phone = String(fd.phone ?? '');
  const email = String(fd.email ?? '');
  const birthRaw = rel?.birth_date ?? fd.birth_date;
  const birth = birthRaw ? formatBirthDateFr(String(birthRaw)) : '';

  const showBookingContact = Boolean(rel);
  const bookingName = bookingContactName(apt);
  const bookingPhone = String(fd.booking_contact_phone ?? fd.phone ?? '');
  const bookingEmail = String(fd.booking_contact_email ?? fd.email ?? '');

  return (
    <Card shadow="sm" padding="md">
      <View style={styles.sectionHeader}>
        <ProfileAvatar
          profileImageUrl={avatar.profileImageUrl}
          seed={avatar.seed}
          gender={avatar.gender}
          size={44}
        />
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionLabel}>{rel ? 'Bénéficiaire' : 'Patient'}</Text>
          <Text style={styles.patientName}>{name}</Text>
        </View>
      </View>

      {birth ? <Text style={styles.birthText}>Né(e) le {birth}</Text> : null}

      {rel?.relationship_type ? (
        <Text style={styles.relText}>Lien : {getRelationshipLabel(rel.relationship_type)}</Text>
      ) : null}

      {rel?.is_minor ? (
        <View style={styles.minorBanner}>
          <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
          <Text style={styles.minorText}>
            Personne mineure
            {rel.age_years != null
              ? ` · ${rel.age_years} an${rel.age_years === 1 ? '' : 's'}`
              : ''}
          </Text>
        </View>
      ) : null}

      <ContactRow phone={phone} email={email} />

      {showBookingContact ? (
        <View style={styles.bookingBlock}>
          <Text style={styles.bookingLabel}>Contact principal</Text>
          <Text style={styles.bookingName}>{bookingName || '—'}</Text>
          <Text style={styles.bookingHint}>Titulaire du compte · personne qui a pris le rendez-vous</Text>
          <ContactRow phone={bookingPhone} email={bookingEmail} />
        </View>
      ) : null}
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  sectionHeaderText: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  patientName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  birthText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginBottom: spacing[1],
  },
  relText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    marginBottom: spacing[1],
  },
  minorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: c.warningLight,
    borderRadius: 8,
    padding: spacing[3],
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  minorText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.warning,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: c.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textPrimary,
  },
  bookingBlock: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    gap: spacing[1],
  },
  bookingLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bookingName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  bookingHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    marginBottom: spacing[1],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_RdvPatientSection_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
