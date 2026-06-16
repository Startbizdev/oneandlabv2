import { createElement } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { StackHeaderBackButton } from '@/navigation/StackHeaderBackButton';

/**
 * Retour avec handler custom — orb glass circulaire + chevron centré.
 */
export function stackCustomBackOptions(onPress: () => void): NativeStackNavigationOptions {
  return {
    headerBackVisible: false,
    headerLeft: () => createElement(StackHeaderBackButton, { onPress }),
  };
}
