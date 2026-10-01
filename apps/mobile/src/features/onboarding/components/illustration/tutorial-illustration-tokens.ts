import { palette, type Theme } from '@/theme';

export const row = { flexDirection: 'row' as const };
export const absolute = { position: 'absolute' as const };
export const centered = { alignItems: 'center' as const, justifyContent: 'center' as const };
export const fullWidth = '100%' as const;
export const mutedSurface = palette.slate[50];

export function illustrationTextSizes({ fontSize, scale }: Pick<Theme, 'fontSize' | 'scale'>) {
  return {
    text2xs: { fontSize: fontSize['2xs'], lineHeight: scale(16) },
    textXs: { fontSize: fontSize.xs, lineHeight: scale(20) },
    textSm: { fontSize: fontSize.sm, lineHeight: scale(22) },
    textLg: { fontSize: fontSize.lg, lineHeight: scale(28) },
    textXl: { fontSize: fontSize.xl, lineHeight: scale(30) },
    text4xl: { fontSize: fontSize['4xl'], lineHeight: scale(42) },
  };
}
