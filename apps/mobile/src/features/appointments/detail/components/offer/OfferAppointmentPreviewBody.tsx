import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Calendar,
  CalendarDays,
  Clock,
  Droplet,
  MapPin,
  MessageSquare,
  Repeat,
  Stethoscope,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment } from '@oneandlab/shared-utils';
import { useAppointmentCareCategories } from '../../hooks/use-appointment-care-categories';
import {
  offerAdditionalCareOptionRows,
  offerAddressLine,
  offerAppointmentNotes,
  offerAvailabilityLabel,
  offerBloodTestTypeLabel,
  offerCareTagLines,
  offerDateTimeLabel,
  offerDurationLabel,
  offerFrequencyLabel,
  offerLabPartnerFromAppointment,
} from '../../utils/offer-appointment-display';
import { rdvListCardType } from '@/features/appointments/components/rdv-list-card-typography';
import { OfferInfoRow } from './OfferInfoRow';
import { OfferLabPartnerSection } from './OfferLabPartnerSection';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  primary: Appointment;
  batch: Appointment[];
}

function OfferCareTagsBlock({ batch }: { batch: Appointment[] }) {
  const lines = useMemo(() => offerCareTagLines(batch), [batch]);
  if (!lines.length) return null;

  return (
    <View style={styles.careTagsBlock}>
      <View style={styles.careTagsWrap}>
        {lines.map((line, idx) => (
          <View
            key={`${line.category_id ?? 'noid'}-${idx}-${line.label}`}
            style={styles.careTag}
          >
            <Text style={styles.careTagEmoji} accessibilityElementsHidden>
              {line.emoji}
            </Text>
            <Text style={styles.careTagLabel} numberOfLines={1}>
              {line.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function OfferCard({ primary, batch }: { primary: Appointment; batch: Appointment[] }) {
  const { data: categories = [] } = useAppointmentCareCategories();
  const notes = offerAppointmentNotes(primary);
  const extraOptions = useMemo(
    () => offerAdditionalCareOptionRows(primary, batch, categories),
    [batch, categories, primary],
  );

  const rows: { icon: LucideIcon; label: string; value: string }[] = [];

  const dateTime = offerDateTimeLabel(primary);
  if (dateTime) rows.push({ icon: Calendar, label: 'Date souhaitée', value: dateTime });

  if (isBloodTestAppointment(primary.type)) {
    const bt = offerBloodTestTypeLabel(primary);
    if (bt) rows.push({ icon: Droplet, label: 'Prélèvement', value: bt });
  }

  const duration = offerDurationLabel(primary);
  if (duration) rows.push({ icon: CalendarDays, label: 'Durée', value: duration });

  const freq = offerFrequencyLabel(primary);
  if (freq) rows.push({ icon: Repeat, label: 'Fréquence', value: freq });

  const avail = offerAvailabilityLabel(primary);
  if (avail && !(dateTime && dateTime.includes(avail))) {
    rows.push({ icon: Clock, label: 'Disponibilité', value: avail });
  }

  for (const opt of extraOptions) {
    rows.push({ icon: Stethoscope, label: opt.label, value: opt.value });
  }

  const addr = offerAddressLine(primary);
  rows.push({ icon: MapPin, label: 'Adresse', value: addr });

  return (
    <View style={styles.card}>
      <OfferCareTagsBlock batch={batch} />
      {rows.map((r, i) => (
        <OfferInfoRow
          key={`${r.label}-${i}`}
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

export function OfferAppointmentPreviewBody({ primary, batch }: Props) {
  const lab = offerLabPartnerFromAppointment(primary);

  return (
    <View style={styles.wrap}>
      <OfferCard primary={primary} batch={batch} />
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
  careTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'stretch',
  },
  careTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryMid,
  },
  careTagEmoji: rdvListCardType.careEmoji,
  careTagLabel: rdvListCardType.careTag,
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  notesBlock: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
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
