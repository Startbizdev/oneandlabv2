import type { ButtonProps } from '@nuxt/ui';

type UiColor = NonNullable<ButtonProps['color']>;
const colors: Record<string, UiColor> = {
  primary: 'primary', secondary: 'secondary', success: 'success', info: 'info', warning: 'warning', error: 'error', neutral: 'neutral',
  green: 'success', blue: 'info', sky: 'info', yellow: 'warning', orange: 'warning', red: 'error', gray: 'neutral', purple: 'primary',
};
export function resolveUiColor(value: unknown, fallback: UiColor = 'neutral'): UiColor {
  return typeof value === 'string' ? colors[value] ?? fallback : fallback;
}

type UiVariant = NonNullable<ButtonProps['variant']>;
const variants: Record<string, UiVariant> = { solid: 'solid', outline: 'outline', soft: 'soft', subtle: 'subtle', ghost: 'ghost', link: 'link' };
export function resolveUiButtonVariant(value: unknown): UiVariant {
  return typeof value === 'string' ? variants[value] ?? 'outline' : 'outline';
}
