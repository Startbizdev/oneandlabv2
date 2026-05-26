import type { ViewStyle } from 'react-native';
import { SheetModal } from './SheetModal';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerIcon?: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  disableScroll?: boolean;
  enableSwipeToDismiss?: boolean;
  dismissOnBackdropPress?: boolean;
  presentKey?: string | number;
}

/** Wrapper SheetModal pour les écrans existants. */
export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  onBack,
  children,
  footer,
  contentStyle,
  disableScroll,
  enableSwipeToDismiss,
  dismissOnBackdropPress,
  presentKey,
}: Props) {
  return (
    <SheetModal
      visible={visible}
      presentKey={presentKey}
      onClose={onClose}
      onBack={onBack}
      title={title}
      subtitle={subtitle}
      footer={footer}
      contentStyle={contentStyle}
      disableScroll={disableScroll}
      enableSwipeToDismiss={enableSwipeToDismiss}
      dismissOnBackdropPress={dismissOnBackdropPress}
    >
      {children}
    </SheetModal>
  );
}
