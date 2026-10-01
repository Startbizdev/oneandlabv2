import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SectionList,
  Share,
  StyleSheet,
  TextInput,
  View,
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
import { Archive, Download, Search, SquarePen, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { exportAiConversations } from '../api/ai.service';
import { PatientAiConversationRow } from './PatientAiConversationRow';
import type { PatientAiConversation } from '../types/patient-ai-conversation';
import {
  H_PADDING,
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  useLayoutMetrics,
  AppText,
  useStyles,
  font,
  lh,
  type Theme,
} from '@/theme';

const SHEET_MAX_WIDTH = 380;
const SHEET_WIDTH_RATIO = 0.9;

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
  onDeleteConversation?: (id: string) => void;
  onRefresh?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  onTogglePin?: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
}

function groupConversations(conversations: PatientAiConversation[]): ConversationSection[] {
  const sorted = [...conversations].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
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

function emptyCopy(searching: boolean, showArchived: boolean) {
  if (searching) {
    return { illustration: 'search' as const, title: 'Aucun résultat', description: 'Essayez un autre mot.' };
  }
  if (showArchived) {
    return { illustration: 'messages' as const, title: 'Aucune archive', description: undefined };
  }
  return {
    illustration: 'messages' as const,
    title: 'Aucune conversation',
    description: 'Vos échanges avec Cary apparaîtront ici.',
  };
}

/** Panneau latéral Cary — historique des conversations. */
export function PatientAiConversationsSheet({
  visible,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRefresh,
  searchQuery = '',
  onSearchChange,
  showArchived = false,
  onToggleArchived,
  onTogglePin,
  onArchive,
  onUnarchive,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const layout = useLayoutMetrics();
  const sheetWidth = Math.min(SHEET_MAX_WIDTH, Math.round(layout.width * SHEET_WIDTH_RATIO));

  const translateX = useSharedValue(-sheetWidth);
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useStateVisible(visible);

  const sections = useMemo(() => groupConversations(conversations), [conversations]);
  const empty = emptyCopy(searchQuery.trim().length > 0, showArchived);

  const finishClose = useCallback(() => {
    setMounted(false);
  }, [setMounted]);

  useEffect(() => {
    translateX.value = -sheetWidth;
  }, [sheetWidth, translateX]);

  useEffect(() => {
    if (visible) {
      onRefresh?.();
    }
  }, [visible, onRefresh]);

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
    opacity: backdropOpacity.value * 0.4,
  }));

  const handleNew = () => {
    onNewConversation();
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelectConversation(id);
    onClose();
  };

  const handleExport = async () => {
    try {
      const data = await exportAiConversations();
      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: 'Export Cary IA',
      });
    } catch (e) {
      const message = getErrorMessage(e);
      if (__DEV__) {
        console.warn('[API] ai-export', message);
      }
      Alert.alert('Export impossible', message);
    }
  };

  const renderItem: SectionListRenderItem<PatientAiConversation, ConversationSection> = ({
    item,
  }) => (
    <PatientAiConversationRow
      title={item.title}
      active={item.id === activeId}
      pinned={item.isPinned}
      deletable={!item.isSystem}
      onPress={() => handleSelect(item.id)}
      onDelete={onDeleteConversation ? () => onDeleteConversation(item.id) : undefined}
      onTogglePin={onTogglePin && !item.isSystem ? () => onTogglePin(item.id) : undefined}
      onArchive={
        showArchived
          ? onUnarchive
            ? () => onUnarchive(item.id)
            : undefined
          : onArchive && !item.isSystem
            ? () => onArchive(item.id)
            : undefined
      }
      archiveLabel={showArchived ? 'Restaurer' : 'Archiver'}
    />
  );

  const renderSectionHeader = ({ section }: { section: ConversationSection }) => (
    <AppText
      variant="caption"
      style={[styles.sectionLabel, section.key === sections[0]?.key && styles.sectionLabelFirst]}
    >
      {section.title}
    </AppText>
  );

  useEffect(() => {
    if (!visible && mounted) {
      const safety = setTimeout(() => setMounted(false), 500);
      return () => clearTimeout(safety);
    }
  }, [visible, mounted, setMounted]);

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
                paddingTop: insets.top + spacing[2],
                paddingBottom: Math.max(insets.bottom, spacing[3]),
              },
            ]}
          >
            <View style={styles.header}>
              <AppText variant="title" style={styles.headerTitle} accessibilityRole="header">
                {showArchived ? 'Archives' : 'Conversations'}
              </AppText>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              >
                <X size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
              </Pressable>
            </View>

            <View style={styles.toolbar}>
              {onSearchChange ? (
                <View style={styles.searchField}>
                  <Search size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher"
                    placeholderTextColor={c.textTertiary}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    accessibilityLabel="Rechercher une conversation"
                  />
                </View>
              ) : null}

              <Button
                title="Nouvelle conversation"
                onPress={handleNew}
                fullWidth
                size="md"
                leftIcon={<SquarePen size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
              />
            </View>

            <SectionList
              sections={sections}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              stickySectionHeadersEnabled={false}
              removeClippedSubviews={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState
                  illustration={empty.illustration}
                  title={empty.title}
                  description={empty.description}
                />
              }
              ListFooterComponent={
                <View style={styles.footerWrap}>
                  <SettingsSection
                    items={[
                      ...(onToggleArchived
                        ? [
                            {
                              icon: Archive,
                              label: showArchived ? 'Conversations actives' : 'Archives',
                              onPress: onToggleArchived,
                              inlineAction: true,
                            },
                          ]
                        : []),
                      {
                        icon: Download,
                        label: 'Exporter mes conversations',
                        onPress: () => void handleExport(),
                        inlineAction: true,
                      },
                    ]}
                  />
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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    root: {
      flex: 1,
      minWidth: 0,
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
          shadowColor: c.textPrimary,
          shadowOffset: { width: 4, height: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
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
      gap: spacing[2],
      paddingLeft: H_PADDING,
      paddingRight: spacing[2],
      paddingBottom: spacing[2],
    },
    headerTitle: {
      flex: 1,
      minWidth: 0,
    },
    iconBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconBtnPressed: {
      backgroundColor: c.surfaceAlt,
    },
    toolbar: {
      gap: spacing[3],
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[3],
    },
    searchField: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing[3],
      minHeight: MIN_TOUCH_TARGET,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      color: c.textPrimary,
      paddingVertical: spacing[2],
    },
    list: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[2],
      paddingBottom: spacing[4],
      flexGrow: 1,
    },
    sectionLabel: {
      ...font.medium,
      paddingTop: spacing[5],
      paddingBottom: spacing[1],
      paddingHorizontal: spacing[3],
    },
    sectionLabelFirst: {
      paddingTop: spacing[1],
    },
    footerWrap: {
      paddingHorizontal: spacing[2],
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
  };
}
