import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback, useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { useInBottomSheet, useSheetTextInputComponent } from './sheet-keyboard-context';
import { SHEET_KEYBOARD_ACCESSORY_ID } from './sheet-keyboard-accessory';

const NUMERIC_KEYBOARDS = new Set([
  'number-pad',
  'phone-pad',
  'decimal-pad',
  'ascii-capable-number-pad',
]);

/** Pavé numérique : « Valider » natif Android ; barre iOS française dans les sheets. */
function resolveReturnKeyType(
  keyboardType: TextInputProps['keyboardType'],
  returnKeyType: TextInputProps['returnKeyType'],
  inSheet: boolean,
): TextInputProps['returnKeyType'] {
  if (keyboardType && NUMERIC_KEYBOARDS.has(String(keyboardType))) {
    if (Platform.OS === 'ios' && inSheet) {
      return undefined;
    }
    return returnKeyType ?? 'done';
  }
  return returnKeyType;
}

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

function InputComponent(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onFocus,
    onBlur,
    style,
    keyboardType,
    returnKeyType,
    multiline,
    blurOnSubmit: blurOnSubmitProp,
    ...props
  }: InputProps,
  ref: React.ForwardedRef<TextInput>,
) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'Input');
  const [isFocused, setIsFocused] = useState(false);
  const TextField = useSheetTextInputComponent();
  const inSheet = useInBottomSheet();
  const isNumeric = Boolean(keyboardType && NUMERIC_KEYBOARDS.has(String(keyboardType)));
  const isMultiline = Boolean(multiline);

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

  const resolvedReturnKeyType = isMultiline
    ? (returnKeyType ?? 'default')
    : resolveReturnKeyType(keyboardType, returnKeyType, inSheet);
  const iosNumericAccessory =
    Platform.OS === 'ios' && inSheet && isNumeric ? SHEET_KEYBOARD_ACCESSORY_ID : undefined;

  const fieldStyle = [
    styles.input,
    isMultiline && styles.inputMultiline,
    leftIcon ? styles.inputWithLeftIcon : null,
    rightIcon ? styles.inputWithRightIcon : null,
    style,
  ];

  const borderStyle = {
    borderColor,
    borderWidth: isFocused ? 1.5 : 1,
  };

  const textFieldProps = {
    ref: ref as never,
    onFocus: handleFocus,
    onBlur: handleBlur,
    keyboardType,
    returnKeyType: resolvedReturnKeyType,
    returnKeyLabel: Platform.OS === 'android' && isNumeric ? 'Valider' : undefined,
    inputAccessoryViewID: iosNumericAccessory,
    blurOnSubmit: isMultiline ? false : (blurOnSubmitProp ?? true),
    submitBehavior: (isMultiline ? 'newline' : 'blurAndSubmit') as TextInputProps['submitBehavior'],
    accessibilityLabel: props.accessibilityLabel ?? label,
    placeholderTextColor: c.textTertiary,
    selectionColor: c.primary,
    cursorColor: c.primary,
    multiline,
    ...props,
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText style={[styles.label, isFocused && styles.labelFocused]}>{label}</AppText>
      ) : null}

      {isMultiline ? (
        <View style={[styles.container, styles.containerMultiline, borderStyle]}>
          {leftIcon ? <View style={styles.iconLeftMultiline}>{leftIcon}</View> : null}
          <TextField {...textFieldProps} style={fieldStyle} />
          {rightIcon ? <View style={styles.iconRightMultiline}>{rightIcon}</View> : null}
        </View>
      ) : (
        <Row style={[styles.container, borderStyle]}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <TextField {...textFieldProps} style={fieldStyle} />
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </Row>
      )}

      {error ? <AppText style={styles.error}>{error}</AppText> : hint ? <AppText style={styles.hint}>{hint}</AppText> : null}
    </View>
  );
}

export const Input = React.memo(React.forwardRef(InputComponent));

function buildStyles(c: AppColors) {
  return {
  wrapper: {
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: 0.3,
    color: c.textSecondary,
    marginBottom: 2,
  },
  labelFocused: {
    color: c.primary,
  },
  container: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 52,
    overflow: 'hidden' as const,
  },
  containerMultiline: {
    minHeight: 120,
  },
  input: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textPrimary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top' as const,
    paddingTop: spacing[3],
  },
  inputWithLeftIcon: {
    paddingLeft: spacing[2],
  },
  inputWithRightIcon: {
    paddingRight: spacing[2],
  },
  iconLeft: {
    paddingLeft: spacing[4],
  },
  iconLeftMultiline: {
    paddingLeft: spacing[4],
    paddingTop: spacing[3],
  },
  iconRight: {
    paddingRight: spacing[4],
  },
  iconRightMultiline: {
    paddingRight: spacing[4],
    paddingTop: spacing[3],
  },
  error: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.error,
    letterSpacing: 0.1,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}
