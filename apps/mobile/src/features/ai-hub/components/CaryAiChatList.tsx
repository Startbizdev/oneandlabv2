import { useAppColors } from '@/theme/use-app-colors';
import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { forwardRef, useCallback, type ReactElement } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { PatientAiChatMessage } from '../types/patient-ai-conversation';
import { spacing, useStyles, type Theme } from '@/theme';

const ESTIMATED_ITEM_SIZE = 112;

export type CaryAiChatListProps = {
  messages: PatientAiChatMessage[];
  contentContainerStyle: StyleProp<ViewStyle>;
  renderMessage: (item: PatientAiChatMessage) => ReactElement;
  listHeader?: ReactElement | null;
  listFooter?: ReactElement | null;
  extraData?: string;
  onContentSizeChange?: (width: number, height: number) => void;
};

function ListSeparator({ styles }: { styles: ReturnType<typeof buildStyles> }) {
  return <View style={styles.messageGap} />;
}

/** Liste chronologique Cary IA — FlashList + scroll bas (sans inversion). */
export const CaryAiChatList = forwardRef<FlashListRef<PatientAiChatMessage>, CaryAiChatListProps>(
  function CaryAiChatList(
    { messages, contentContainerStyle, renderMessage, listHeader, listFooter, extraData, onContentSizeChange },
    ref,
  ) {
    const c = useAppColors();
    const styles = useStyles(buildStyles);

    const renderItem: ListRenderItem<PatientAiChatMessage> = useCallback(
      ({ item }) => renderMessage(item),
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
        onContentSizeChange={onContentSizeChange}
      />
    );
  },
);

function buildStyles({ colors: c }: Theme) {
  return {
    list: { minWidth: 0, flex: 1 },
    messageGap: { height: spacing[2.5] },
  };
}
