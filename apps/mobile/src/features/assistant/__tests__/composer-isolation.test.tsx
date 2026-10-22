import type { AssistantMessage } from '@oneandlab/shared-types';
import type { ReactElement } from 'react';
import renderer, { act } from 'react-test-renderer';
import { AssistantComposer } from '../components/AssistantComposer';
import { MessageList } from '../components/MessageList';
import { createLiveTurnStore } from '../utils/live-turn';
import { IDLE_VOICE } from '../utils/voice-controller';

let markdownRenders = 0;

jest.mock('../components/AssistantMarkdown', () => ({
  AssistantMarkdown: ({ text }: { text: string }) => {
    markdownRenders += 1;
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    const { createElement } = jest.requireActual<typeof import('react')>('react');
    return createElement(Text, null, text);
  },
}));

// Liste sans virtualisation : chaque ligne est rendue telle quelle.
jest.mock('@shopify/flash-list', () => {
  const { createElement, Fragment } = jest.requireActual<typeof import('react')>('react');
  return {
    FlashList: ({ data, renderItem }: { data: unknown[]; renderItem: (info: { item: unknown; index: number }) => ReactElement }) =>
      createElement(Fragment, null, ...data.map((item, index) => createElement(Fragment, { key: index }, renderItem({ item, index })))),
  };
});

jest.mock('react-native-keyboard-controller', () => ({
  useReanimatedKeyboardAnimation: () => ({ height: { value: 0 }, progress: { value: 0 } }),
}));

jest.mock('@/navigation/use-scene-bottom-inset', () => ({
  useSceneBottomInset: () => ({ safeAreaBottom: 0, footerPadding: 8, tabBarHeight: 0 }),
}));

const messages: AssistantMessage[] = [
  { id: 'u1', role: 'user', text: 'Bonjour', actions: [], created_at: '2026-10-22T10:00:00Z' },
  { id: 'a1', role: 'assistant', text: 'Bonjour, que puis-je faire ?', actions: [], created_at: '2026-10-22T10:00:01Z' },
  { id: 'u2', role: 'user', text: 'Mon RDV', actions: [], created_at: '2026-10-22T10:01:00Z' },
  { id: 'a2', role: 'assistant', text: 'Demain à 8 h.', actions: [], created_at: '2026-10-22T10:01:01Z' },
];

const noop = () => undefined;
const live = createLiveTurnStore();

function Screen() {
  return (
    <>
      <MessageList
        messages={messages}
        showLive={false}
        live={live}
        role="patient"
        onAction={noop}
        onRetry={noop}
        onCopy={noop}
      />
      <AssistantComposer
        onSend={() => true}
        onStop={noop}
        streaming={false}
        voice={IDLE_VOICE}
        onMicPress={noop}
        onExitVoice={noop}
        attachment={null}
        onClearAttachment={noop}
      />
    </>
  );
}

describe('saisie isolée du fil', () => {
  it('taper dans le champ ne re-rend aucun message', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<Screen />);
    });
    const root = tree?.root;
    if (!root) throw new Error('Rendu impossible');
    expect(markdownRenders).toBe(2);
    const input = root.find((node) => node.props.accessibilityLabel === 'Message pour Cary' && node.props.onChangeText);
    for (const text of ['Q', 'Qu', 'Que', 'Quel', 'Quel est']) {
      await act(async () => {
        input.props.onChangeText(text);
      });
    }
    expect(markdownRenders).toBe(2);
    // Le champ non vide propose l'envoi à la place du micro.
    expect(root.findAll((node) => node.props.accessibilityLabel === 'Envoyer le message').length).toBeGreaterThan(0);
    act(() => tree?.unmount());
  });

  it('chaque réponse se copie ; aucune action « Régénérer » (la question serait dupliquée)', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(<Screen />);
    });
    const root = tree?.root;
    if (!root) throw new Error('Rendu impossible');
    const byLabel = (label: RegExp) =>
      root.findAll((node) => typeof node.props.accessibilityLabel === 'string' && label.test(node.props.accessibilityLabel) && node.props.onPress);
    expect(byLabel(/^Copier la réponse$/).length).toBeGreaterThanOrEqual(2);
    expect(byLabel(/régénérer/i)).toHaveLength(0);
    act(() => tree?.unmount());
  });
});
