import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { LiquidGlassChrome } from '@/components/navigation/LiquidGlassChrome';
import {
  LIQUID_GLASS_CONTROL_EFFECT,
  LIQUID_GLASS_HEADER_CONTROL_SIZE,
  LIQUID_GLASS_HEADER_SYMBOL_SIZE,
} from '@/components/navigation/nav-chrome-tokens';
import { fontFamily, fontSize, AppText } from '@/theme';

type Props = {
  symbol: SFSymbol;
  accessibilityLabel: string;
  onPress: () => void;
  badge?: number;
  iconColor?: string;
  fallback?: ReactNode;
};

function useNativeGlassControls(): boolean {
  return Platform.OS === 'ios' && isGlassEffectAPIAvailable();
}

/** Bouton header — GlassView natif iOS 26 (cloche, retour, menu). */
export function GlassHeaderButton({
  symbol,
  accessibilityLabel,
  onPress,
  badge,
  iconColor,
  fallback,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'GlassHeaderButton');
  const nativeGlass = useNativeGlassControls();
  const size = LIQUID_GLASS_HEADER_CONTROL_SIZE;
  const showBadge = badge !== undefined && badge > 0;
  const badgeLabel = showBadge ? (badge! > 99 ? '99+' : String(badge!)) : '';
  const tint = iconColor ?? c.textPrimary;

  const icon = (
    <SymbolView
      name={symbol}
      size={LIQUID_GLASS_HEADER_SYMBOL_SIZE}
      weight="semibold"
      tintColor={tint}
      fallback={fallback}
    />
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        showBadge
          ? `${accessibilityLabel}, ${badge! > 99 ? 'plus de 99' : badge} non lues`
          : accessibilityLabel
      }
      hitSlop={6}
      style={({ pressed }) => [styles.host, pressed && styles.pressed]}
    >
      {nativeGlass ? (
        <GlassView
          style={[styles.glass, { width: size, height: size, borderRadius: size / 2 }]}
          glassEffectStyle={LIQUID_GLASS_CONTROL_EFFECT}
          isInteractive
        >
          {icon}
        </GlassView>
      ) : (
        <View style={[styles.fallbackOrb, { width: size, height: size, borderRadius: size / 2 }]}>
          {Platform.OS === 'android' ? (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: c.surfaceAlt }]} />
          ) : (
            <LiquidGlassChrome variant="tab" style={StyleSheet.absoluteFillObject} />
          )}
          <View style={styles.fallbackIcon}>{icon}</View>
        </View>
      )}
      {showBadge ? (
        <View
          style={[
            styles.badgeAnchor,
            badgeLabel.length >= 3 && styles.badgeAnchorWide,
            badgeLabel.length === 2 && styles.badgeAnchorMedium,
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.badge,
              badgeLabel.length >= 3 && styles.badgeExtraWide,
              badgeLabel.length === 2 && styles.badgeWide,
            ]}
          >
            <AppText style={styles.badgeText} compact maxFontSizeMultiplier={1.2}>{badgeLabel}</AppText>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  const size = LIQUID_GLASS_HEADER_CONTROL_SIZE;
  const badgeSize = 20;
  return {
    host: {
      width: size,
      height: size,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'visible' as const,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
    glass: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    },
    fallbackOrb: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(15, 23, 42, 0.08)',
    },
    fallbackIcon: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    badgeAnchor: {
      position: 'absolute' as const,
      top: -3,
      right: -3,
      zIndex: 10,
      ...Platform.select({
        ios: {
          shadowColor: c.error,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 3,
        },
        android: { elevation: 6 },
      }),
    },
    badgeAnchorMedium: {
      right: -7,
    },
    badgeAnchorWide: {
      right: -11,
    },
    badge: {
      minWidth: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
      paddingHorizontal: 5,
      paddingVertical: 0,
      backgroundColor: c.error,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 2,
      borderColor: c.surface,
      overflow: 'hidden' as const,
    },
    badgeWide: {
      minWidth: 24,
      paddingHorizontal: 5,
    },
    badgeExtraWide: {
      minWidth: 30,
      paddingHorizontal: 6,
    },
    badgeText: {
      fontFamily: fontFamily.extraBold,
      fontSize: fontSize['2xs'],
      lineHeight: 12,
      textAlign: 'center' as const,
      color: c.textInverse,
      includeFontPadding: false,
      ...Platform.select({
        android: {
          textAlignVertical: 'center' as const,
          height: 12,
          transform: [{ translateY: -0.5 }],
        },
        ios: {
          transform: [{ translateY: -0.5 }],
        },
      }),
    },
  };
}
