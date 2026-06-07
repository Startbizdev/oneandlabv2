import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type SectionListRenderItem,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Smile, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { PatientAiConversationRow } from './PatientAiConversationRow';
import type { PatientAiConversation } from '../types/patient-ai-conversation';
import { elevation, H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

const SHEET_MAX_WIDTH = 320;
const SHEET_WIDTH_RATIO = 0.88;

type ConversationSection = {
  key: string;
  title: string;
  data: PatientAiConversation[];
};

interface Props {
  visible: boolean;
  onClose: () => void;
  conversations: PatientAiConversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

function groupConversations(conversations: PatientAiConversation[]): ConversationSection[] {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const today: PatientAiConversation[] = [];
  const yesterday: PatientAiConversation[] = [];
  const week: PatientAiConversation[] = [];
  const older: PatientAiConversation[] = [];

  for (const conv of sorted) {
    const diffDays = Math.floor((Date.now() - conv.updatedAt) / 86_400_000);
    if (diffDays <= 0) today.push(conv);
    else if (diffDays === 1) yesterday.push(conv);
    else if (diffDays < 7) week.push(conv);
    else older.push(conv);
  }

  const sections: ConversationSection[] = [];
  if (today.length) sections.push({ key: 'today', title: "Aujourd'hui", data: today });
  if (yesterday.length) sections.push({ key: 'yesterday', title: 'Hier', data: yesterday });
  if (week.length) sections.push({ key: 'week', title: '7 derniers jours', data: week });
  if (older.length) sections.push({ key: 'older', title: 'Plus ancien', data: older });
  return sections;
}

/** Panneau latéral Cary — historique conversations (mock). */
export function PatientAiConversationsSheet({
  visible,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const sheetWidth = Math.min(SHEET_MAX_WIDTH, Math.round(windowWidth * SHEET_WIDTH_RATIO));

  const translateX = useSharedValue(-sheetWidth);
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useStateVisible(visible);

  const sections = useMemo(() => groupConversations(conversations), [conversations]);

  const finishClose = useCallback(() => {
    setMounted(false);
  }, [setMounted]);

  useEffect(() => {
    translateX.value = -sheetWidth;
  }, [sheetWidth, translateX]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateX.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 200 });
      return;
    }

    if (!mounted) return;

    translateX.value = withTiming(
      -sheetWidth,
      { duration: 220, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishClose)();
      },
    );
    backdropOpacity.value = withTiming(0, { duration: 180 });
  }, [visible, sheetWidth, mounted, translateX, backdropOpacity, finishClose, setMounted]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value * 0.45,
  }));

  const handleNew = () => {
    onNewConversation();
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    onClose();
  };

  const renderItem: SectionListRenderItem<PatientAiConversation, ConversationSection> = ({
    item,
  }) => (
    <PatientAiConversationRow
      title={item.title}
      active={item.id === activeId}
      onPress={() => handleSelect(item.id)}
    />
  );

  const renderSectionHeader = ({ section }: { section: ConversationSection }) => (
    <Text style={styles.sectionLabel}>{section.title}</Text>
  );

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer">
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <Animated.View style={[styles.panel, panelStyle, { width: sheetWidth }]}>
          <View
            style={[
              styles.safePad,
              {
                paddingTop: insets.top,
                paddingBottom: Math.max(insets.bottom, spacing[2]),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerBrand}>
                <View style={styles.headerAvatar}>
                  <Smile size={18} color={c.primary} strokeWidth={2.25} />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    Conversations
                  </Text>
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    Historique Cary
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              >
                <X size={18} color={c.textSecondary} strokeWidth={2.25} />
              </Pressable>
            </View>

            <View style={styles.ctaWrap}>
              <Button
                title="Nouvelle conversation"
                variant="outline"
                size="sm"
                fullWidth
                onPress={handleNew}
              />
            </View>

            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>Aucune conversation</Text>
                  <Text style={styles.emptyBody}>
                    Démarrez un échange avec Cary pour le retrouver ici.
                  </Text>
                </View>
              }
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useStateVisible(visible: boolean) {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);
  return [mounted, setMounted] as const;
}

function buildStyles(c: AppColors) {
  return {
    root: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.textPrimary,
    },
    panel: {
      position: 'absolute' as const,
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.background,
      borderTopRightRadius: radius['2xl'],
      borderBottomRightRadius: radius['2xl'],
      overflow: 'hidden' as const,
      ...Platform.select({
        ios: {
          shadowColor: '#0F172A',
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.14,
          shadowRadius: 20,
        },
        android: { elevation: 12 },
        default: {},
      }),
    },
    safePad: {
      flex: 1,
      minWidth: 0,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[3],
      paddingBottom: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
      backgroundColor: c.surface,
      ...elevation.xs,
    },
    headerBrand: {
      flex: 1,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      minWidth: 0,
      marginRight: spacing[2],
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: spacing[3],
      flexShrink: 0,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    headerTitle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.md,
      lineHeight: lh(fontSize.md),
      color: c.textPrimary,
    },
    headerSubtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.35),
      color: c.textSecondary,
    },
    closeBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
      ...elevation.xs,
    },
    closeBtnPressed: {
      opacity: 0.88,
    },
    ctaWrap: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
    list: {
      flex: 1,
      minWidth: 0,
    },
    listContent: {
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[6],
    },
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
      color: c.textTertiary,
      paddingTop: spacing[3],
      paddingBottom: spacing[2],
    },
    emptyWrap: {
      alignItems: 'center' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[8],
      gap: spacing[2],
    },
    emptyTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    emptyBody: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.45),
      color: c.textSecondary,
      textAlign: 'center' as const,
    },
  };
}
