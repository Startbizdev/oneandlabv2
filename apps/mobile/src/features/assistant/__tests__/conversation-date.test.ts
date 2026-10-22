import { conversationDateLabel } from '../utils/conversation-date';

const NOW = new Date(2026, 9, 22, 14, 0);

describe('conversationDateLabel', () => {
  it('aujourd’hui et hier : heure seulement', () => {
    expect(conversationDateLabel(new Date(2026, 9, 22, 8, 45).toISOString(), NOW)).toBe('Aujourd’hui, 08:45');
    expect(conversationDateLabel(new Date(2026, 9, 21, 18, 2).toISOString(), NOW)).toBe('Hier, 18:02');
  });

  it('cette année : jour et mois ; avant : avec l’année', () => {
    expect(conversationDateLabel(new Date(2026, 9, 12, 9, 0).toISOString(), NOW)).toBe('12 oct.');
    expect(conversationDateLabel(new Date(2025, 11, 3, 9, 0).toISOString(), NOW)).toBe('3 déc. 2025');
  });
});
