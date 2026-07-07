import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock, Layers, Mail, MapPin, MessageCircle, Phone } from 'lucide-react-native';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { formatAvailabilityDisplayFr, formatFrenchWeekdayDate } from '@/utils/appointment-datetime-fr';
import { formatAppointmentCreatedAtMeta } from '@/utils/appointment-detail-display';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { buildPatientContactButtons } from '@/utils/contact-actions';
import {
  appointmentBeneficiaryAvatarMeta,
  beneficiaryBirthLine,
  beneficiaryDisplayName,
  patientContactEmail,
} from '../../utils/patient-appointment-display';
import { radius, spacing, iconSize, avatarSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_RdvDetailHero_tsx_styles');
  const scheduled = primary.scheduled_at ? dayjs(primary.scheduled_at) : null;
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, primary.scheduled_at, fd);
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
  const patientAvatar = useMemo(
    () => appointmentBeneficiaryAvatarMeta(primary),
    [primary],
  );

  return (
    <View style={styles.wrap}>
      <Row justify="between" align="start" gap={spacing[3]}>
        {!hideTitle ? (
          <Row align="start" gap={spacing[2]} style={styles.titleCol}>
            {isMulti ? <Layers size={iconSize.sm} color={c.primary} strokeWidth={2} /> : null}
            <AppText style={styles.title} numberOfLines={2}>
              {title}
            </AppText>
          </Row>
        ) : (
          <View style={styles.titleCol}>
            <AppText style={styles.typeOnly}>{typeLabel}</AppText>
          </View>
        )}
        <StatusBadge status={primary.status} size="sm" />
      </Row>

      {!hideTitle ? <AppText style={styles.type}>{typeLabel}</AppText> : null}

      {dateLine || timeLabel ? (
        <Row wrap gap={spacing[3]} align="center">
          {dateLine ? (
            <Row gap={5} align="center">
              <CalendarDays size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
              <AppText style={styles.scheduleText}>{dateLine}</AppText>
            </Row>
          ) : null}
          {timeLabel ? (
            <Row gap={5} align="center">
              <Clock size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
              <AppText style={styles.scheduleText}>{timeLabel}</AppText>
            </Row>
          ) : null}
        </Row>
      ) : null}

      {name ? (
        <View style={styles.patientBlock}>
          <Cluster
            gap={spacing[3]}
            align="center"
            leading={
              <ProfileAvatar
                profileImageUrl={patientAvatar.profileImageUrl}
                seed={patientAvatar.seed}
                gender={patientAvatar.gender}
                size={avatarSize.sm}
              />
            }
          >
            <View style={styles.patientHeadText}>
              <AppText style={styles.patientName}>{name}</AppText>
              {birth ? <AppText style={styles.patientSub}>{birth}</AppText> : null}
              {email.text ? (
                <AppText style={[styles.patientSub, !email.href && styles.muted]}>{email.text}</AppText>
              ) : null}
            </View>
          </Cluster>
          {contactButtons.length > 0 ? (
            <Row gap={spacing[1.5]} style={styles.buttonRow}>
              {contactButtons.map((btn) => {
                const Icon = CONTACT_ICONS[btn.icon];
                return (
                  <View key={btn.key} style={styles.buttonCell}>
                    <Button
                      title={btn.label}
                      size="sm"
                      variant="primary"
                      leftIcon={<Icon size={iconSize.xs} color={c.textInverse} strokeWidth={2.5} />}
                      onPress={btn.onPress}
                      style={{ backgroundColor: btn.color, width: '100%' as const }}
                    />
                  </View>
                );
              })}
            </Row>
          ) : null}
        </View>
      ) : null}

      {address ? (
        <Pressable
          onPress={onAddressPress}
          disabled={!onAddressPress}
        >
          <Cluster
            gap={6}
            align="start"
            leading={<MapPin size={iconSize.xs} color={c.primary} strokeWidth={2} />}
          >
            <AppText style={styles.addressText}>{address}</AppText>
          </Cluster>
        </Pressable>
      ) : null}

      {createdMeta ? <AppText style={styles.meta}>{createdMeta}</AppText> : null}
      {footer}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[2.5],
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    letterSpacing: -0.4,
    lineHeight: fontSize.xl * 1.15,
  },
  typeOnly: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
  type: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  scheduleText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  patientBlock: {
    gap: spacing[1.5],
    paddingTop: spacing[1],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  patientHeadText: {
    gap: spacing[0.5],
  },
  patientName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  patientSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  muted: {
    color: c.textTertiary,
  },
  buttonRow: {
    marginTop: spacing[1],
  },
  buttonCell: {
    flex: 1,
    minWidth: 0,
  },
  addressText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}

