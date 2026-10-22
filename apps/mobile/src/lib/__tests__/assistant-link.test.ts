import { buildAssistantLink, parseContextType } from '@/features/assistant/utils/assistant-link';

describe('buildAssistantLink', () => {
  it("cible l'écran assistant de chaque rôle", () => {
    expect(buildAssistantLink('pro')).toEqual({ pathname: '/(pro)/ai', params: {} });
    expect(buildAssistantLink('nurse')).toEqual({ pathname: '/(nurse)/ai', params: {} });
    expect(buildAssistantLink('preleveur')).toEqual({ pathname: '/(preleveur)/ai', params: {} });
    expect(buildAssistantLink('patient')).toEqual({ pathname: '/(patient)/(tabs)/ai', params: {} });
  });

  it('ne garde que les paramètres renseignés', () => {
    expect(
      buildAssistantLink('patient', {
        context_type: 'lab_result',
        context_id: 'doc-1',
        patient_id: undefined,
        initial_message: 'Explique-moi ce résultat',
      }),
    ).toEqual({
      pathname: '/(patient)/(tabs)/ai',
      params: { context_type: 'lab_result', context_id: 'doc-1', initial_message: 'Explique-moi ce résultat' },
    });
  });

  it('ignore un type de contexte inconnu', () => {
    expect(parseContextType('appointment')).toBe('appointment');
    expect(parseContextType('lab_results')).toBeUndefined();
    expect(parseContextType(undefined)).toBeUndefined();
  });
});
