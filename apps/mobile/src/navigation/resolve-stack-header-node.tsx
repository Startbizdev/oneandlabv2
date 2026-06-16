import { isValidElement, type ReactNode } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { fontFamily, fontSize } from '@/theme/typography';
import { colors } from '@/theme';

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
    return (
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fontFamily.bold,
          fontSize: fontSize.lg,
          color: colors.textPrimary,
        }}
      >
        {raw}
      </Text>
    );
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
