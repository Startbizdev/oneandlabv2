import { memo, type ComponentType } from 'react';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';
import {
  SCROLLABLE_TYPE,
  createBottomSheetScrollableComponent,
  type BottomSheetScrollViewMethods,
} from '@gorhom/bottom-sheet';
import type { BottomSheetScrollViewProps } from '@gorhom/bottom-sheet/src/components/bottomSheetScrollable/types';
import Reanimated from 'react-native-reanimated';

const AnimatedScrollView = Reanimated.createAnimatedComponent(KeyboardAwareScrollView);

const BottomSheetScrollViewComponent = createBottomSheetScrollableComponent<
  BottomSheetScrollViewMethods,
  BottomSheetScrollViewProps
>(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedScrollView);

export type SheetKeyboardAwareScrollViewProps = BottomSheetScrollViewProps &
  KeyboardAwareScrollViewProps;

const MemoScroll = memo(BottomSheetScrollViewComponent);
MemoScroll.displayName = 'BottomSheetKeyboardAwareScrollView';

export const BottomSheetKeyboardAwareScrollView =
  MemoScroll as ComponentType<SheetKeyboardAwareScrollViewProps>;
