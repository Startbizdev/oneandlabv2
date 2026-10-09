import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SectionList,
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
import { PatientAiConversationRow } from './PatientAiConversationRow';
import type { PatientAiConversation } from '../types/patient-ai-conversation';
import type { ConversationRowActionKey } from '../utils/conversation-row-actions';
import {
  conversationsEmptyCopy,
  groupConversations,
  type ConversationSection,
} from '../utils/conversation-sections';
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

interface Props {
  visible: boolean;
  onClose: () => void;
  conversations: PatientAiConversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  /** Échec du chargement de la liste, affiché en tête du panneau. */
  listError?: string | null;
  /** Action du menu d'une conversation ; message d'erreur affiché sous la ligne, `null` si elle a abouti. */
  onRowAction: (id: string, key: ConversationRowActionKey, title?: string) => Promise<string | null>;
  /** Export de toutes les conversations ; message d'erreur, ou `null` si la feuille de partage s'est ouverte. */
  onExportAll: () => Promise<string | null>;
}

/** Panneau latéral Cary — historique des conversations. */
export function PatientAiConversationsSheet({
  visible,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  searchQuery = '',
  onSearchChange,
  showArchived = false,
  onToggleArchived,
  listError,
  onRowAction,
  onExportAll,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const layout = useLayoutMetrics();
  const sheetWidth = Math.min(SHEET_MAX_WIDTH, Math.round(layout.width * SHEET_WIDTH_RATIO));

  const translateX = useSharedValue(-sheetWidth);
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useStateVisible(visible);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportAll = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    setExportError(await onExportAll());
    setExporting(false);
  };

  const sections = useMemo(() => groupConversations(conversations), [conversations]);
  const empty = conversationsEmptyCopy(searchQuery.trim().length > 0, showArchived);

  const finishClose = useCallback(() => {
    setMounted(false);
  }, [setMounted]);

  useEffect(() => {
    translateX.value = -sheetWidth;
  }, [sheetWidth, translateX]);

  useEffect(() => {
    if (visible) {
      setExpandedId(null);
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

  const renderItem: SectionListRenderItem<PatientAiConversation, ConversationSection> = ({
    item,
  }) => (
    <PatientAiConversationRow
      conversation={item}
      active={item.id === activeId}
      archived={showArchived}
      expanded={expandedId === item.id}
      onPress={() => handleSelect(item.id)}
      onToggleMenu={() => setExpandedId((current) => (current === item.id ? null : item.id))}
      onAction={(key, title) => onRowAction(item.id, key, title)}
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
              ListHeaderComponent={
                listError ? (
                  <AppText variant="caption" style={styles.listError} accessibilityRole="alert">
                    {listError}
                  </AppText>
                ) : null
              }
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
                        label: exporting ? 'Export en cours…' : 'Exporter mes conversations',
                        onPress: () => void exportAll(),
                        inlineAction: true,
                      },
                    ]}
                  />
                  {exportError ? (
                    <AppText variant="caption" style={styles.exportError} accessibilityRole="alert">
                      {exportError}
                    </AppText>
                  ) : null}
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
    exportError: { color: c.error, paddingHorizontal: spacing[3], paddingTop: spacing[2] },
    listError: { color: c.error, paddingHorizontal: spacing[3], paddingBottom: spacing[2] },
  };
}
