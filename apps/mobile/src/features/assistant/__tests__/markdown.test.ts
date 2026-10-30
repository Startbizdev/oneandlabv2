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

describe('tableaux', () => {
  it('en-tête, lignes, séparateur ignoré ; une ligne vide referme le tableau', () => {
    const blocks = parseMarkdown('| Passage | Cotation | Montant |\n|---|---|---:|\n| 7 h | AMI 1 + IFD | 5,90 € |\n| 12 h | AMI 1 + IFD + MAU | 7,25 € |\n\nTotal : 13,15 €');
    expect(blocks).toEqual([
      {
        type: 'table',
        header: ['Passage', 'Cotation', 'Montant'],
        rows: [
          ['7 h', 'AMI 1 + IFD', '5,90 €'],
          ['12 h', 'AMI 1 + IFD + MAU', '7,25 €'],
        ],
      },
      { type: 'paragraph', text: 'Total : 13,15 €' },
    ]);
  });
});
