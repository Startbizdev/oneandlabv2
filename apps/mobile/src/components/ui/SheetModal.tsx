import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { ChevronLeft } from 'lucide-react-native';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
}

/**
 * Bottom sheet — sans overlay sombre ; ombre portée en haut du panneau.
 * Clavier : KeyboardAwareScrollView + KeyboardStickyView (react-native-keyboard-controller).
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
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomOffset = footer ? 12 : Math.max(insets.bottom, spacing[2]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const body = disableScroll ? (
    <View style={[styles.body, styles.bodyStatic, contentStyle]}>{children}</View>
  ) : keyboardAware ? (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.body, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      bottomOffset={bottomOffset}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <KeyboardAwareScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.body, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      enabled={false}
    >
      {children}
    </KeyboardAwareScrollView>
  );

  const footerNode = footer ? (
    keyboardAware ? (
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={styles.footer}>{footer}</View>
      </KeyboardStickyView>
    ) : (
      <View style={styles.footer}>{footer}</View>
    )
  ) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.root}>
        {dismissOnBackdropPress ? (
          <Pressable
            style={styles.dismissArea}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          />
        ) : (
          <View style={styles.dismissArea} />
        )}

        <View style={[styles.sheet, elevation.sheetTop]}>
          <SafeAreaView edges={['bottom']} style={styles.panel}>
            <View style={styles.column}>
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

              {body}
              {footerNode}
            </View>
          </SafeAreaView>
        </View>
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
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing[2],
    marginBottom: spacing[2],
    flexShrink: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    flexShrink: 0,
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
