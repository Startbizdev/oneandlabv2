import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock, Layers, Mail, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatAvailabilityDisplayFr, formatFrenchWeekdayDate } from '@/utils/appointment-datetime-fr';
import { formatAppointmentCreatedAtMeta } from '@/utils/appointment-detail-display';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { buildPatientContactButtons } from '@/utils/contact-actions';
import {
  beneficiaryBirthLine,
  beneficiaryDisplayName,
  patientContactEmail,
} from '../../utils/patient-appointment-display';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

const CONTACT_ICONS = {
  phone: Phone,
  message: MessageCircle,
  email: Mail,
} as const;

interface Props {
  primary: Appointment;
  batchCount?: number;
  viewer?: AuthUser | null;
  /** Titre déjà dans la barre de navigation */
  hideTitle?: boolean;
  onAddressPress?: () => void;
  footer?: ReactNode;
}

export function RdvDetailHero({
  primary,
  batchCount = 1,
  viewer,
  hideTitle = false,
  onAddressPress,
  footer,
}: Props) {
  const scheduled = primary.scheduled_at ? dayjs(primary.scheduled_at) : null;
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, primary.scheduled_at);
  const isMulti = batchCount > 1;

  const typeLabel = isBloodTestAppointment(primary.type)
    ? 'Prélèvement'
    : isNursingAppointment(primary.type)
      ? 'Soins infirmiers'
      : 'Rendez-vous';

  const title = isMulti
    ? `Lot · ${batchCount} rendez-vous`
    : (primary.category_name ?? 'Rendez-vous');

  const dateLine = scheduled ? formatFrenchWeekdayDate(primary.scheduled_at, 'ddd D MMMM YYYY') : null;
  const name = beneficiaryDisplayName(primary);
  const birth = beneficiaryBirthLine(primary);
  const address = appointmentAddressLine(primary);
  const createdMeta = formatAppointmentCreatedAtMeta(primary);
  const email = patientContactEmail(primary, viewer ?? undefined);
  const contactButtons = useMemo(
    () => buildPatientContactButtons(primary, viewer),
    [primary, viewer],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        {!hideTitle ? (
          <View style={styles.titleCol}>
            {isMulti ? <Layers size={16} color={colors.primary} strokeWidth={2} /> : null}
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
        ) : (
          <View style={styles.titleCol}>
            <Text style={styles.typeOnly}>{typeLabel}</Text>
          </View>
        )}
        <StatusBadge status={primary.status} size="sm" />
      </View>

      {!hideTitle ? <Text style={styles.type}>{typeLabel}</Text> : null}

      {dateLine || timeLabel ? (
        <View style={styles.scheduleRow}>
          {dateLine ? (
            <View style={styles.scheduleItem}>
              <CalendarDays size={13} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.scheduleText}>{dateLine}</Text>
            </View>
          ) : null}
          {timeLabel ? (
            <View style={styles.scheduleItem}>
              <Clock size={13} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.scheduleText}>{timeLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {name ? (
        <View style={styles.patientBlock}>
          <Text style={styles.patientName}>{name}</Text>
          {birth ? <Text style={styles.patientSub}>{birth}</Text> : null}
          {email.text ? (
            <Text style={[styles.patientSub, !email.href && styles.muted]}>{email.text}</Text>
          ) : null}
          {contactButtons.length > 0 ? (
            <View style={styles.buttonRow}>
              {contactButtons.map((btn) => {
                const Icon = CONTACT_ICONS[btn.icon];
                return (
                  <View key={btn.key} style={styles.buttonCell}>
                    <Button
                      title={btn.label}
                      size="sm"
                      variant="primary"
                      leftIcon={<Icon size={14} color={colors.textInverse} strokeWidth={2.5} />}
                      onPress={btn.onPress}
                      style={{ backgroundColor: btn.color, width: '100%' }}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {address ? (
        <Pressable
          onPress={onAddressPress}
          disabled={!onAddressPress}
          style={styles.addressRow}
        >
          <MapPin size={13} color={colors.primary} strokeWidth={2} />
          <Text style={styles.addressText} numberOfLines={2}>
            {address}
          </Text>
        </Pressable>
      ) : null}

      {createdMeta ? <Text style={styles.meta}>{createdMeta}</Text> : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    minWidth: 0,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    letterSpacing: -0.4,
    lineHeight: fontSize.xl * 1.15,
  },
  typeOnly: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  type: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    alignItems: 'center',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  patientBlock: {
    gap: spacing[1.5],
    paddingTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  patientName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  patientSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  muted: {
    color: colors.textTertiary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
    marginTop: spacing[1],
  },
  buttonCell: {
    flex: 1,
    minWidth: 0,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
  },
});
