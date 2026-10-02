import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback, useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { buildFieldStyles, FIELD_MIN_HEIGHT } from './field-styles';

const NUMERIC_KEYBOARDS = new Set([
  'number-pad',
  'phone-pad',
  'decimal-pad',
  'ascii-capable-number-pad',
]);

/** Android affiche la fin d'une valeur longue pré-remplie : hors focus, on montre son début. */
const START_SELECTION = { start: 0, end: 0 };

/** Pavé numérique : « Valider » natif Android ; iOS : barre native au-dessus du pavé (`inputAccessoryViewButtonLabel`). */
function resolveReturnKeyType(
  keyboardType: TextInputProps['keyboardType'],
  returnKeyType: TextInputProps['returnKeyType'],
): TextInputProps['returnKeyType'] {
  if (keyboardType && NUMERIC_KEYBOARDS.has(String(keyboardType))) {
    if (Platform.OS === 'ios') {
      return undefined;
    }
    return returnKeyType ?? 'done';
  }
  return returnKeyType;
}

export interface InputProps extends TextInputProps {
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
  const styles = useStyles(buildStyles);
  const field = useStyles(buildFieldStyles);
  const [isFocused, setIsFocused] = useState(false);
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
    : resolveReturnKeyType(keyboardType, returnKeyType);
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
    ref,
    onFocus: handleFocus,
    onBlur: handleBlur,
    keyboardType,
    returnKeyType: resolvedReturnKeyType,
    returnKeyLabel: Platform.OS === 'android' && isNumeric ? 'Valider' : undefined,
    inputAccessoryViewButtonLabel: Platform.OS === 'ios' && isNumeric ? 'Valider' : undefined,
    blurOnSubmit: isMultiline ? false : (blurOnSubmitProp ?? true),
    submitBehavior: (isMultiline ? 'newline' : 'blurAndSubmit') as TextInputProps['submitBehavior'],
    accessibilityLabel: props.accessibilityLabel ?? label,
    accessibilityHint: props.accessibilityHint ?? error ?? hint,
    placeholderTextColor: c.textTertiary,
    selectionColor: c.primary,
    cursorColor: c.primary,
    multiline,
    selection: Platform.OS === 'android' && !isMultiline && !isFocused ? START_SELECTION : undefined,
    ...props,
  };

  return (
    <View style={field.wrapper}>
      {label ? (
        <AppText style={[field.label, isFocused && field.labelFocused]}>{label}</AppText>
      ) : null}

      {isMultiline ? (
        <View style={[field.container, styles.containerMultiline, borderStyle]}>
          {leftIcon ? <View style={styles.iconLeftMultiline}>{leftIcon}</View> : null}
          <TextInput {...textFieldProps} style={fieldStyle} />
          {rightIcon ? <View style={styles.iconRightMultiline}>{rightIcon}</View> : null}
        </View>
      ) : (
        <Row style={[field.container, styles.containerSingle, borderStyle]}>
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
          <TextInput {...textFieldProps} style={fieldStyle} />
          {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
        </Row>
      )}

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

export const Input = React.memo(React.forwardRef(InputComponent));

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    containerSingle: {
      minHeight: FIELD_MIN_HEIGHT,
    },
    containerMultiline: {
      minHeight: 120,
    },
    input: {
      minWidth: 0,
      flex: 1,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      minHeight: FIELD_MIN_HEIGHT,
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
      paddingRight: spacing[2],
    },
    iconRightMultiline: {
      paddingRight: spacing[4],
      paddingTop: spacing[3],
    },
  };
}
