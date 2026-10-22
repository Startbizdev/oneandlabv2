import { cleanForSpeech, createSentenceSplitter } from '../utils/sentence-splitter';

function feed(chunks: string[]) {
  const splitter = createSentenceSplitter();
  const out = chunks.flatMap((c) => splitter.push(c));
  const rest = splitter.flush();
  return rest ? [...out, rest] : out;
}

describe('createSentenceSplitter', () => {
  it('rend chaque phrase dès qu’elle est complète', () => {
    const splitter = createSentenceSplitter();
    expect(splitter.push('Bonjour. Votre ')).toEqual(['Bonjour.']);
    expect(splitter.push('rendez-vous est demain ! Pr')).toEqual(['Votre rendez-vous est demain !']);
    expect(splitter.push('êt ?')).toEqual([]);
    expect(splitter.flush()).toBe('Prêt ?');
  });

  it('ne coupe pas après une abréviation ni dans un nombre décimal', () => {
    expect(feed(['Le Dr. Martin passe à 8 h. Votre taux est de 12.5 mg/L. M. Dupont est prévenu.'])).toEqual([
      'Le Dr. Martin passe à 8 h.',
      'Votre taux est de 12.5 mg/L.',
      'M. Dupont est prévenu.',
    ]);
  });

  it('gère la ponctuation française, les points de suspension et les guillemets', () => {
    expect(feed(['Il a dit « à jeun. » Ensuite… on verra ? Oui', ' !'])).toEqual([
      'Il a dit « à jeun. »',
      'Ensuite…',
      'on verra ?',
      'Oui !',
    ]);
  });

  it('lit les listes ligne par ligne, sans puces ni markdown', () => {
    expect(feed(['Points :\n- **Jeûne** 12 h\n1. Apportez l’ordonnance\n'])).toEqual([
      'Points :',
      'Jeûne 12 h',
      'Apportez l’ordonnance',
    ]);
  });

  it('ignore les fragments sans mot', () => {
    expect(feed(['…\n\n', '---'])).toEqual([]);
    expect(cleanForSpeech('## Titre')).toBe('Titre');
  });
});
