import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Row } from '@/components/layout/primitives';
import {
  catalogGroupFilterEmoji,
  catalogGroupTheme,
  type CareFilterTab,
} from '../utils/booking-care-catalog';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const H_PAD = spacing[4];
const CHIP_GAP = spacing[2.5];
const EMOJI_ORB = 34;
/** ~2 chips entiers + un troisième coupé → affordance scroll. */
const PEEK_VISIBLE_CHIPS = 2.35;
const CHIP_WIDTH_MIN = 136;
const CHIP_WIDTH_MAX = 168;

interface Props {
  tabs: CareFilterTab[];
  /** `all` = tous les soins affichés, aucun chip actif. */
  value: string;
  onChange: (value: string) => void;
}

export function CareCategoryFilterBar({ tabs, value, onChange }: Props) {
  const styles = useThemedStyles(buildStyles);
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const textScale = useAppPreferencesStore((s) => s.textScale);
  const { width: screenW } = useWindowDimensions();

  const chipWidth = useMemo(() => {
    const gapCount = Math.max(1, Math.floor(PEEK_VISIBLE_CHIPS));
    const raw =
      (screenW - H_PAD * 2 - CHIP_GAP * gapCount) / PEEK_VISIBLE_CHIPS;
    return Math.round(Math.min(CHIP_WIDTH_MAX, Math.max(CHIP_WIDTH_MIN, raw)));
  }, [screenW]);

  const snapInterval = chipWidth + CHIP_GAP;

  if (tabs.length === 0) return null;

  return (
    <View style={styles.shell}>
      <ScrollView
        key={`${colorblindType}:${textScale}`}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        <Row gap={CHIP_GAP} align="center">
        {tabs.map((tab) => {
          const active = value === tab.value;
          const theme = catalogGroupTheme(tab.value);
          const emoji = catalogGroupFilterEmoji(tab.value);

          const chipStyle: StyleProp<ViewStyle> = active
            ? {
                backgroundColor: theme.surfaceActive,
                borderColor: theme.borderActive,
              }
            : null;

          return (
            <Pressable
              key={tab.value}
              onPress={() => {
                if (active && tab.value === 'all') return;
                onChange(active ? 'all' : tab.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filtrer par ${tab.label}`}
              style={({ pressed }) => [
                styles.chipHit,
                { width: chipWidth },
                pressed && styles.chipHitPressed,
              ]}
            >
              <Row align="center" style={[styles.chip, chipStyle]}>
                <View style={[styles.emojiOrb, { backgroundColor: theme.orb }]}>
                  <Text style={styles.emojiGlyph} accessibilityElementsHidden>
                    {emoji}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.label,
                    active ? { color: theme.labelActive } : null,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {tab.label}
                </Text>
              </Row>
            </Pressable>
          );
        })}
        </Row>
      </ScrollView>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    shell: {
      marginHorizontal: -H_PAD,
    },
    row: {
      paddingHorizontal: H_PAD,
      paddingVertical: spacing[1],
    },
    chipHit: {
      flexShrink: 0,
      borderRadius: radius.full,
    },
    chipHitPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    chip: {
      minWidth: 0,
      flex: 1,
      minHeight: 52,
      paddingLeft: spacing[2.5],
      paddingRight: spacing[3],
      paddingVertical: spacing[2.5],
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    emojiOrb: {
      width: EMOJI_ORB,
      height: EMOJI_ORB,
      borderRadius: EMOJI_ORB / 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: spacing[2],
    },
    emojiGlyph: {
      fontSize: 18,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    label: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      color: c.textSecondary,
      letterSpacing: -0.2,
    },
  };
}
