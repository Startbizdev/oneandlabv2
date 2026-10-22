import type { AssistantConversationSummary } from '@oneandlab/shared-types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { SheetModal } from '@/components/ui/SheetModal';
import { SkeletonList } from '@/components/ui/skeletons';
import { queryKeys } from '@/lib/query-keys';
import { AppText, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, font, iconSize, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { listConversations } from '../api/assistant.service';
import { conversationDateLabel } from '../utils/conversation-date';

type Props = {
  visible: boolean;
  onClose: () => void;
  onDismissed: () => void;
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (conversation: AssistantConversationSummary) => void;
};

/** Historique : ouvrir ou supprimer une conversation. */
export function HistorySheet({ visible, onClose, onDismissed, activeId, onOpen, onDelete }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const q = useInfiniteQuery({
    queryKey: queryKeys.assistant.conversations,
    queryFn: ({ pageParam }) => listConversations(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
    enabled: visible,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <SheetModal visible={visible} onClose={onClose} onDismissed={onDismissed} title="Conversations" snapPoints={['92%']}>
      {q.isLoading ? (
        <SkeletonList count={5} itemHeight={56} gap={spacing[2]} />
      ) : q.isError && items.length === 0 ? (
        <ErrorState title="Historique indisponible" error={q.error} onRetry={() => void q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState illustration="messages" title="Aucune conversation" description="Vos échanges avec Cary apparaîtront ici." />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Pressable
                onPress={() => onOpen(item.id)}
                style={({ pressed }) => [styles.body, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === activeId }}
              >
                <AppText variant="body" style={[styles.title, item.id === activeId && { color: c.primaryDark }]}>
                  {item.title || 'Conversation'}
                </AppText>
                {item.last_message_preview ? (
                  <AppText variant="caption" numberOfLines={1}>
                    {item.last_message_preview}
                  </AppText>
                ) : null}
                <AppText variant="caption" style={styles.date}>
                  {conversationDateLabel(item.updated_at)}
                </AppText>
              </Pressable>
              <IconActionButton label={`Supprimer « ${item.title || 'Conversation'} »`} onPress={() => onDelete(item)}>
                <Trash2 size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
              </IconActionButton>
            </View>
          ))}
          {q.hasNextPage ? (
            <Button
              title="Afficher plus"
              variant="ghost"
              loading={q.isFetchingNextPage}
              onPress={() => void q.fetchNextPage()}
            />
          ) : null}
        </View>
      )}
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    list: { gap: spacing[1] },
    row: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    body: { flex: 1, minWidth: 0, minHeight: MIN_TOUCH_TARGET, paddingVertical: spacing[3], gap: spacing[0.5] },
    title: { ...font.medium },
    date: { color: c.textTertiary },
    pressed: { opacity: 0.6 },
  };
}
