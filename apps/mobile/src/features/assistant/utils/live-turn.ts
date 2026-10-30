import type { AssistantAction, AssistantEmergency } from '@oneandlab/shared-types';
import { createStore } from 'zustand/vanilla';

/** Message en cours d'envoi et réponse de Cary qui arrive en direct. */
export type LiveTurn = {
  phase: 'idle' | 'streaming' | 'error';
  /** Rejoué à l'identique par « Réessayer » : le serveur ne crée pas de seconde réponse. */
  clientMessageId: string;
  userText: string;
  documentId?: string;
  /** Nom du fichier joint, affiché sous la question. */
  documentName?: string;
  text: string;
  /** Outil en cours (« Je consulte vos rendez-vous… »), effacé au premier mot suivant. */
  status: string | null;
  actions: AssistantAction[];
  emergency: AssistantEmergency | null;
  error: { message: string; retryable: boolean } | null;
};

export type LiveTurnEvent =
  | { type: 'send'; clientMessageId: string; userText: string; documentId?: string; documentName?: string }
  | { type: 'retry' }
  | { type: 'status'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'action'; action: AssistantAction }
  | { type: 'emergency'; emergency: AssistantEmergency }
  | { type: 'error'; message: string; retryable: boolean }
  | { type: 'reset' };

export const IDLE_TURN: LiveTurn = {
  phase: 'idle',
  clientMessageId: '',
  userText: '',
  text: '',
  status: null,
  actions: [],
  emergency: null,
  error: null,
};

const EMPTY_REPLY: Pick<LiveTurn, 'text' | 'status' | 'actions' | 'emergency' | 'error'> = {
  text: '',
  status: null,
  actions: [],
  emergency: null,
  error: null,
};

export function liveTurnReducer(state: LiveTurn, event: LiveTurnEvent): LiveTurn {
  switch (event.type) {
    case 'send':
      return {
        ...IDLE_TURN,
        phase: 'streaming',
        clientMessageId: event.clientMessageId,
        userText: event.userText,
        documentId: event.documentId,
        documentName: event.documentName,
      };
    case 'retry':
      return state.phase === 'error' ? { ...state, ...EMPTY_REPLY, phase: 'streaming' } : state;
    case 'status':
      return state.phase === 'streaming' ? { ...state, status: event.text || null } : state;
    case 'delta':
      return state.phase === 'streaming' ? { ...state, text: state.text + event.text, status: null } : state;
    case 'action':
      return state.phase === 'streaming' ? { ...state, actions: [...state.actions, event.action] } : state;
    case 'emergency':
      return state.phase === 'streaming' ? { ...state, emergency: event.emergency, status: null } : state;
    case 'error':
      return state.phase === 'streaming'
        ? { ...state, phase: 'error', status: null, error: { message: event.message, retryable: event.retryable } }
        : state;
    case 'reset':
      return IDLE_TURN;
  }
}

/** Store du tour en cours : seule la bulle en direct s'y abonne, la liste ne se re-rend pas à chaque mot. */
export function createLiveTurnStore() {
  const store = createStore<LiveTurn>(() => IDLE_TURN);
  const dispatch = (event: LiveTurnEvent) => store.setState(liveTurnReducer(store.getState(), event), true);
  return { store, dispatch };
}

export type LiveTurnStore = ReturnType<typeof createLiveTurnStore>;
