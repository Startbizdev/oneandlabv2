import type { MobileRole } from '@oneandlab/shared-constants';
import type { AiChatResponse, AiConversation, AiMessage } from '@oneandlab/shared-types';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { useCaryAiHub } from '../hooks/use-cary-ai-hub';
import type { AiConversationContext } from '../utils/ai-conversation-context';

/** Banc d'essai de `useCaryAiHub` partagé par les tests du hub (les `jest.mock` restent dans chaque test). */
type Hub = ReturnType<typeof useCaryAiHub>;
let current: Hub | null = null;
let mounted: ReactTestRenderer | null = null;

export function Harness({ context, role = 'patient' }: { context: AiConversationContext; role?: MobileRole }) {
  current = useCaryAiHub({ role, context });
  return null;
}

export function hub(): Hub {
  if (!current) throw new Error('Hook non monté');
  return current;
}

export function conversation(id: string): AiConversation {
  return { id, user_id: 'u1', conversation_type: 'appointment', created_at: '2026-10-01T10:00:00Z' };
}

export function welcome(conversationId: string): AiMessage {
  return { id: `welcome-${conversationId}`, conversation_id: conversationId, role: 'assistant', content: 'Bonjour' };
}

export function reply(conversationId: string, content: string): AiChatResponse {
  return {
    message: { id: `reply-${content}`, conversation_id: conversationId, role: 'assistant', content },
    disclaimer: 'IA',
  };
}

export async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export async function mount(context: AiConversationContext, role: MobileRole = 'patient'): Promise<ReactTestRenderer> {
  let tree: ReactTestRenderer | undefined;
  await act(async () => {
    tree = renderer.create(<Harness context={context} role={role} />);
  });
  await flush();
  if (!tree) throw new Error('Rendu impossible');
  mounted = tree;
  return tree;
}

export function unmountHub() {
  act(() => mounted?.unmount());
  mounted = null;
  current = null;
}

export function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
