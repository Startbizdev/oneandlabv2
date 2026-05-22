import { StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  CalendarDays,
  Clock,
  Droplet,
  Layers,
  MapPin,
  MessageSquare,
  Repeat,
  Stethoscope,
} from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment } from '@oneandlab/shared-utils';
import {
  offerAddressLine,
  offerAppointmentNotes,
  offerAvailabilityDisplayLine,
  offerAvailabilityLabel,
  offerBatchLotSummaryLabel,
  offerBloodTestTypeLabel,
  offerDateShort,
  offerDateTimeLabel,
  offerDurationLabel,
  offerFrequencyLabel,
  offerLabPartnerFromAppointment,
  offerShowBatchCard,
} from '../../utils/offer-appointment-display';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { OfferInfoRow } from './OfferInfoRow';
import { OfferLabPartnerSection } from './OfferLabPartnerSection';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  primary: Appointment;
  batch: Appointment[];
}

function SingleOfferCard({ appt }: { appt: Appointment }) {
  const notes = offerAppointmentNotes(appt);
  const rows: { icon: typeof Stethoscope; label: string; value: string }[] = [];

  const dateTime = offerDateTimeLabel(appt);
  if (dateTime) rows.push({ icon: Calendar, label: 'Date souhaitée', value: dateTime });

  if (isBloodTestAppointment(appt.type)) {
    const bt = offerBloodTestTypeLabel(appt);
    if (bt) rows.push({ icon: Droplet, label: 'Prélèvement', value: bt });
  }

  const duration = offerDurationLabel(appt);
  if (duration) rows.push({ icon: CalendarDays, label: 'Durée', value: duration });

  const freq = offerFrequencyLabel(appt);
  if (freq) rows.push({ icon: Repeat, label: 'Fréquence', value: freq });

  const avail = offerAvailabilityLabel(appt);
  if (avail && !(dateTime && dateTime.includes(avail))) {
    rows.push({ icon: Clock, label: 'Disponibilité', value: avail });
  }

  const addr = offerAddressLine(appt);
  rows.push({ icon: MapPin, label: 'Adresse', value: addr });

  return (
    <View style={styles.card}>
      <View style={styles.careTagsBlock}>
        <RdvCareTagsRow apt={appt} />
      </View>
      {rows.map((r, i) => (
        <OfferInfoRow
          key={r.label}
          icon={r.icon}
          label={r.label}
          value={r.value}
          bordered={i > 0}
        />
      ))}
      {notes ? (
        <View style={styles.notesBlock}>
          <View style={styles.notesHead}>
            <MessageSquare size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={styles.notesLabel}>Message</Text>
          </View>
          <Text style={styles.notesText}>{notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

function BatchOfferCard({ batch }: { batch: Appointment[] }) {
  const primary = batch[0]!;
  const lotLabel = offerBatchLotSummaryLabel(batch);
  const notes = offerAppointmentNotes(primary);

  return (
    <View style={styles.card}>
      {lotLabel ? (
        <View style={styles.lotBanner}>
          <Layers size={14} color={colors.primary} strokeWidth={2.25} />
          <Text style={styles.lotBannerText}>{lotLabel}</Text>
        </View>
      ) : null}
      {batch.map((appt, idx) => {
        const duration = offerDurationLabel(appt);
        const avail = offerAvailabilityLabel(appt);
        const meta = [duration, avail].filter(Boolean).join(' · ');
        return (
          <View
            key={appt.id}
            style={[styles.batchItem, idx > 0 && styles.batchItemBorder]}
          >
            <View style={styles.batchItemHead}>
              <View style={styles.batchItemMain}>
                <Text style={styles.batchNum}>{idx + 1}.</Text>
                <RdvCareTagsRow apt={appt} />
              </View>
              <Text style={styles.batchDate}>{offerDateShort(appt)}</Text>
            </View>
            {meta ? <Text style={styles.batchMeta}>{meta}</Text> : null}
          </View>
        );
      })}
      <View style={[styles.addressFooter, styles.batchItemBorder]}>
        <Text style={styles.footerKicker}>Adresse</Text>
        <Text style={styles.footerValue}>{offerAddressLine(primary)}</Text>
      </View>
      {notes ? (
        <View style={[styles.notesBlock, styles.batchItemBorder]}>
          <View style={styles.notesHead}>
            <MessageSquare size={14} color={colors.textTertiary} strokeWidth={2} />
            <Text style={styles.notesLabel}>Message</Text>
          </View>
          <Text style={styles.notesText}>{notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function OfferAppointmentPreviewBody({ primary, batch }: Props) {
  const lab = offerLabPartnerFromAppointment(primary);
  const showBatch = offerShowBatchCard(batch, primary);

  return (
    <View style={styles.wrap}>
      {showBatch ? <BatchOfferCard batch={batch} /> : <SingleOfferCard appt={primary} />}
      {lab ? <OfferLabPartnerSection lab={lab} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  careTagsBlock: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  lotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.primaryLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  lotBannerText: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    lineHeight: fontSize.xs * 1.35,
  },
  batchItem: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1],
  },
  batchItemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  batchItemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  batchItemMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1.5],
  },
  batchNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    lineHeight: fontSize.xs * 1.5,
    marginTop: 4,
  },
  batchDate: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    maxWidth: '38%',
    textAlign: 'right',
  },
  batchMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  addressFooter: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[1],
    backgroundColor: colors.surfaceAlt,
  },
  footerKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  footerValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  notesBlock: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.surfaceAlt,
  },
  notesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  notesLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  notesText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
});
