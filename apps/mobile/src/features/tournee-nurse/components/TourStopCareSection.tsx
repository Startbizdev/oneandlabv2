import { useAppColors } from '@/theme/use-app-colors';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { hexToRgba } from '@/theme/color-utils';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import {
  buildAppointmentCareOptionKvRows,
  getAppointmentNursingItems,
  nursingItemDisplayLabel,
} from '@/utils/appointment-detail-display';
import { isNursingAppointment } from '@oneandlab/shared-utils';
import type { NurseTourStop } from '../api/nurse-tour.service';
import {
  tourStopAsAppointment,
} from '../utils/tour-stop-as-appointment';
import { ICON_STROKE_WIDTH, iconSize, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';

type Props = {
  stop: NurseTourStop;
  /** Directement sous le nom patient — marges resserrées */
  embedded?: boolean;
  /** Passage terminé — contenu atténué */
  muted?: boolean;
  /** Liste tournée : soins uniquement (sans Type / options détail). */
  listCompact?: boolean;
  /** Soins cochables un par un (liste tournée). */
  onToggleItem?: (itemId: string, done: boolean) => void;
};

function isDetailOptionLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized === 'type' ||
    normalized === 'type de soin' ||
    normalized === 'localisation' ||
    normalized.includes('plaie')
  );
}

/** Soins (icône + libellé) et options catalogue — aligné détail RDV. */
export function TourStopCareSection({
  stop,
  embedded = false,
  muted = false,
  listCompact = false,
  onToggleItem,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const apt = useMemo(() => tourStopAsAppointment(stop), [stop]);
  const { data: categories = [] } = useAppointmentCareCategories();
  const checkableItems = useMemo(
    () =>
      onToggleItem
        ? (stop.nursing_items ?? []).filter((item) => item.id && item.appointment_id === stop.appointment_id)
        : [],
    [onToggleItem, stop.appointment_id, stop.nursing_items],
  );

  const optionRows = useMemo(
    () => buildAppointmentCareOptionKvRows(apt, categories).filter((r) => r.value?.trim()),
    [apt, categories],
  );

  const displayOptionRows = useMemo(() => {
    const baseRows = listCompact
      ? optionRows.filter((row) => !isDetailOptionLabel(row.label))
      : optionRows;

    if (listCompact) return baseRows;

    if (baseRows.some((row) => isDetailOptionLabel(row.label))) {
      return baseRows;
    }
    if (!isNursingAppointment(apt.type)) return baseRows;
    const items = getAppointmentNursingItems(apt);
    if (items.length > 1) return baseRows;
    const value =
      items.length === 1 ? nursingItemDisplayLabel(items[0]!) : apt.category_name?.trim() ?? '';
    if (!value) return baseRows;
    return [{ label: 'Type', value }, ...baseRows];
  }, [apt, listCompact, optionRows]);

  return (
    <Stack
      gap={spacing[1]}
      style={[styles.wrap, embedded && styles.wrapEmbedded, muted && styles.wrapMuted]}
    >
      {onToggleItem && checkableItems.length > 0 ? (
        <Row gap={spacing[1.5]} wrap style={styles.pills}>
          {checkableItems.map((item) => {
            const done = Boolean(item.done_at);
            const label = nursingItemDisplayLabel(item);
            return (
              <Pressable
                key={item.id}
                onPress={() => onToggleItem(item.id, !done)}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                style={[
                  styles.pill,
                  done
                    ? { backgroundColor: hexToRgba(c.success, 0.12), borderColor: hexToRgba(c.success, 0.4) }
                    : { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`${label}, ${done ? 'fait' : 'à faire'}`}
              >
                {done ? <Check size={iconSize['2xs']} color={c.success} strokeWidth={ICON_STROKE_WIDTH} /> : null}
                <AppText style={[styles.pillLabel, { color: done ? c.success : c.textSecondary }]}>{label}</AppText>
              </Pressable>
            );
          })}
        </Row>
      ) : (
        <RdvCareTagsRow apt={apt} tone="neutral" density="compact" badgeCategoryOnly />
      )}
      {displayOptionRows.length > 0 ? (
        <View style={styles.optionsBlock}>
          {displayOptionRows.map((row) => {
            const line = (
              <AppText style={styles.optionLine}>
                <AppText style={styles.optionLabel}>{row.label} : </AppText>
                {row.value}
              </AppText>
            );
            return <View key={`${row.label}-${row.value}`}>{line}</View>;
          })}
        </View>
      ) : null}
    </Stack>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      marginTop: spacing[1.5],
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    wrapEmbedded: {
      marginTop: spacing[1],
    },
    wrapMuted: {
      opacity: 0.62,
    },
    optionsBlock: {
      gap: spacing[0.5],
      minWidth: 0,
    },
    pills: { minWidth: 0, alignSelf: 'stretch' as const },
    pill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],
      maxWidth: '100%' as const,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth * 2,
    },
    pillLabel: {
      ...font.medium,
      flexShrink: 1,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
    },
    optionLine: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.textSecondary,
    },
    optionLabel: {
      ...font.medium,
      color: c.textTertiary,
    },
    metaRow: {
      marginTop: spacing[0.5],
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    metaIconWrap: {
      width: iconSize.sm,
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    metaLine: {
      flex: 1,
      minWidth: 0,
      ...font.medium,
      fontSize: fontSize.xs,
    },
  };
}
