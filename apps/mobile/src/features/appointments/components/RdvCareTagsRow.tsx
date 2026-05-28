import { StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { rdvCatalogDisplayLines, type RdvCatalogDisplayOpts } from '@/utils/rdv-catalog-lines';
import { rdvListCardType } from './rdv-list-card-typography';
import { colors, radius } from '@/theme';

interface Props {
  apt: Appointment;
  /** Vue patient : masque certificat de décès et actes staff-only. */
  hideStaffOnlyCares?: boolean;
}

/** Soins en mini-tags primary clair (emoji + libellé). */
export function RdvCareTagsRow({ apt, hideStaffOnlyCares }: Props) {
  const opts: RdvCatalogDisplayOpts | undefined = hideStaffOnlyCares
    ? { hideStaffOnlyCares: true }
    : undefined;
  const lines = rdvCatalogDisplayLines(apt, opts);
  if (!lines.length) return null;

  const seen = new Set<string>();
  const items = lines.filter((line) => {
    const key = line.label.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      {items.map((line, idx) => (
        <View
          key={`${line.category_id ?? 'noid'}-${idx}-${line.label}`}
          style={styles.tag}
        >
          <Text style={styles.emoji} accessibilityElementsHidden>
            {line.emoji}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {line.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'stretch',
  },
  tag: {
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
  emoji: rdvListCardType.careEmoji,
  label: rdvListCardType.careTag,
});
