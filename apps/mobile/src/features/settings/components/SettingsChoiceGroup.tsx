import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { iconSize, radius, spacing, AppText, useStyles, font, type Theme, ICON_STROKE_WIDTH } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

export type SettingsChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

interface Props<T extends string> {
  title?: string;
  /** Question posée au-dessus des choix, dans la carte. */
  caption: string;
  options: SettingsChoiceOption<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}

/** Choix unique présenté comme une carte de réglages (boutons radio). */
export function SettingsChoiceGroup<T extends string>({ title, caption, options, selected, onSelect }: Props<T>) {
  const c = useAppColors();
  const settings = useStyles(buildSettingsStyles);
  const styles = useStyles(buildStyles);

  return (
    <View style={settings.section}>
      {title ? (
        <AppText style={settings.sectionTitle} accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={settings.sectionCard} accessibilityRole="radiogroup" accessibilityLabel={caption}>
        <AppText style={styles.caption}>{caption}</AppText>
        {options.map((opt) => {
          const active = opt.value === selected;
          return (
            <View key={opt.value}>
              <View style={styles.divider} />
              <Pressable
                onPress={() => onSelect(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={opt.description ? `${opt.label}, ${opt.description}` : opt.label}
                style={({ pressed }) => [settings.row, styles.choiceRow, pressed && settings.pressed]}
              >
                <View style={[settings.texts, styles.choiceTexts]}>
                  <AppText style={settings.label}>{opt.label}</AppText>
                  {opt.description ? <AppText variant="caption">{opt.description}</AppText> : null}
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <Check size={iconSize.xs} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} /> : null}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    caption: {
      ...text.secondary,
      ...font.medium,
      color: c.textSecondary,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    choiceRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: spacing[4],
      backgroundColor: c.borderLight,
    },
    choiceTexts: {
      flex: 1,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    radioActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
  };
}
