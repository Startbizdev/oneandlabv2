import { IDLE_TURN, createLiveTurnStore, liveTurnReducer, type LiveTurn } from '../utils/live-turn';

const sent = liveTurnReducer(IDLE_TURN, { type: 'send', clientMessageId: 'cm-1', userText: 'Bonjour', documentId: 'd1' });

function run(state: LiveTurn, ...events: Parameters<typeof liveTurnReducer>[1][]) {
  return events.reduce(liveTurnReducer, state);
}

describe('liveTurnReducer', () => {
  it('accumule les morceaux et efface le statut au premier mot', () => {
    const s = run(sent, { type: 'status', text: 'Je consulte vos rendez-vous…' });
    expect(s.status).toBe('Je consulte vos rendez-vous…');
    const t = run(s, { type: 'delta', text: 'Votre ' }, { type: 'delta', text: 'prochain RDV' });
    expect(t.text).toBe('Votre prochain RDV');
    expect(t.status).toBeNull();
  });

  it('ajoute les actions et l’urgence', () => {
    const action = { type: 'book_appointment', label: 'Prendre RDV', params: {} };
    const s = run(sent, { type: 'action', action }, { type: 'emergency', emergency: { message: 'Appelez', number: '15' } });
    expect(s.actions).toEqual([action]);
    expect(s.emergency).toEqual({ message: 'Appelez', number: '15' });
  });

  it('erreur puis nouvel essai : même client_message_id, réponse repartie de zéro', () => {
    const failed = run(sent, { type: 'delta', text: 'Début' }, { type: 'error', message: 'Coupé', retryable: true });
    expect(failed.phase).toBe('error');
    const retried = liveTurnReducer(failed, { type: 'retry' });
    expect(retried).toMatchObject({
      phase: 'streaming',
      clientMessageId: 'cm-1',
      userText: 'Bonjour',
      documentId: 'd1',
      text: '',
      error: null,
    });
  });

  it('fin ou arrêt : tour libéré, les morceaux tardifs sont ignorés', () => {
    const done = run(sent, { type: 'delta', text: 'Fini' }, { type: 'reset' });
    expect(done).toBe(IDLE_TURN);
    expect(liveTurnReducer(done, { type: 'delta', text: 'tard' })).toBe(IDLE_TURN);
    expect(liveTurnReducer(done, { type: 'retry' })).toBe(IDLE_TURN);
  });

  it('le store notifie ses abonnés', () => {
    const { store, dispatch } = createLiveTurnStore();
    const listener = jest.fn();
    store.subscribe(listener);
    dispatch({ type: 'send', clientMessageId: 'x', userText: 'Salut' });
    dispatch({ type: 'delta', text: 'A' });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getState().text).toBe('A');
  });
});
