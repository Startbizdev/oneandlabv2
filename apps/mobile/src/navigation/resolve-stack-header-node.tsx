import { isValidElement, type ReactNode } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { AppText, font, useStyles, type Theme } from '@/theme';

type HeaderTitleRenderProps = {
  tintColor?: string;
  children?: string;
};

type HeaderSideRenderProps = {
  tintColor?: string;
  canGoBack?: boolean;
  label?: string;
};

/** Titre stack — string, composant ou render prop React Navigation. */
export function resolveStackHeaderTitle(
  raw: NativeStackNavigationOptions['headerTitle'] | ReactNode | undefined,
  tintColor?: string,
): ReactNode {
  if (raw == null) return undefined;

  if (typeof raw === 'string') {
    return <StackHeaderTitleText title={raw} tintColor={tintColor} />;
  }

  if (typeof raw === 'function') {
    return (raw as (props: HeaderTitleRenderProps) => ReactNode)({
      tintColor,
      children: '',
    });
  }

  if (isValidElement(raw)) return raw;

  return raw as ReactNode;
}

function StackHeaderTitleText({ title, tintColor }: { title: string; tintColor?: string }) {
  const styles = useStyles(buildStyles);
  return (
    <AppText numberOfLines={1} style={[styles.title, tintColor ? { color: tintColor } : null]}>
      {title}
    </AppText>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    title: { ...font.heading, fontSize: fontSize.lg, color: c.textPrimary },
  };
}

/** Slot headerLeft / headerRight — élément ou render prop. */
export function resolveStackHeaderSide(
  raw:
    | NativeStackNavigationOptions['headerLeft']
    | NativeStackNavigationOptions['headerRight']
    | ReactNode
    | undefined,
  props: HeaderSideRenderProps,
): ReactNode | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'function') {
    return (raw as (p: HeaderSideRenderProps) => ReactNode)(props);
  }
  if (isValidElement(raw)) return raw;
  return raw as ReactNode;
}
