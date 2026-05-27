import { useCallback, useEffect, useRef } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { BottomSheetModalContainer } from './BottomSheetModalContainer';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { SheetKeyboardProvider } from './sheet-keyboard-context';

const MAX_HEIGHT_RATIO = 0.86;
/** Ouverture haute pour fiches profil (intervenant RDV). */
export const PROFILE_SHEET_SNAP_POINTS: (string | number)[] = ['92%'];

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  /**
   * Actions en bas du scroll (après `children`), pas en footer Gorhom —
   * sinon les champs sont masqués à l’ouverture / avec le clavier.
   */
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  /** WebView / scroll interne uniquement. */
  disableScroll?: boolean;
  dismissOnBackdropPress?: boolean;
  enableSwipeToDismiss?: boolean;
  presentKey?: string | number;
  /** Appelé quand la sheet est entièrement fermée après `visible={false}` (pas au swipe → onClose). */
  onDismissed?: () => void;
  /** Remplace le dynamic sizing (ex. fiche profil plein écran). */
  snapPoints?: (string | number)[];
  /** Empilement si une autre sheet est déjà ouverte (`push` pour les selects). */
  stackBehavior?: 'push' | 'switch' | 'replace';
}

/**
 * Bottom sheet @gorhom/bottom-sheet v5 — contenu + actions dans le scroll, hauteur auto.
 */
export function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  onBack,
  children,
  footer,
  contentStyle,
  disableScroll = false,
  dismissOnBackdropPress = true,
  enableSwipeToDismiss = true,
  presentKey,
  onDismissed,
  snapPoints,
  stackBehavior = 'switch',
}: Props) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxDynamicContentSize = windowHeight * MAX_HEIGHT_RATIO;
  const useFixedSnap = snapPoints != null && snapPoints.length > 0;

  const dismissFromParentRef = useRef(false);
  const hasPresentedRef = useRef(false);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (visible) {
      dismissFromParentRef.current = false;
      modal.present();
      hasPresentedRef.current = true;
      return;
    }

    if (!hasPresentedRef.current) return;
    dismissFromParentRef.current = true;
    hasPresentedRef.current = false;
    modal.dismiss();
  }, [visible, presentKey]);

  const handleDismiss = useCallback(() => {
    hasPresentedRef.current = false;
    if (dismissFromParentRef.current) {
      dismissFromParentRef.current = false;
      onDismissed?.();
      return;
    }
    onClose();
  }, [onClose, onDismissed]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.45}
        pressBehavior={dismissOnBackdropPress ? 'close' : 'none'}
      />
    ),
    [dismissOnBackdropPress],
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleZone}>
        <View style={styles.handle} />
        <View style={styles.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn} accessibilityLabel="Retour">
              <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </View>
    ),
    [onBack, subtitle, title],
  );

  const bottomPad = Math.max(insets.bottom, spacing[3]);
  const contentStyleBase = [
    styles.body,
    contentStyle,
    { paddingBottom: bottomPad },
    !useFixedSnap && styles.bodyFitContent,
  ];

  const content = (
    <>
      {children}
      {footer ? <View style={styles.scrollFooter}>{footer}</View> : null}
    </>
  );

  const body = disableScroll ? (
    <BottomSheetView style={[contentStyleBase, useFixedSnap && styles.fixedSnapBody]}>
      {content}
    </BottomSheetView>
  ) : (
    <BottomSheetScrollView
      contentContainerStyle={contentStyleBase}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </BottomSheetScrollView>
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      stackBehavior={stackBehavior}
      containerComponent={Platform.OS === 'ios' ? BottomSheetModalContainer : undefined}
      enableDynamicSizing={!useFixedSnap}
      maxDynamicContentSize={useFixedSnap ? undefined : maxDynamicContentSize}
      snapPoints={useFixedSnap ? snapPoints : undefined}
      index={useFixedSnap ? snapPoints!.length - 1 : undefined}
      enablePanDownToClose={enableSwipeToDismiss}
      enableHandlePanningGesture={enableSwipeToDismiss}
      enableContentPanningGesture={!disableScroll}
      handleComponent={renderHandle}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      topInset={insets.top}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      android_keyboardInputMode="adjustResize"
      onDismiss={handleDismiss}
    >
      <SheetKeyboardProvider>{body}</SheetKeyboardProvider>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    ...elevation.sheetTop,
  },
  handleZone: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
  bodyFitContent: {
    flexGrow: 0,
  },
  scrollFooter: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    gap: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  fixedSnapBody: {
    flex: 1,
  },
});
