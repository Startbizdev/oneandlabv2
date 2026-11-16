import { describe, expect, it } from 'vitest';
import { formatBellNotificationLines as sharedFormat } from '@oneandlab/shared-utils';
import { formatBellNotificationLines as webFormat } from '../../utils/notification-display';

const LONG = `${'Les fêtes approchent : faites le point sur votre santé. '.repeat(9)}Pris en charge à 100 %.`;

describe('notification au texte coupé (« Voir plus »)', () => {
  for (const [name, format] of [['shared-utils', sharedFormat], ['web', webFormat]] as const) {
    it(`${name} : renvoie le texte entier quand il est coupé`, () => {
      const lines = format('Avant les fêtes', LONG);
      expect(lines.message?.endsWith('…')).toBe(true);
      expect(lines.fullMessage).toBe(LONG);
      expect(lines.fullMessage?.endsWith('Pris en charge à 100 %.')).toBe(true);
    });

    it(`${name} : pas de texte entier en double quand rien n'est coupé`, () => {
      const lines = format('Commande annulée', 'Le demandeur a annulé la commande.');
      expect(lines.message).toBe('Le demandeur a annulé la commande.');
      expect(lines.fullMessage).toBeUndefined();
    });
  }
});
