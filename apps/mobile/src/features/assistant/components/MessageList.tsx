import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantMessage } from '@oneandlab/shared-types';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { memo, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { H_PADDING, spacing, useStyles } from '@/theme';
import type { AssistantActionTarget } from '../utils/assistant-actions';
import type { LiveTurnStore } from '../utils/live-turn';
import { LiveTurnRow } from './LiveTurnRow';
import { MessageRow } from './MessageRow';

type Item = AssistantMessage | { id: 'live' };

type Props = {
  messages: AssistantMessage[];
  /** Tour en cours affiché en dernière ligne. */
  showLive: boolean;
  live: LiveTurnStore;
  role: MobileRole;
  patientId?: string;
  onAction: (target: AssistantActionTarget) => void;
  onRetry: () => void;
  onCopy: (text: string) => void;
};

const LIVE_ITEM = { id: 'live' } as const;

/** Fil chronologique ancré en bas ; la vue ne suit la réponse que si l'utilisateur est près du bas. */
export const MessageList = memo(function MessageList(props: Props) {
  const { messages, showLive, live, role, patientId, onAction, onRetry, onCopy } = props;
  const styles = useStyles(buildStyles);
  const data = useMemo<Item[]>(() => (showLive ? [...messages, LIVE_ITEM] : messages), [messages, showLive]);

  const renderItem: ListRenderItem<Item> = useCallback(
    ({ item }) =>
      'role' in item ? (
        <MessageRow message={item} role={role} patientId={patientId} onAction={onAction} onCopy={onCopy} />
      ) : (
        <LiveTurnRow live={live} role={role} patientId={patientId} onAction={onAction} onRetry={onRetry} />
      ),
    [live, onAction, onCopy, onRetry, patientId, role],
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(item) => item.id}
      getItemType={(item) => ('role' in item ? item.role : 'live')}
      renderItem={renderItem}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Separator}
      maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
    />
  );
});

function Separator() {
  const styles = useStyles(buildStyles);
  return <View style={styles.gap} />;
}

function buildStyles() {
  return {
    content: { paddingHorizontal: H_PADDING, paddingTop: spacing[4], paddingBottom: spacing[4] },
    gap: { height: spacing[5] },
  };
}
