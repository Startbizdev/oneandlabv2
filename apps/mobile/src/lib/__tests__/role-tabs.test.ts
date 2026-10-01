import { existsSync } from 'fs';
import { join } from 'path';
import { ROLE_TABS, visibleRoleTabs, type TabRole } from '../../navigation/role-tabs';

const APP_DIR = join(__dirname, '../../../app');
const ROLES = Object.keys(ROLE_TABS) as TabRole[];

describe('role tabs', () => {
  it.each(ROLES)('chaque onglet %s pointe vers une route existante', (role) => {
    for (const tab of ROLE_TABS[role]) {
      expect(existsSync(join(APP_DIR, `(${role})`, '(tabs)', `${tab.name}.tsx`))).toBe(true);
    }
  });

  it('garde les onglets attendus par rôle, dans l’ordre', () => {
    expect(ROLE_TABS.patient.map((t) => t.name)).toEqual(['appointments', 'results', 'book', 'ai', 'more']);
    expect(ROLE_TABS.nurse.map((t) => t.name)).toEqual(['tournee', 'demandes', 'appointments', 'patients', 'more']);
    expect(ROLE_TABS.pro.map((t) => t.name)).toEqual(['appointments', 'patients', 'calendar', 'prescriptions', 'more']);
    expect(ROLE_TABS.preleveur.map((t) => t.name)).toEqual(['index', 'patients', 'tournee', 'calendar', 'more']);
  });

  it('masque un onglet conditionnel tant que le layout ne l’autorise pas', () => {
    const names = (visible?: Partial<Record<string, boolean>>) =>
      visibleRoleTabs(ROLE_TABS.pro, visible).map((t) => t.name);

    expect(names()).not.toContain('prescriptions');
    expect(names({ prescriptions: false })).not.toContain('prescriptions');
    expect(names({ prescriptions: true })).toEqual(ROLE_TABS.pro.map((t) => t.name));
  });

  it('n’affiche un badge que sur les Demandes infirmier', () => {
    const badged = ROLES.flatMap((role) =>
      ROLE_TABS[role].filter((t) => t.hasBadge).map((t) => `${role}/${t.name}`),
    );
    expect(badged).toEqual(['nurse/demandes']);
  });
});
