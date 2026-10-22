import type { CareCategory } from '@/features/categories/api/categories.service';
import {
  buildCareFilterTabs,
  careFilterTabForCareType,
  catalogGroupLabel,
} from '../utils/booking-care-catalog';

describe('careFilterTabForCareType', () => {
  it('prise de sang → Prélèvements, soin infirmier → Soins, sinon Tous', () => {
    expect(careFilterTabForCareType('blood_test')).toBe('examens');
    expect(catalogGroupLabel('examens')).toBe('Prélèvements');
    expect(careFilterTabForCareType('nursing')).toBe('soins');
    expect(catalogGroupLabel('soins')).toBe('Soins');
    expect(careFilterTabForCareType(undefined)).toBe('all');
    expect(careFilterTabForCareType('radiologie')).toBe('all');
  });

  it('le filtre choisi existe dans les onglets dès que les deux types de soin sont proposés', () => {
    const categories = [
      { id: 'n', type: 'nursing', catalog_group: 'soins' },
      { id: 'b', type: 'blood_test' },
    ] as unknown as CareCategory[];
    const values = buildCareFilterTabs(categories).map((t) => t.value);
    expect(values).toContain(careFilterTabForCareType('blood_test'));
    expect(values).toContain(careFilterTabForCareType('nursing'));
  });
});
