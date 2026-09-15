/** Convertit un hex #RRGGBB en rgba(...) pour overlays et glows. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Choose the foreground with the higher WCAG contrast on an opaque #RRGGBB background. */
export function contrastForeground(background: string, dark: string, light: string): string {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map(offset => {
      const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const bg = luminance(background);
  const ratio = (foreground: string) => {
    const fg = luminance(foreground);
    return (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
  };
  return ratio(dark) >= ratio(light) ? dark : light;
}
