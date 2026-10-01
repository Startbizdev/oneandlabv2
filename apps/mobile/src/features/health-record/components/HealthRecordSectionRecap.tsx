import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { ListRowShell } from '@/components/ui/ListRowShell';
import type { HealthRecordRecapSection } from '../api/health-record.service';
import { isHealthRecordValueFilled } from '../utils/health-record-display';
import { HealthRecordFieldRow } from './HealthRecordFieldRow';
import { HealthRecordSectionIcon } from './HealthRecordSectionIcon';
import {
  AppText,
  ICON_STROKE_WIDTH,
  font,
  iconSize,
  radius,
  spacing,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

const PREVIEW_COUNT = 4;

interface Props {
  section: HealthRecordRecapSection;
  onEdit?: (sectionId: string) => void;
  /** Dans la carte sections du récap — sans bordure externe. */
  embedded?: boolean;
  /** Masque les champs non renseignés (vue patient : le chevron ouvre la saisie). */
  hideEmptyItems?: boolean;
}

function progressLabel(filled: number, total: number): string {
  if (total > 0 && filled >= total) return 'Complet';
  if (filled === 0) return 'À compléter';
  return `${filled} sur ${total} renseignée${filled > 1 ? 's' : ''}`;
}

export function HealthRecordSectionRecap({ section, onEdit, embedded, hideEmptyItems }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const items = section.items.filter((item) => item?.key);
  const filledItems = items.filter((i) => isHealthRecordValueFilled(i.display));
  const filled = filledItems.length;
  const total = items.length;
  const ratio = total > 0 ? Math.min(1, filled / total) : 0;
  const status = progressLabel(filled, total);
  const shownItems = hideEmptyItems ? filledItems : items;
  const hasBody = filled > 0 || shownItems.length > 0;

  const header = (
    <ListRowShell
      style={hasBody ? styles.header : undefined}
      leading={<HealthRecordSectionIcon sectionId={section.id} />}
      body={
        <View style={styles.headerTexts}>
          <AppText style={styles.title}>{section.label_fr}</AppText>
          <AppText variant="caption" style={styles.status}>
            {status}
          </AppText>
        </View>
      }
      trailing={
        onEdit ? (
          <ChevronRight size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
        ) : undefined
      }
    />
  );

  return (
    <View style={[embedded ? styles.embedded : styles.card, hasBody ? null : styles.collapsed]}>
      {onEdit ? (
        <Pressable
          onPress={() => onEdit(section.id)}
          accessibilityRole="button"
          accessibilityLabel={`${section.label_fr}, ${status}`}
          accessibilityHint="Modifier cette section"
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          {header}
        </Pressable>
      ) : (
        header
      )}

      {filled > 0 ? (
        <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
        </View>
      ) : null}

      {shownItems.length > 0 ? (
        <View style={styles.items}>
          {shownItems.slice(0, PREVIEW_COUNT).map((item) => (
            <HealthRecordFieldRow key={item.key} label={item.label_fr?.trim() || item.key} display={item.display} />
          ))}
          {shownItems.length > PREVIEW_COUNT ? (
            <AppText variant="caption" style={styles.moreHint}>
              + {shownItems.length - PREVIEW_COUNT} autre{shownItems.length - PREVIEW_COUNT > 1 ? 's' : ''}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      paddingBottom: spacing[4],
      marginBottom: spacing[3],
      overflow: 'hidden' as const,
    },
    embedded: { paddingBottom: spacing[4] },
    collapsed: { paddingBottom: 0 },
    header: { paddingBottom: spacing[2] },
    pressed: { backgroundColor: c.surfaceAlt },
    headerTexts: { gap: spacing[0.5] },
    title: { ...text.body, ...font.semiBold, color: c.textPrimary },
    status: { color: c.textSecondary },
    track: {
      height: 4,
      marginHorizontal: spacing[4],
      marginBottom: spacing[3],
      borderRadius: radius.full,
      backgroundColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    fill: { height: '100%' as const, borderRadius: radius.full, backgroundColor: c.success },
    items: { gap: spacing[3], paddingHorizontal: spacing[4] },
    moreHint: { color: c.textSecondary },
  };
}
