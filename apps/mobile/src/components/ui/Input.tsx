import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import React, { useCallback, useState } from 'react';
import {
  Platform,
  Text,
  TextInput,
  View,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { useSheetTextInputComponent } from './sheet-keyboard-context';

/** Claviers iOS sans touche retour — RN injecte une barre « Done » si returnKeyType="done". */
const IOS_ACCESSORY_DONE_KEYBOARDS = new Set([
  'number-pad',
  'phone-pad',
  'decimal-pad',
  'ascii-capable-number-pad',
]);

function resolveReturnKeyType(
  keyboardType: TextInputProps['keyboardType'],
  returnKeyType: TextInputProps['returnKeyType'],
): TextInputProps['returnKeyType'] {
  if (
    Platform.OS === 'ios' &&
    returnKeyType === 'done' &&
    keyboardType &&
    IOS_ACCESSORY_DONE_KEYBOARDS.has(String(keyboardType))
  ) {
    return undefined;
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
    ...props
  }: InputProps,
  ref: React.ForwardedRef<TextInput>,
) {
  const [isFocused, setIsFocused] = useState(false);
  const TextField = useSheetTextInputComponent();
  const resolvedReturnKeyType = resolveReturnKeyType(keyboardType, returnKeyType);

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
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <TextField
          ref={ref}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={keyboardType}
          returnKeyType={resolvedReturnKeyType}
          accessibilityLabel={props.accessibilityLabel ?? label}
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          {...props}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 52,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textPrimary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
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
  iconRight: {
    paddingRight: spacing[4],
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

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('components_ui_Input_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
