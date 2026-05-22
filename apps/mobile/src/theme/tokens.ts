import { Platform } from 'react-native';

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const elevation = {
  none: {},
  xs: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  })!,
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  })!,
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  })!,
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 24,
    },
    android: { elevation: 10 },
    default: {},
  })!,
  xl: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 40,
    },
    android: { elevation: 16 },
    default: {},
  })!,
  /** Ombre au-dessus d’un bottom sheet (pas d’overlay sombre). */
  sheetTop: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    android: { elevation: 14 },
    default: {},
  })!,
} as const;

export const animation = {
  timing: {
    instant: 80,
    fast: 150,
    base: 250,
    slow: 400,
    verySlow: 600,
  },
  spring: {
    gentle: { damping: 20, stiffness: 200, mass: 1 },
    snappy: { damping: 22, stiffness: 320, mass: 0.9 },
    bouncy: { damping: 14, stiffness: 280, mass: 0.8 },
    tab: { damping: 24, stiffness: 380, mass: 0.85 },
  },
} as const;

export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
} as const;

export const TAB_BAR_HEIGHT = 64;
export const H_PADDING = 16;
