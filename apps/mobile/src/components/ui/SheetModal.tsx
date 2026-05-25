import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { ChevronLeft } from 'lucide-react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Hauteur réservée au footer collant pour l’offset de scroll au clavier. */
const FOOTER_STICKY_HEIGHT = 88;
/** Hauteur max de la sheet (≈ ancien `maxHeight: '86%'`). */
const MAX_HEIGHT_RATIO = 0.86;
const MIN_SHEET_HEIGHT = 160;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  /** Corps sans ScrollView (ex. FlatList/WebView imbriquée). */
  disableScroll?: boolean;
  /** Fermer en tapant au-dessus du panneau. */
  dismissOnBackdropPress?: boolean;
  /** Ajuste le contenu quand le clavier est ouvert (défaut true). */
  keyboardAware?: boolean;
  /** Glisser vers le bas (poignée) pour fermer (défaut true). */
  enableSwipeToDismiss?: boolean;
}

/**
 * Bottom sheet basé sur `@gorhom/bottom-sheet` (`BottomSheetModal`) :
 * un seul hôte/portail partagé (`BottomSheetModalProvider`) → plus de `<Modal>`
 * natifs empilés, plus de double source de vérité → fini les flashs / réouvertures.
 *
 * L’API publique est strictement identique à l’ancienne implémentation maison :
 * les ~20 appelants n’ont rien à changer.
 *
 * Détails de fidélité au comportement d’origine :
 * - Drag uniquement par la poignée (`enableContentPanningGesture={false}`) : les
 *   listes/WebView internes scrollent librement, comme avant.
 * - Clavier géré par `react-native-keyboard-controller` (KeyboardScrollView +
 *   KeyboardStickyView) : gorhom ne déplace la sheet que sur focus d’un
 *   `BottomSheetTextInput` — or ici les champs sont des `TextInput` standard,
 *   donc gorhom ne touche pas au clavier.
 * - Hauteur = contenu mesuré, plafonné à 86 % puis scroll (ancien `maxHeight`).
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
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = windowHeight * MAX_HEIGHT_RATIO;

  const [headerH, setHeaderH] = useState(0);
  const [bodyH, setBodyH] = useState(0);
  const [footerH, setFooterH] = useState(0);

  // Pont `visible` → present()/dismiss() (source de vérité unique côté parent).
  const presentedRef = useRef(false);
  const skipDismissCallback = useRef(false);

  useEffect(() => {
    if (visible && !presentedRef.current) {
      presentedRef.current = true;
      ref.current?.present();
    } else if (!visible && presentedRef.current) {
      // Fermeture demandée par le parent : ne pas renvoyer onClose en écho.
      skipDismissCallback.current = true;
      presentedRef.current = false;
      ref.current?.dismiss();
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    presentedRef.current = false;
    if (skipDismissCallback.current) {
      skipDismissCallback.current = false;
      return;
    }
    // Fermeture initiée par l’utilisateur (swipe / backdrop / bouton retour OS).
    onClose();
  }, [onClose]);

  const bottomPad = Math.max(insets.bottom, spacing[2]);

  const sheetHeight = useMemo(() => {
    // Avant la première mesure, on ouvre sur une hauteur raisonnable puis on s’ajuste.
    if (bodyH <= 0) return Math.min(maxHeight, windowHeight * 0.5);
    const desired = headerH + bodyH + footerH + (footer ? 0 : bottomPad);
    return Math.min(Math.max(desired, MIN_SHEET_HEIGHT), maxHeight);
  }, [headerH, bodyH, footerH, footer, bottomPad, maxHeight, windowHeight]);

  const snapPoints = useMemo(() => [sheetHeight], [sheetHeight]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0}
        pressBehavior={dismissOnBackdropPress ? 'close' : 'none'}
      />
    ),
    [dismissOnBackdropPress],
  );

  const renderHandle = useCallback(
    () => (
      <View
        style={styles.handleZone}
        onLayout={(e: LayoutChangeEvent) => setHeaderH(e.nativeEvent.layout.height)}
        accessibilityLabel="Glisser vers le bas pour fermer"
      >
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
    [onBack, title, subtitle],
  );

  const scrollBottomOffset = footer ? FOOTER_STICKY_HEIGHT + bottomPad : bottomPad;
  const bodyContentStyle = [styles.body, contentStyle, footer ? null : { paddingBottom: bottomPad }];
  const onBodyContentSize = useCallback((_w: number, h: number) => setBodyH(h), []);

  const body = disableScroll ? (
    <View
      style={[styles.bodyStatic, ...bodyContentStyle]}
      onLayout={(e: LayoutChangeEvent) => setBodyH(e.nativeEvent.layout.height)}
    >
      {children}
    </View>
  ) : keyboardAware ? (
    <KeyboardScrollView
      style={styles.scroll}
      contentContainerStyle={bodyContentStyle}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="interactive"
      bottomOffset={scrollBottomOffset}
      nestedScrollEnabled
      onContentSizeChange={onBodyContentSize}
    >
      {children}
    </KeyboardScrollView>
  ) : (
    <KeyboardScrollView
      style={styles.scroll}
      contentContainerStyle={bodyContentStyle}
      enabled={false}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="none"
      nestedScrollEnabled
      onContentSizeChange={onBodyContentSize}
    >
      {children}
    </KeyboardScrollView>
  );

  const footerNode = footer ? (
    <KeyboardStickyView offset={{ closed: 0, opened: bottomPad }}>
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}
        onLayout={(e: LayoutChangeEvent) => setFooterH(e.nativeEvent.layout.height)}
      >
        {footer}
      </View>
    </KeyboardStickyView>
  ) : null;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      index={0}
      enableDynamicSizing={false}
      enablePanDownToClose={enableSwipeToDismiss}
      enableHandlePanningGesture={enableSwipeToDismiss}
      enableContentPanningGesture={false}
      handleComponent={renderHandle}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      topInset={insets.top}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={handleDismiss}
    >
      {/* Enfants rendus directement dans le conteneur borné de gorhom
          (Animated.View, hauteur = snapPoint − poignée) : le corps en `flexShrink`
          y scrolle quand le contenu dépasse, le footer reste collé en bas. */}
      {body}
      {footerNode}
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
    // Pas de flexShrink : le corps statique se mesure à sa hauteur *naturelle*
    // (onLayout) pour piloter le snapPoint ; les listes/WebView internes ont
    // leur propre `maxHeight` et scrollent toutes seules.
    minHeight: 0,
  },
  footer: {
    flexShrink: 0,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
});
