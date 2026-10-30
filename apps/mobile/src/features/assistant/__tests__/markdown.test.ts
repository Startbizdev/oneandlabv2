import { parseMarkdown } from '../utils/markdown';

describe('parseMarkdown', () => {
  it('un retour à la ligne simple reste dans le paragraphe, une ligne vide en ouvre un autre', () => {
    expect(parseMarkdown('Votre TSH est normale.  \nTout est rassurant.\n\nParlez-en à votre médecin.')).toEqual([
      { type: 'paragraph', text: 'Votre TSH est normale. Tout est rassurant.' },
      { type: 'paragraph', text: 'Parlez-en à votre médecin.' },
    ]);
  });

  it('listes et titres restent séparés', () => {
    expect(parseMarkdown('Conseils :\n- Routine\n- Chambre fraîche\n## Suite')).toEqual([
      { type: 'paragraph', text: 'Conseils :' },
      { type: 'list', items: ['Routine', 'Chambre fraîche'] },
      { type: 'heading', text: 'Suite' },
    ]);
  });
});
