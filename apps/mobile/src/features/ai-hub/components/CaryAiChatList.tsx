import { useAppColors } from '@/theme/use-app-colors';
import { FlashList, type FlashListProps, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { forwardRef, useCallback, type ReactElement } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import { spacing, useStyles } from '@/theme';

type ScrollProps = Pick<
  FlashListProps<PatientAiChatMessage>,
  'onScroll' | 'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollBegin' | 'onMomentumScrollEnd' | 'onLayout'
>;

export type CaryAiChatListProps = ScrollProps & {
  messages: PatientAiChatMessage[];
  contentContainerStyle: StyleProp<ViewStyle>;
  renderMessage: (item: PatientAiChatMessage, index: number) => ReactElement;
  listHeader?: ReactElement | null;
  listFooter?: ReactElement | null;
  extraData?: string;
  onContentSizeChange?: (width: number, height: number) => void;
  /** Haut du fil atteint : charger les messages plus anciens. */
  onStartReached?: () => void;
};

function ListSeparator({ styles }: { styles: ReturnType<typeof buildStyles> }) {
  return <View style={styles.messageGap} />;
}

/** Fil Cary chronologique (FlashList, non inversée) ; la position est conservée quand l'historique s'allonge en haut. */
export const CaryAiChatList = forwardRef<FlashListRef<PatientAiChatMessage>, CaryAiChatListProps>(
  function CaryAiChatList(
    { messages, contentContainerStyle, renderMessage, listHeader, listFooter, extraData, onStartReached, ...scrollProps },
    ref,
  ) {
    const c = useAppColors();
    const styles = useStyles(buildStyles);

    const renderItem: ListRenderItem<PatientAiChatMessage> = useCallback(
      ({ item, index }) => renderMessage(item, index),
      [renderMessage],
    );

    return (
      <FlashList
        ref={ref}
        data={messages}
        style={{ ...styles.list, backgroundColor: c.background }}
        contentContainerStyle={contentContainerStyle}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        drawDistance={320}
        extraData={extraData}
        ItemSeparatorComponent={() => <ListSeparator styles={styles} />}
        ListHeaderComponent={listHeader ?? undefined}
        ListFooterComponent={listFooter ?? undefined}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onStartReached={onStartReached}
        onStartReachedThreshold={0.2}
        maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
        scrollEventThrottle={64}
        {...scrollProps}
      />
    );
  },
);

function buildStyles() {
  return {
    list: { minWidth: 0, flex: 1 },
    messageGap: { height: spacing[2.5] },
  };
}
