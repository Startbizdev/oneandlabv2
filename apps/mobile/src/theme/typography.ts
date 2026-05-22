export const fontFamily = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
} as const;

export const fontSize = {
  '2xs': 10,
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
  loose: 2,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
  widest: 1,
  caps: 0.8,
} as const;

export const textStyles = {
  display: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['4xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['4xl'] * lineHeight.tight,
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['3xl'] * lineHeight.tight,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.tight,
    lineHeight: fontSize['2xl'] * lineHeight.snug,
  },
  h3: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  h4: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.lg * lineHeight.snug,
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.md * lineHeight.normal,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySemiBold: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  caption: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wide,
    lineHeight: fontSize.xs * lineHeight.snug,
  },
  overline: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    letterSpacing: letterSpacing.caps,
    lineHeight: fontSize['2xs'] * lineHeight.normal,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.normal,
    lineHeight: fontSize.sm * lineHeight.snug,
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    letterSpacing: letterSpacing.normal,
  },
  buttonSm: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.normal,
  },
  buttonLg: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    letterSpacing: letterSpacing.normal,
  },
} as const;
