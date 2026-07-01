import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SectionList,
  Share,
  StyleSheet,
  Text,
  TextInput,
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
import { Archive, Download, MessageSquare, Search, X } from 'lucide-react-native';
import { Cluster, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { MoreMenuSection } from '@/features/profile/components/MoreMenuSection';
import { exportAiConversations } from '../api/ai.service';
import { PatientAiConversationRow } from './PatientAiConversationRow';
import type { PatientAiConversation } from '../types/patient-ai-conversation';
import { elevation, H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

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

/** Panneau latéral Cary — historique conversations. */
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
  const styles = useThemedStyles(buildStyles, 'PatientAiConversationsSheet');
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
    } catch {
      /* ignore */
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
    <View
      style={[
        styles.sectionHeader,
        section.key === sections[0]?.key && styles.sectionHeaderFirst,
      ]}
    >
      <Text style={styles.sectionLabel}>{section.title}</Text>
    </View>
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
            <Cluster
              align="center"
              style={styles.header}
              actions={
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                >
                  <X size={20} color={c.textSecondary} strokeWidth={2} />
                </Pressable>
              }
            >
              <Text style={styles.headerTitle}>Conversations</Text>
            </Cluster>

            <Stack gap={spacing[3]} style={styles.toolbar}>
              {onSearchChange ? (
                <Cluster
                  gap={spacing[2]}
                  align="center"
                  style={[styles.searchField, elevation.xs]}
                  leading={<Search size={16} color={c.textTertiary} strokeWidth={2} />}
                >
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher"
                    placeholderTextColor={c.textTertiary}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                </Cluster>
              ) : null}

              <Button
                title="Nouvelle conversation"
                onPress={handleNew}
                fullWidth
                size="md"
                leftIcon={<MessageSquare size={18} color={c.textInverse} strokeWidth={2.25} />}
                accessibilityLabel="Démarrer une nouvelle conversation"
              />
            </Stack>

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
                  <Text style={styles.emptyBody}>Vos échanges avec Cary apparaîtront ici.</Text>
                </View>
              }
              ListFooterComponent={
                <View style={styles.footerWrap}>
                  <MoreMenuSection
                    items={[
                      ...(onToggleArchived
                        ? [
                            {
                              icon: Archive,
                              label: showArchived ? 'Conversations actives' : 'Archives',
                              onPress: onToggleArchived,
                              iconAccent: 'muted' as const,
                            },
                          ]
                        : []),
                      {
                        icon: Download,
                        label: 'Exporter (RGPD)',
                        onPress: () => void handleExport(),
                        iconAccent: 'teal' as const,
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

function buildStyles(c: AppColors) {
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
          shadowColor: '#0F172A',
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
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[3],
    },
    headerTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.lg,
      lineHeight: lh(fontSize.lg),
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    iconBtnPressed: {
      backgroundColor: c.surfaceAlt,
    },
    toolbar: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[3],
    },
    searchField: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      minHeight: 44,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      color: c.textPrimary,
      paddingVertical: 0,
    },
    list: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    listContent: {
      paddingHorizontal: spacing[2],
      paddingBottom: spacing[4],
      flexGrow: 1,
    },
    sectionHeader: {
      paddingTop: spacing[4],
      paddingBottom: spacing[1.5],
      paddingHorizontal: spacing[2],
    },
    sectionHeaderFirst: {
      paddingTop: spacing[1],
    },
    sectionLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.textTertiary,
    },
    emptyWrap: {
      alignItems: 'center' as const,
      paddingHorizontal: spacing[6],
      paddingTop: spacing[12],
      gap: spacing[2],
    },
    emptyTitle: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      color: c.textPrimary,
      textAlign: 'center' as const,
    },
    emptyBody: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm, 1.45),
      color: c.textTertiary,
      textAlign: 'center' as const,
    },
    footerWrap: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[4],
      paddingBottom: spacing[2],
    },
  };
}
