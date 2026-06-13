import type { AppColors } from '@/theme/colors';
import { spacing } from '@/theme';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextLayoutLine,
  type ViewStyle,
} from 'react-native';
import {
  getMiniDateCalendarLayout,
  miniDateCalendarOuterSize,
  type MiniDateCalendarLayout,
  type MiniDateCalendarSize,
} from '@/components/ui/mini-date-calendar-layout';
import {
  getMiniDateCalendarColors,
  type MiniDateCalendarVariant,
} from '@/components/ui/mini-date-calendar-colors';
import {
  formatMiniDateCalendarParts,
  type MiniDateCalendarParts,
} from '@/utils/mini-date-calendar-parts';

export { miniDateCalendarOuterSize, type MiniDateCalendarSize };
export type { MiniDateCalendarVariant };

type Props = {
  date?: string | Date | null;
  parts?: MiniDateCalendarParts | null;
  size?: MiniDateCalendarSize;
  /** `brand` = teal Cary (défaut liste RDV) ; `apple` = rouge emoji décoratif. */
  variant?: MiniDateCalendarVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Parent fournit un libellé composite — masque ce widget du tree a11y. */
  accessibilityHidden?: boolean;
};

const compactText = { allowFontScaling: false as const };

const textBoxReset = StyleSheet.create({
  base: {
    margin: 0,
    padding: 0,
    textAlign: 'center' as const,
    maxWidth: '100%' as const,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
});

export function MiniDateCalendar({
  date,
  parts: partsProp,
  size = 'sm',
  variant = 'brand',
  style,
  accessibilityLabel,
  accessibilityHidden = false,
}: Props) {
  const layout = getMiniDateCalendarLayout(size);
  const parts = partsProp ?? formatMiniDateCalendarParts(date);
  const styleFactory = useMemo(
    () => (c: AppColors) => buildStyles(c, layout, variant),
    [layout, variant],
  );
  const styles = useThemedStyles(styleFactory, `MiniDateCalendar.${size}.${variant}`);

  if (!parts) return null;

  return (
    <View
      style={[styles.root, style]}
      accessible={!accessibilityHidden}
      accessibilityElementsHidden={accessibilityHidden}
      {...(accessibilityHidden ? { importantForAccessibility: 'no' as const } : null)}
      accessibilityLabel={
        accessibilityHidden ? undefined : (accessibilityLabel ?? parts.accessibilityLabel)
      }
    >
      <View style={[styles.band, styles.headerBand, { flex: layout.bandWeights.header }]}>
        <BandLabel
          text={parts.weekdayLabel}
          typography={layout.weekday}
          color={styles.weekdayColor.color}
          uppercase
        />
      </View>

      <View style={[styles.band, styles.bodyBand, { flex: layout.bandWeights.body }]}>
        <DayNumberGlyph
          text={parts.dayNumber}
          typography={layout.day}
          offsetTop={layout.dayOffsetTop}
          color={styles.dayColor.color}
        />
      </View>

      <View style={[styles.band, styles.footerBand, { flex: layout.bandWeights.footer }]}>
        <BandLabel
          text={parts.monthLabel}
          typography={layout.month}
          color={styles.monthColor.color}
          uppercase
        />
      </View>
    </View>
  );
}

function BandLabel({
  text,
  typography,
  color,
  uppercase,
}: {
  text: string;
  typography: MiniDateCalendarLayout['weekday'];
  color: string;
  uppercase?: boolean;
}) {
  return (
    <Text
      {...compactText}
      style={[
        textBoxReset.base,
        {
          fontFamily: typography.fontFamily,
          fontSize: typography.fontSize,
          lineHeight: typography.lineHeight,
          letterSpacing: typography.letterSpacing,
          color,
          textTransform: uppercase ? 'uppercase' : undefined,
        },
      ]}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
}

/**
 * Centre la line box mesurée du chiffre dans la bande blanche, avec léger offset
 * pour compenser le métrique police (marges visuelles haut / bas équilibrées).
 */
function DayNumberGlyph({
  text,
  typography,
  offsetTop,
  color,
}: {
  text: string;
  typography: MiniDateCalendarLayout['day'];
  offsetTop: number;
  color: string;
}) {
  const fontSize = typography.fontSize;
  const [lineBoxHeight, setLineBoxHeight] = useState(fontSize);

  useEffect(() => {
    setLineBoxHeight(fontSize);
  }, [text, fontSize]);

  const onTextLayout = useCallback(
    (event: { nativeEvent: { lines: TextLayoutLine[] } }) => {
      const height = event.nativeEvent.lines[0]?.height;
      if (height && height > 0) setLineBoxHeight(height);
    },
    [],
  );

  return (
    <View style={glyphStyles.section}>
      <View style={[glyphStyles.lineBox, { height: lineBoxHeight, marginTop: offsetTop }]}>
        <Text
          {...compactText}
          style={[
            textBoxReset.base,
            {
              fontFamily: typography.fontFamily,
              fontSize,
              lineHeight: lineBoxHeight,
              height: lineBoxHeight,
              letterSpacing: typography.letterSpacing,
              color,
              fontVariant: ['tabular-nums' as const],
              fontWeight: typography.fontWeight,
            },
          ]}
          onTextLayout={onTextLayout}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

const glyphStyles = StyleSheet.create({
  section: {
    minWidth: 0,
    flex: 1,
    alignSelf: 'stretch' as const,
    minHeight: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  lineBox: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    maxWidth: '100%' as const,
  },
});

function buildStyles(c: AppColors, layout: MiniDateCalendarLayout, variant: MiniDateCalendarVariant) {
  const palette = getMiniDateCalendarColors(variant, c);

  return {
    root: {
      width: layout.outerSize,
      height: layout.outerSize,
      minWidth: layout.outerSize,
      minHeight: layout.outerSize,
      maxWidth: layout.outerSize,
      maxHeight: layout.outerSize,
      flexGrow: 0,
      flexShrink: 0,
      aspectRatio: 1,
      alignSelf: 'flex-start' as const,
      flexDirection: 'column' as const,
      borderRadius: layout.borderRadius,
      borderWidth: layout.borderWidth,
      borderColor: palette.border,
      backgroundColor: palette.bodyBg,
      overflow: 'hidden' as const,
    },
    band: {
      minHeight: 0,
      width: '100%' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[0.5],
    },
    headerBand: {
      backgroundColor: palette.headerBg,
    },
    bodyBand: {
      alignItems: 'stretch' as const,
      backgroundColor: palette.bodyBg,
    },
    footerBand: {
      backgroundColor: palette.footerBg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.footerDivider,
    },
    weekdayColor: { color: palette.headerText },
    dayColor: { color: palette.dayText },
    monthColor: { color: palette.footerText },
  };
}
