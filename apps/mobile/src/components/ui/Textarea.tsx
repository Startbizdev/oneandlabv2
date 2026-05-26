import React, { useCallback, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { useSheetTextInputComponent } from './sheet-keyboard-context';

interface TextareaProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

function TextareaComponent(
  { label, error, hint, onFocus, onBlur, style, ...props }: TextareaProps,
  ref: React.ForwardedRef<TextInput>,
) {
  const [isFocused, setIsFocused] = useState(false);
  const TextField = useSheetTextInputComponent();
  const borderColor = error
    ? colors.borderError
    : isFocused
      ? colors.borderFocus
      : colors.border;

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
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.container,
          { borderColor, borderWidth: isFocused ? 1.5 : 1 },
        ]}
      >
        <TextField
          ref={ref}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          {...props}
        />
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export const Textarea = React.memo(React.forwardRef(TextareaComponent));

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    letterSpacing: 0.3,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  labelFocused: {
    color: colors.primary,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 128,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 128,
    lineHeight: fontSize.base * 1.45,
    ...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : {}),
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.error,
    letterSpacing: 0.1,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
