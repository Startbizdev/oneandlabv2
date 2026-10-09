import { parseMessageBlocks } from '../components/CaryMarkdown';
import { assistantMessageDisplayText, stripCitationRefs, userMessageDisplayText } from '../utils/ai-message-display';
import { resolveAssistantMessageText } from '../utils/resolve-assistant-message-text';
import { stripDisclaimerFromAssistantText } from '../utils/strip-disclaimer-from-text';

const FALLBACK = "Je n'ai pas bien compris. Pouvez-vous reformuler ?";

describe('stripDisclaimerFromAssistantText', () => {
  it('keeps paragraphs and bullet lists intact', () => {
    const text = 'Voici vos consignes.\n\n- Venir à jeun\n- Apporter l’ordonnance\n\nÀ bientôt.';
    expect(stripDisclaimerFromAssistantText(text)).toBe(text);
  });

  it('removes the repeated disclaimer without collapsing the layout', () => {
    const disclaimer = 'Cary est un assistant informatif. Il ne remplace pas un avis médical.';
    const text = `Premier point.\n\n- Jeûne de 12 h\n- Eau autorisée\n\n${disclaimer}`;
    expect(stripDisclaimerFromAssistantText(text, disclaimer)).toBe('Premier point.\n\n- Jeûne de 12 h\n- Eau autorisée');
  });

  it('drops orphan bullets and extra blank lines left by a removal', () => {
    const text = 'Réponse.\n\n- \n\n\n\nSuite (booking_step=2).';
    expect(stripDisclaimerFromAssistantText(text)).toBe('Réponse.\n\nSuite .');
  });

  it('removes internal keys', () => {
    expect(stripDisclaimerFromAssistantText('Bien noté (patient_mode=self).')).toBe('Bien noté .');
  });

  it('returns an empty string for an empty message', () => {
    expect(stripDisclaimerFromAssistantText('   ')).toBe('');
  });

  it('never removes an emergency instruction from the answer', () => {
    const disclaimer = 'Cary est un assistant informatif. Il ne remplace pas un avis médical.';
    for (const text of [
      'En cas de douleur thoracique, appelez le 15.',
      "En cas d'urgence, appelez le 15 ou le 112.",
      'Composez le 3114 si vous avez des idées suicidaires.',
      'Contactez le SAMU sans attendre.',
      'Rappel : en cas de malaise, appelez le 112.',
      'Si la douleur augmente, allez aux urgences.',
    ]) {
      expect(stripDisclaimerFromAssistantText(text)).toBe(text);
      expect(stripDisclaimerFromAssistantText(text, disclaimer)).toBe(text);
    }
  });

  it('keeps the emergency part of a disclaimer repeated by the model', () => {
    const disclaimer = "Cary est un assistant informatif. En cas d'urgence, appelez le 15.";
    const out = stripDisclaimerFromAssistantText(`Le jeûne dure 12 h.\n\n${disclaimer}`, disclaimer);
    expect(out).toContain('Le jeûne dure 12 h.');
    expect(out).toContain("En cas d'urgence, appelez le 15.");
    expect(out).not.toContain('assistant informatif');
  });

  it('still removes repeated non-urgent warnings', () => {
    expect(stripDisclaimerFromAssistantText('Venez à jeun.\n\nRappel : pensez à boire de l’eau.')).toBe('Venez à jeun.');
    expect(stripDisclaimerFromAssistantText('Venez à jeun. Il ne remplace pas un avis médical.')).toBe('Venez à jeun.');
  });
});

describe('resolveAssistantMessageText', () => {
  it('falls back to a rephrase prompt when nothing came back', () => {
    expect(resolveAssistantMessageText('', '')).toBe(FALLBACK);
  });

  it('prefers the cleaned server content over the raw stream', () => {
    expect(resolveAssistantMessageText('Réponse propre', '```booking_patch\n{"category_id":"x"}\n```')).toBe(
      'Réponse propre',
    );
  });

  it('never shows booking blocks from the stream', () => {
    const text = resolveAssistantMessageText(null, 'Je prépare.\n```booking_patch\n{"category_id":"x"}\n```');
    expect(text).toBe('Je prépare.');
    expect(text).not.toContain('category_id');
  });

  it('splits a long single block into readable paragraphs', () => {
    const long = `${'Phrase descriptive assez longue pour le test. '.repeat(4)}Dernière phrase.`;
    expect(resolveAssistantMessageText('', long)).toContain('\n\n');
  });
});

describe('message display text', () => {
  it('removes raw citations but keeps punctuation and paragraphs', () => {
    expect(stripCitationRefs('Votre bilan est prêt [ref:doc:abc:0].\n\n- Glycémie [ref:doc:abc:1] normale')).toBe(
      'Votre bilan est prêt.\n\n- Glycémie normale',
    );
  });

  it('hides a citation that is still being streamed', () => {
    expect(stripCitationRefs('Votre bilan [ref:doc:ab')).toBe('Votre bilan');
    expect(stripCitationRefs('Votre bilan [re')).toBe('Votre bilan');
  });

  it('cleans the assistant text for display and copy', () => {
    const disclaimer = 'Cary est un assistant informatif.';
    expect(assistantMessageDisplayText(`Résultat normal [ref:doc:1:0].\n\n${disclaimer}`, disclaimer)).toBe(
      'Résultat normal.',
    );
  });

  it('removes the server attachment annotations from user messages', () => {
    expect(userMessageDisplayText('Que dit ce document ?\n\n[Document(s) joint(s) dans ce message : bilan.pdf]')).toBe(
      'Que dit ce document ?',
    );
    expect(
      userMessageDisplayText('Et le cholestérol ?\n\n[Question sur le document déjà analysé dans cette conversation : bilan.pdf]'),
    ).toBe('Et le cholestérol ?');
  });
});

describe('parseMessageBlocks (CaryMarkdown)', () => {
  it('splits headings, bullet lists, numbered lists and paragraphs', () => {
    const text = 'À retenir :\n\n- Venir à jeun\n- Apporter la carte Vitale\n\n1. Prise de sang\n2. Résultats\n\nBonne journée.';
    expect(parseMessageBlocks(text)).toEqual([
      { type: 'heading', text: 'À retenir' },
      { type: 'list', items: ['Venir à jeun', 'Apporter la carte Vitale'] },
      { type: 'list', items: ['Prise de sang', 'Résultats'] },
      { type: 'paragraph', lines: ['Bonne journée.'] },
    ]);
  });

  it('renders a list introduced on the previous line as a real list', () => {
    expect(parseMessageBlocks('Voici vos consignes :\n- Venir à jeun\n- Boire de l’eau\nMerci.')).toEqual([
      { type: 'heading', text: 'Voici vos consignes' },
      { type: 'list', items: ['Venir à jeun', 'Boire de l’eau'] },
      { type: 'paragraph', lines: ['Merci.'] },
    ]);
  });

  it('keeps a list separated from its paragraph by a blank line', () => {
    expect(parseMessageBlocks('Avant le prélèvement, pensez à ceci.\n\n- Être à jeun\n- Apporter l’ordonnance')).toEqual([
      { type: 'paragraph', lines: ['Avant le prélèvement, pensez à ceci.'] },
      { type: 'list', items: ['Être à jeun', 'Apporter l’ordonnance'] },
    ]);
  });

  it('removes markdown bold markers and heading hashes', () => {
    expect(parseMessageBlocks('## Bilan\n\n**Important** : à jeun.')).toEqual([
      { type: 'paragraph', lines: ['Bilan'] },
      { type: 'paragraph', lines: ['Important : à jeun.'] },
    ]);
  });

  it('returns no block for empty text', () => {
    expect(parseMessageBlocks('  ')).toEqual([]);
  });
});
