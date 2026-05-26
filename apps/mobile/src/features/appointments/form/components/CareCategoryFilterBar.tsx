import { LinearGradient } from 'expo-linear-gradient';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  catalogGroupFilterEmoji,
  catalogGroupTheme,
  type CareFilterTab,
} from '../utils/booking-care-catalog';
import { fontFamily, fontSize } from '@/theme/typography';
import { spacing } from '@/theme';

const H_PAD = spacing[4];
const CHIP_GAP = spacing[1.5];
/** ~4,5 cartes visibles pour indiquer le scroll horizontal. */
const VISIBLE_CHIPS = 4.5;
const CHIP_MIN = 76;
const CHIP_MAX = 92;

interface Props {
  tabs: CareFilterTab[];
  /** `all` = tous les soins affichés, aucun chip actif. */
  value: string;
  onChange: (value: string) => void;
}

export function CareCategoryFilterBar({ tabs, value, onChange }: Props) {
  const { width: screenW } = useWindowDimensions();
  const chipSize = useMemo(() => {
    const gaps = CHIP_GAP * Math.floor(VISIBLE_CHIPS);
    const raw = (screenW - H_PAD * 2 - gaps) / VISIBLE_CHIPS;
    return Math.round(Math.min(CHIP_MAX, Math.max(CHIP_MIN, raw)));
  }, [screenW]);

  const orbSize = Math.round(chipSize * 0.4);
  const emojiSize = Math.round(orbSize * 0.52);
  const chipRadius = Math.round(chipSize * 0.2);

  if (tabs.length === 0) return null;

  return (
    <View style={styles.shell}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={chipSize + CHIP_GAP}
        snapToAlignment="start"
        contentContainerStyle={[styles.row, { paddingRight: H_PAD }]}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => {
          const active = value === tab.value;
          const theme = catalogGroupTheme(tab.value);
          const emoji = catalogGroupFilterEmoji(tab.value);

          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(active ? 'all' : tab.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filtrer par ${tab.label}`}
              style={({ pressed }) => [
                styles.chipOuter,
                { width: chipSize, height: chipSize },
                pressed && styles.chipPressed,
                active && { shadowColor: theme.glow },
              ]}
            >
              {active ? (
                <LinearGradient
                  colors={[...theme.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.chip,
                    {
                      width: chipSize,
                      height: chipSize,
                      borderRadius: chipRadius,
                      borderColor: theme.borderActive,
                      shadowColor: theme.glow,
                    },
                    styles.chipActive,
                  ]}
                >
                  <CategoryChipContent
                    emoji={emoji}
                    label={tab.label}
                    active
                    theme={theme}
                    orbSize={orbSize}
                    emojiSize={emojiSize}
                  />
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.chip,
                    {
                      width: chipSize,
                      height: chipSize,
                      borderRadius: chipRadius,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <CategoryChipContent
                    emoji={emoji}
                    label={tab.label}
                    active={false}
                    theme={theme}
                    orbSize={orbSize}
                    emojiSize={emojiSize}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function CategoryChipContent({
  emoji,
  label,
  active,
  theme,
  orbSize,
  emojiSize,
}: {
  emoji: string;
  label: string;
  active: boolean;
  theme: ReturnType<typeof catalogGroupTheme>;
  orbSize: number;
  emojiSize: number;
}) {
  return (
    <View style={styles.chipInner}>
      <View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            backgroundColor: theme.orb,
          },
        ]}
      >
        <Text
          style={[styles.orbEmoji, { fontSize: emojiSize, lineHeight: emojiSize + 4 }]}
          accessibilityElementsHidden
        >
          {emoji}
        </Text>
      </View>
      <Text
        style={[
          styles.chipLabel,
          { color: active ? theme.labelActive : theme.label },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {label}
      </Text>
      {active ? (
        <View style={[styles.activeDot, { backgroundColor: theme.borderActive }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -H_PAD,
    paddingVertical: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: CHIP_GAP,
    paddingHorizontal: H_PAD,
  },
  chipOuter: {
    flexShrink: 0,
  },
  chipPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.94,
  },
  chip: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chipActive: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  chipInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[1],
    gap: spacing[0.5],
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbEmoji: {
    textAlign: 'center',
  },
  chipLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    textAlign: 'center',
    lineHeight: fontSize['2xs'] * 1.15,
    letterSpacing: -0.35,
    width: '100%',
  },
  activeDot: {
    width: 16,
    height: 2,
    borderRadius: 2,
  },
});
