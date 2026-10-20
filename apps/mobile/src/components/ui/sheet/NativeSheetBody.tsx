import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, iconSize, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { SheetKeyboardProvider } from '../sheet-keyboard-context';
import type { SheetEntry } from './sheet-store';

/** Hauteur maximale d'une sheet ajustée au contenu (en-tête et pied compris) ; au-delà, le contenu défile. */
const MAX_FIT_CONTENT_RATIO = 0.88;

/**
 * Une seule colonne non aplatie `[en-tête | ScrollView | pied fixe]`, quelle que soit la hauteur de la sheet.
 * Sur iOS, react-native-screens cherche le ScrollView de la sheet (enfant direct, puis premier enfant en
 * cascade) et lui impose la taille de toute la sheet. Ici il n'est ni l'un ni l'autre : l'en-tête reste le
 * premier enfant natif (donc sans `zIndex`, qui réordonne les vues sous Fabric) et Yoga garde la main.
 * - Palier fixe (`snapPoints`) : la colonne remplit la sheet (`sheetScreenOptions` ancre le conteneur),
 *   le ScrollView prend la place restante.
 * - Ajustée au contenu : la colonne suit son contenu, le ScrollView est borné pour que la sheet, pied compris,
 *   tienne à l'écran quand le contenu grandit (champ révélé, message d'erreur…).
 * Le pied reste toujours visible : l'action principale ne dépend jamais de la longueur du contenu.
 */
export function NativeSheetBody({ entry }: { entry: SheetEntry }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fitToContents = entry.detents === 'fitToContents';
  /** iOS ajoute lui-même la zone de l'indicateur d'accueil sous une sheet ajustée au contenu. */
  const bottomInset = Platform.OS === 'ios' && fitToContents ? 0 : insets.bottom;
  const hasFooter = Boolean(entry.footer);
  const [headerHeight, setHeaderHeight] = useState(0);
  /** Hauteur réelle du pied (un ou plusieurs boutons) ; sa marge basse disparaît clavier ouvert. */
  const [footerHeight, setFooterHeight] = useState(0);
  const footerAboveKeyboard = hasFooter ? Math.max(0, footerHeight - bottomInset) : 0;
  const maxFitScrollHeight = Math.max(0, height * MAX_FIT_CONTENT_RATIO - headerHeight - footerHeight);

  const bodyStyle = [
    styles.body,
    entry.contentStyle,
    { paddingBottom: spacing[4] + (hasFooter ? 0 : bottomInset) },
  ];
  const header = (
    <View
      collapsable={false}
      style={styles.header}
      onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
    >
      {Platform.OS === 'android' ? <View style={styles.handle} /> : null}
      <Row gap={spacing[2]} style={styles.headerRow}>
        {entry.onBack ? (
          <Pressable onPress={entry.onBack} hitSlop={12} style={styles.backBtn} accessibilityLabel="Retour">
            <ChevronLeft size={iconSize.lg} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        ) : null}
        <View style={styles.headerText}>
          <AppText variant="headline" accessibilityRole="header">
            {entry.title}
          </AppText>
          {entry.subtitle ? <AppText variant="secondary">{entry.subtitle}</AppText> : null}
        </View>
      </Row>
    </View>
  );
  const footer = hasFooter ? (
    <View
      style={[styles.footer, { paddingBottom: spacing[3] + bottomInset }]}
      onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
    >
      {entry.footer}
    </View>
  ) : null;

  return (
    <View collapsable={false} style={fitToContents ? styles.fitColumn : styles.fixedColumn}>
      {header}
      <SheetKeyboardProvider>
        {entry.disableScroll ? (
          <View style={[bodyStyle, fitToContents ? null : styles.fill]}>{entry.content}</View>
        ) : (
          <KeyboardScrollView
            /** Ajustée au contenu, la sheet native remonte elle-même au-dessus du clavier. */
            enabled={!fitToContents}
            bottomOffset={spacing[4] + footerAboveKeyboard}
            contentInsetAdjustmentBehavior="never"
            nestedScrollEnabled
            style={fitToContents ? { maxHeight: maxFitScrollHeight } : styles.fill}
            contentContainerStyle={bodyStyle}
          >
            {entry.content}
          </KeyboardScrollView>
        )}
        {/* Palier fixe sur iOS : la sheet ne remonte pas avec le clavier, le pied le suit. Android remonte la sheet. */}
        {footer && Platform.OS === 'ios' && !fitToContents ? (
          <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>{footer}</KeyboardStickyView>
        ) : (
          footer
        )}
      </SheetKeyboardProvider>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    fill: { flex: 1, minHeight: 0 },
    fixedColumn: {
      flex: 1,
      minHeight: 0,
      width: '100%' as const,
      alignSelf: 'stretch' as const,
    },
    fitColumn: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
    },
    handle: {
      alignSelf: 'center' as const,
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: spacing[2],
    },
    /**
     * Jamais de `zIndex` ici : avec Fabric, il réordonne les vues natives et place le ScrollView en premier.
     * react-native-screens (iOS) le trouve alors par le premier enfant et lui impose toute la sheet :
     * le contenu passe sous l'en-tête et le scroll revient en haut.
     */
    header: {
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    headerRow: {
      paddingTop: Platform.OS === 'ios' ? spacing[5] : spacing[3],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[3],
    },
    backBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: spacing[1],
    },
    body: {
      padding: spacing[4],
      gap: spacing[3],
    },
    footer: {
      paddingTop: spacing[3],
      paddingHorizontal: spacing[4],
      gap: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
  };
}
