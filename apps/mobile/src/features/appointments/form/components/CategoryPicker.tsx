import { useRef } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Row } from '@/components/layout/primitives';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  categories: CareCategory[];
  selectedId: string;
  onSelect: (cat: CareCategory) => void;
}

/** Le soin préselectionné peut être loin dans la liste : on le ramène à l'écran une seule fois. */
export function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  const styles = useStyles(buildStyles);
  const scrollRef = useRef<ScrollView>(null);
  const revealedRef = useRef(false);

  function revealSelected(event: LayoutChangeEvent) {
    if (revealedRef.current) return;
    revealedRef.current = true;
    scrollRef.current?.scrollTo({ x: Math.max(0, event.nativeEvent.layout.x - spacing[4]), animated: false });
  }

  return (
    <View style={styles.wrapper}>
      <AppText style={styles.label}>Type de soin</AppText>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Row gap={spacing[2]}>
        {categories.map((c) => {
          const on = selectedId === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c)}
              onLayout={on ? revealSelected : undefined}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipActive]}
            >
              <AppText style={[styles.chipText, on && styles.chipTextActive]}>{c.label}</AppText>
            </Pressable>
          );
        })}
        </Row>
      </ScrollView>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrapper: { gap: spacing[2] },
  label: {
    ...font.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  scroll: {
    paddingRight: spacing[4],
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  chipText: {
    ...font.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  chipTextActive: { color: c.onPrimary },
};
}

