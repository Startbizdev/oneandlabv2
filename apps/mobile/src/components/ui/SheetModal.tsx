import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { ChevronLeft } from 'lucide-react-native';
import { colors, elevation, radius, spacing, animation } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Seuil de glissement (px) ou vélocité pour fermer. */
const DISMISS_DRAG = 72;
const DISMISS_VELOCITY = 720;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  /** Corps sans ScrollView (ex. FlatList imbriquée). */
  disableScroll?: boolean;
  /** Fermer en tapant au-dessus du panneau (zone transparente). */
  dismissOnBackdropPress?: boolean;
  /** Ajuste le contenu quand le clavier est ouvert (défaut true). */
  keyboardAware?: boolean;
  /** Glisser vers le bas pour fermer (défaut true). */
  enableSwipeToDismiss?: boolean;
}

/**
 * Bottom sheet — animations 100 % Reanimated (Modal sans animation native).
 * Une seule source de vérité : translateY. Évite le double slide qui saccade à la fermeture.
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
  keyboardAware = true,
  enableSwipeToDismiss = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  /** Hauteur figée à l’ouverture — évite un flash si le clavier redimensionne la fenêtre. */
  const travelHeightRef = useRef(windowHeight);

  const [modalShown, setModalShown] = useState(visible);
  const isClosingRef = useRef(false);
  const modalShownRef = useRef(modalShown);
  modalShownRef.current = modalShown;
  const translateY = useSharedValue(windowHeight);
  const dragStartY = useSharedValue(0);

  const finishDismiss = useCallback(
    (notifyParent: boolean) => {
      isClosingRef.current = false;
      setModalShown(false);
      translateY.value = travelHeightRef.current;
      if (notifyParent) onClose();
    },
    [onClose, translateY],
  );

  const runDismissAnimation = useCallback(
    (notifyParent = true) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      Keyboard.dismiss();
      translateY.value = withTiming(
        travelHeightRef.current,
        { duration: animation.timing.base },
        (finished) => {
          if (finished) runOnJS(finishDismiss)(notifyParent);
        },
      );
    },
    [finishDismiss, translateY],
  );

  const openSheet = useCallback(() => {
    isClosingRef.current = false;
    travelHeightRef.current = windowHeight;
    setModalShown(true);
    translateY.value = windowHeight;
    translateY.value = withSpring(0, animation.spring.snappy);
  }, [translateY, windowHeight]);

  useEffect(() => {
    if (visible) {
      openSheet();
    } else if (modalShownRef.current && !isClosingRef.current) {
      runDismissAnimation(false);
    }
  }, [visible, openSheet, runDismissAnimation]);

  const panGesture = Gesture.Pan()
    .enabled(enableSwipeToDismiss)
    .activeOffsetY(6)
    .failOffsetX([-24, 24])
    .onStart(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(0, dragStartY.value + e.translationY);
    })
    .onEnd((e) => {
      if (translateY.value > DISMISS_DRAG || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(runDismissAnimation)(true);
      } else {
        translateY.value = withSpring(0, animation.spring.snappy);
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const body = disableScroll ? (
    <View style={[styles.body, styles.bodyStatic, contentStyle]}>{children}</View>
  ) : (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.body, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      keyboardDismissMode="interactive"
    >
      {children}
    </ScrollView>
  );

  const footerNode = footer ? <View style={styles.footer}>{footer}</View> : null;

  const panel = (
    <SafeAreaView edges={['bottom']} style={styles.panel}>
      <View style={styles.column}>
        <GestureDetector gesture={panGesture}>
          <View
            style={styles.dragZone}
            accessibilityLabel="Glisser vers le bas pour fermer"
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  hitSlop={12}
                  style={styles.backBtn}
                  accessibilityLabel="Retour"
                >
                  <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
                </Pressable>
              ) : null}
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            </View>
          </View>
        </GestureDetector>

        {body}
        {footerNode}
      </View>
    </SafeAreaView>
  );

  return (
    <Modal
      visible={modalShown}
      transparent
      animationType="none"
      onRequestClose={() => runDismissAnimation(true)}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.root}>
        {dismissOnBackdropPress ? (
          <Pressable
            style={styles.dismissArea}
            onPress={() => runDismissAnimation(true)}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          />
        ) : (
          <View style={styles.dismissArea} />
        )}

        <Animated.View style={[styles.sheet, elevation.sheetTop, sheetAnimStyle]}>
          {keyboardAware ? (
            <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
              {panel}
            </KeyboardStickyView>
          ) : (
            panel
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    width: '100%',
    maxHeight: '86%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    overflow: 'visible',
  },
  panel: {
    width: '100%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    overflow: 'hidden',
  },
  column: {
    flexDirection: 'column',
    maxHeight: '100%',
  },
  dragZone: {
    flexShrink: 0,
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
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
  bodyStatic: {
    flexShrink: 1,
    minHeight: 0,
  },
  footer: {
    flexShrink: 0,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
});
