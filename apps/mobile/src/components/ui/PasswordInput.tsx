import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Input, type InputProps } from '@/components/ui/Input';
import { useAppColors } from '@/theme/use-app-colors';
import { ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize } from '@/theme';

type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'rightIcon'>;

export function PasswordInput(props: PasswordInputProps) {
  const c = useAppColors();
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;

  return (
    <Input
      {...props}
      secureTextEntry={!visible}
      autoComplete={props.autoComplete ?? 'password'}
      textContentType={props.textContentType ?? 'password'}
      rightIcon={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          <ToggleIcon size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
