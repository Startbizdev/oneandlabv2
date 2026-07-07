import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo } from 'react';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import {
  buildCareTileOrbColorMap,
  resolveRdvCareTagColors,
} from '@/features/appointments/form/utils/booking-care-catalog';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
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
import { buildRdvListCardTypography } from '@/features/appointments/components/rdv-list-card-typography';
import { OfferInfoRow } from './OfferInfoRow';
import { OfferLabPartnerSection } from './OfferLabPartnerSection';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  primary: Appointment;
  batch: Appointment[];
}

function OfferCareTagsBlock({ batch }: { batch: Appointment[] }) {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const tagStyles = useThemedStyles(buildCareTagStyles);
  const { data: categories = [] } = useAppointmentCareCategories();
  const lines = useMemo(() => offerCareTagLines(batch), [batch]);
  const orbColorMap = useMemo(
    () => buildCareTileOrbColorMap(categories),
    [categories, colorblindType],
  );
  const primaryType = batch[0]?.type ?? 'nursing';
  if (!lines.length) return null;

  return (
    <View style={tagStyles.careTagsBlock}>
      <Row wrap align="center" gap={5} style={tagStyles.careTagsWrap}>
        {lines.map((line, idx) => {
          const tagColors = resolveRdvCareTagColors(line, primaryType, categories, orbColorMap);
          return (
            <Row
              key={`${line.category_id ?? 'noid'}-${idx}-${line.label}`}
              align="center"
              gap={4}
              style={[
                tagStyles.careTag,
                {
                  backgroundColor: tagColors.backgroundColor,
                  borderColor: tagColors.borderColor,
                },
              ]}
            >
              <AppText style={tagStyles.careTagEmoji} accessibilityElementsHidden>
                {line.emoji}
              </AppText>
              <AppText style={tagStyles.careTagLabel} numberOfLines={1}>
                {line.label}
              </AppText>
            </Row>
          );
        })}
      </Row>
    </View>
  );
}

function OfferCard({ primary, batch }: { primary: Appointment; batch: Appointment[] }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildCardStyles);
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
          <Row align="center" gap={spacing[2]} style={styles.notesHead}>
            <MessageSquare size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
            <AppText style={styles.notesLabel}>Message</AppText>
          </Row>
          <AppText style={styles.notesText}>{notes}</AppText>
        </View>
      ) : null}
    </View>
  );
}

export function OfferAppointmentPreviewBody({ primary, batch }: Props) {
  const styles = useThemedStyles(buildPreviewStyles);
  const lab = offerLabPartnerFromAppointment(primary);

  return (
    <View style={styles.wrap}>
      <OfferCard primary={primary} batch={batch} />
      {lab ? <OfferLabPartnerSection lab={lab} /> : null}
    </View>
  );
}

function buildCareTagStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  return {
    careTagsBlock: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    careTagsWrap: {
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    careTag: {
      minWidth: 0,
      maxWidth: '100%' as const,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    careTagEmoji: type.careEmoji,
    careTagLabel: type.careTag,
  };
}

function buildCardStyles(c: AppColors) {
  return {
    card: {
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    notesBlock: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      gap: spacing[2],
      backgroundColor: c.surfaceAlt,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    notesHead: {
      minWidth: 0,
    },
    notesLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      letterSpacing: 0.4,
      textTransform: 'uppercase' as const,
    },
    notesText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.45,
    },
  };
}

function buildPreviewStyles(c: AppColors) {
  return {
    wrap: { gap: spacing[3] },
  };
}
