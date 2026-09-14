import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Input, type InputProps } from '@/components/ui/Input';
import { useAppColors } from '@/theme/use-app-colors';
import { iconSize } from '@/theme';

type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'rightIcon'>;

export function PasswordInput(props: PasswordInputProps) {
  const c = useAppColors();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      secureTextEntry={!visible}
      autoComplete={props.autoComplete ?? 'password'}
      textContentType={props.textContentType ?? 'password'}
      rightIcon={
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
          {visible ? (
            <EyeOff size={iconSize.md} color={c.textSecondary} strokeWidth={2} />
          ) : (
            <Eye size={iconSize.md} color={c.textSecondary} strokeWidth={2} />
          )}
        </Pressable>
      }
    />
  );
}
