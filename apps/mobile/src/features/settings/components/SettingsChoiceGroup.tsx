import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { buildSettingsStyles } from '@/components/ui/SettingsRow';
import { elevation, iconSize, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
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
      <View style={[settings.sectionCard, elevation.xs]} accessibilityRole="radiogroup" accessibilityLabel={caption}>
        <AppText style={styles.caption}>{caption}</AppText>
        {options.map((opt) => {
          const active = opt.value === selected;
          return (
            <View key={opt.value}>
              <View style={settings.divider} />
              <Pressable
                onPress={() => onSelect(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={opt.description ? `${opt.label}, ${opt.description}` : opt.label}
                style={({ pressed }) => [settings.row, styles.choiceRow, pressed && styles.pressed]}
              >
                <View style={[settings.texts, styles.choiceTexts]}>
                  <AppText style={settings.label}>{opt.label}</AppText>
                  {opt.description ? <AppText style={settings.description}>{opt.description}</AppText> : null}
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <Check size={iconSize.xs} color={c.onPrimary} strokeWidth={3} /> : null}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    caption: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
    },
    choiceRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[3],
    },
    choiceTexts: {
      flex: 1,
    },
    pressed: {
      backgroundColor: c.surfaceAlt,
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
