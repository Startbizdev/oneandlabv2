import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MoreHorizontal, Pin } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  type Theme,
  ICON_STROKE_WIDTH,
} from '@/theme';
import type { PatientAiConversation } from '../types/patient-ai-conversation';
import { buildConversationRowActions, type ConversationRowActionKey } from '../utils/conversation-row-actions';

type Mode = 'menu' | 'rename' | 'confirm-delete';

interface Props {
  conversation: PatientAiConversation;
  active: boolean;
  archived: boolean;
  /** Menu d'actions déplié sous la ligne (une seule ligne à la fois). */
  expanded: boolean;
  onPress: () => void;
  onToggleMenu: () => void;
  /** Message d'erreur à afficher, ou `null` si l'action a abouti (le menu se referme). */
  onAction: (key: ConversationRowActionKey, title?: string) => Promise<string | null>;
}

/** Conversation de l'historique ; « … » ou appui long déplie ses actions, sur iOS comme sur Android. */
export function PatientAiConversationRow({ conversation, active, archived, expanded, onPress, onToggleMenu, onAction }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [mode, setMode] = useState<Mode>('menu');
  const [title, setTitle] = useState(conversation.title);
  const [pending, setPending] = useState<ConversationRowActionKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actions = buildConversationRowActions({ isSystem: conversation.isSystem, isPinned: conversation.isPinned, archived });

  useEffect(() => {
    if (expanded) return;
    setMode('menu');
    setError(null);
    setTitle(conversation.title);
  }, [conversation.title, expanded]);

  const run = async (key: ConversationRowActionKey, newTitle?: string) => {
    setPending(key);
    setError(null);
    const failure = await onAction(key, newTitle);
    setPending(null);
    if (failure) setError(failure);
    else onToggleMenu();
  };

  const openMenu = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleMenu();
  };

  const pick = (key: ConversationRowActionKey) => {
    if (key === 'rename') setMode('rename');
    else if (key === 'delete') setMode('confirm-delete');
    else void run(key);
  };

  return (
    <View style={[styles.wrap, (active || expanded) && styles.wrapActive]}>
      <View style={styles.row}>
        <Pressable
          onPress={onPress}
          onLongPress={openMenu}
          delayLongPress={420}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={conversation.isPinned ? `${conversation.title}, épinglée` : conversation.title}
          accessibilityState={{ selected: active }}
        >
          <AppText variant="body" style={[styles.title, active && styles.titleActive]}>
            {conversation.title}
          </AppText>
          {conversation.isPinned ? (
            <Pin size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
          ) : null}
        </Pressable>
        <Pressable
          onPress={openMenu}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Actions pour ${conversation.title}`}
          accessibilityState={{ expanded }}
        >
          <MoreHorizontal size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      </View>

      {expanded && mode === 'menu' ? (
        <View style={styles.menu}>
          {actions.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => pick(item.key)}
              disabled={pending !== null}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <AppText variant="body" style={item.destructive ? styles.destructive : undefined}>
                {pending === item.key ? `${item.label}…` : item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {expanded && mode === 'rename' ? (
        <View style={styles.panel}>
          <Input
            value={title}
            onChangeText={setTitle}
            autoFocus
            maxLength={120}
            returnKeyType="done"
            onSubmitEditing={() => void run('rename', title)}
            accessibilityLabel="Nouveau titre"
          />
          <Row gap={spacing[2]} justify="end">
            <Button title="Annuler" variant="ghost" size="sm" onPress={() => setMode('menu')} />
            <Button
              title="Enregistrer"
              size="sm"
              onPress={() => void run('rename', title)}
              disabled={!title.trim()}
              loading={pending === 'rename'}
            />
          </Row>
        </View>
      ) : null}

      {expanded && mode === 'confirm-delete' ? (
        <View style={styles.panel}>
          <AppText variant="body">Supprimer définitivement cette conversation ?</AppText>
          <AppText variant="caption">Messages et échanges vocaux seront effacés. Vos documents restent dans votre dossier.</AppText>
          <Row gap={spacing[2]} justify="end">
            <Button title="Annuler" variant="ghost" size="sm" onPress={() => setMode('menu')} />
            <Button
              title="Supprimer"
              variant="destructive"
              size="sm"
              onPress={() => void run('delete')}
              loading={pending === 'delete'}
            />
          </Row>
        </View>
      ) : null}

      {expanded && error ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: { minWidth: 0, borderRadius: radius.md, marginBottom: spacing[0.5] },
    wrapActive: { backgroundColor: c.surfaceAlt },
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, minWidth: 0 },
    main: {
      flex: 1,
      minWidth: 0,
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingVertical: spacing[2.5],
      paddingLeft: spacing[3],
      borderRadius: radius.md,
    },
    pressed: { opacity: 0.6 },
    title: { flex: 1, minWidth: 0 },
    titleActive: { ...font.medium },
    more: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: radius.full,
    },
    menu: { paddingBottom: spacing[1] },
    menuItem: {
      minHeight: MIN_TOUCH_TARGET,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing[4],
    },
    destructive: { color: c.error },
    panel: { gap: spacing[2], paddingHorizontal: spacing[3], paddingBottom: spacing[3] },
    error: { color: c.error, paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  };
}
