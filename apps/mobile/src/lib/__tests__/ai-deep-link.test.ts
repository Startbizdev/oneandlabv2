import { buildAiDeepLink } from '../../features/ai-hub/utils/ai-navigation';

describe('buildAiDeepLink', () => {
  it('targets the AI screen of each role', () => {
    expect(buildAiDeepLink('pro', {})).toEqual({ pathname: '/(pro)/ai', params: {} });
    expect(buildAiDeepLink('nurse', {})).toEqual({ pathname: '/(nurse)/ai', params: {} });
    expect(buildAiDeepLink('preleveur', {})).toEqual({ pathname: '/(preleveur)/ai', params: {} });
    expect(buildAiDeepLink('patient', {})).toEqual({ pathname: '/(patient)/(tabs)/ai', params: {} });
  });

  it('keeps only the provided context params', () => {
    expect(
      buildAiDeepLink('patient', {
        conversation_type: 'lab_results',
        lab_result_id: 'doc-1',
        patient_id: undefined,
        initial_message: 'Explique-moi ce résultat',
      }),
    ).toEqual({
      pathname: '/(patient)/(tabs)/ai',
      params: {
        conversation_type: 'lab_results',
        lab_result_id: 'doc-1',
        initial_message: 'Explique-moi ce résultat',
      },
    });
  });
});
