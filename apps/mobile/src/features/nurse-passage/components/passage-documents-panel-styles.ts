import { H_PADDING, font, hexToRgba, palette, radius, spacing, type Theme } from '@/theme';

export function buildPassageDocumentsPanelStyles({ colors: c, fontSize }: Theme) {
  return {
    panel: { gap: spacing[4], paddingHorizontal: H_PADDING },
    section: { gap: spacing[2] },
    notice: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      borderRadius: radius.md,
      backgroundColor: hexToRgba(palette.amber[500], 0.12),
    },
    noticeText: {
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textSecondary,
    },
  };
}
