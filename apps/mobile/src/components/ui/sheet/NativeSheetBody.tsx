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

/** Au-delà, le contenu défile dans la sheet (hauteur ajustée au contenu). */
const MAX_FIT_CONTENT_RATIO = 0.8;

/**
 * En-tête puis ScrollView, enfants directs de l'écran : sur un palier fixe, iOS ne dimensionne
 * le ScrollView d'une formSheet que s'il est le 1er enfant, ou le 2e derrière un en-tête non aplati.
 * Le pied fixe d'un palier fixe vient donc en 3e enfant, après le ScrollView, et suit le clavier
 * (la sheet à palier fixe ne remonte pas d'elle-même) ; le champ actif reste au-dessus de lui.
 * Ajustée au contenu, la sheet native remonte elle-même au-dessus du clavier : pas de marge clavier en plus.
 */
export function NativeSheetBody({ entry }: { entry: SheetEntry }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const fitToContents = entry.detents === 'fitToContents';
  /** iOS ajoute lui-même la zone de l'indicateur d'accueil sous une sheet ajustée au contenu. */
  const bottomInset = Platform.OS === 'ios' && fitToContents ? 0 : insets.bottom;
  /** Palier fixe : l'action principale reste visible quelle que soit la longueur du contenu. */
  const pinnedFooter = Boolean(entry.footer) && !fitToContents && !entry.disableScroll;
  /** Hauteur réelle du pied fixe (un ou plusieurs boutons) ; sa marge basse disparaît clavier ouvert. */
  const [pinnedFooterHeight, setPinnedFooterHeight] = useState(0);
  const footerAboveKeyboard = pinnedFooter ? Math.max(0, pinnedFooterHeight - bottomInset) : 0;

  const content = (
    <>
      {entry.content}
      {entry.footer && !pinnedFooter ? <View style={styles.footer}>{entry.footer}</View> : null}
    </>
  );
  const bodyStyle = [
    styles.body,
    entry.contentStyle,
    { paddingBottom: spacing[4] + (pinnedFooter ? 0 : bottomInset) },
  ];
  return (
    <>
      <View collapsable={false} style={styles.header}>
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
      <SheetKeyboardProvider>
        {entry.disableScroll ? (
          <View style={bodyStyle}>{content}</View>
        ) : (
          <KeyboardScrollView
            enabled={!fitToContents}
            bottomOffset={spacing[4] + footerAboveKeyboard}
            contentInsetAdjustmentBehavior="never"
            nestedScrollEnabled
            style={fitToContents ? { maxHeight: height * MAX_FIT_CONTENT_RATIO } : styles.fill}
            contentContainerStyle={bodyStyle}
          >
            {content}
          </KeyboardScrollView>
        )}
        {pinnedFooter ? (
          <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
            <View
              style={[styles.pinnedFooter, { paddingBottom: spacing[3] + bottomInset }]}
              onLayout={(e) => setPinnedFooterHeight(e.nativeEvent.layout.height)}
            >
              {entry.footer}
            </View>
          </KeyboardStickyView>
        ) : null}
      </SheetKeyboardProvider>
    </>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    fill: { flex: 1 },
    handle: {
      alignSelf: 'center' as const,
      width: 36,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: spacing[2],
    },
    header: {
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
      marginTop: spacing[2],
      paddingTop: spacing[3],
      gap: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    pinnedFooter: {
      paddingTop: spacing[3],
      paddingHorizontal: spacing[4],
      gap: spacing[2],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surface,
    },
  };
}
