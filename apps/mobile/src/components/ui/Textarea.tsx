import { useAppColors } from '@/theme/use-app-colors';

import React, { useCallback, useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';
import { spacing, AppText, useStyles, font, lh, type Theme } from '@/theme';
import { buildFieldStyles } from './field-styles';
import { useInBottomSheet } from './sheet-keyboard-context';

interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

function TextareaComponent(
  {
    label,
    error,
    hint,
    onFocus,
    onBlur,
    style,
    returnKeyType,
    blurOnSubmit,
    ...props
  }: TextareaProps,
  ref: React.ForwardedRef<TextInput>,
) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const field = useStyles(buildFieldStyles);

  const [isFocused, setIsFocused] = useState(false);
  const inSheet = useInBottomSheet();
  const borderColor = error
    ? c.borderError
    : isFocused
      ? c.borderFocus
      : c.border;

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  return (
    <View style={field.wrapper}>
      {label ? (
        <AppText style={[field.label, isFocused && field.labelFocused]}>{label}</AppText>
      ) : null}

      <View
        style={[
          field.container,
          styles.container,
          { borderColor, borderWidth: isFocused ? 1.5 : 1 },
        ]}
      >
        <TextInput
          ref={ref}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType={returnKeyType ?? (Platform.OS === 'android' && inSheet ? 'done' : 'default')}
          returnKeyLabel={Platform.OS === 'android' && inSheet ? 'Valider' : undefined}
          blurOnSubmit={blurOnSubmit ?? (Platform.OS === 'android' && inSheet)}
          accessibilityLabel={props.accessibilityLabel ?? label}
          style={[styles.input, style]}
          placeholderTextColor={c.textTertiary}
          selectionColor={c.primary}
          cursorColor={c.primary}
          {...props}
        />
      </View>

      {error ? (
        <AppText style={field.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText style={field.hint}>{hint}</AppText>
      ) : null}
    </View>
  );
}

export const Textarea = React.memo(React.forwardRef(TextareaComponent));

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    container: {
      minHeight: 128,
    },
    input: {
      minWidth: 0,
      flex: 1,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      minHeight: 128,
      lineHeight: Math.round(fontSize.base * 1.45),
      ...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : {}),
    },
  };
}