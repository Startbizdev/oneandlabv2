import { describe, it, expect } from 'vitest';
import {
  brandLabStatus,
  filterBrandsByName,
  moveId,
  suggestLabsForBrand,
  type LabAccountOption,
} from '~/utils/lab-brand-admin';

const lab = (id: string, label: string, hasActiveZone = true, acceptsAppointments = true, email = ''): LabAccountOption => ({
  id,
  label,
  email,
  hasActiveZone,
  acceptsAppointments,
});

const labs = [
  lab('rotonde', 'Laboratoire LABIO', true, true, 'rotonde@labio.fr'),
  lab('avenues', 'Laboratoire Labio 5 Avenues', false),
  lab('closed', 'Labio Fermé', true, false),
  lab('aygalade', 'LABORATOIRE inovie AYGALADE'),
  lab('rose', 'Inovie Labosud Provence - La Rose', false),
];
const byId = new Map(labs.map(l => [l.id, l]));

describe('brandLabStatus', () => {
  it('sans labo, les RDV restent à l’administration', () => {
    expect(brandLabStatus([], byId)).toEqual({ tone: 'neutral', label: 'Aucun labo : RDV traités par l’administration', blocked: [] });
  });

  it('signale les labos rattachés qui ne recevront rien et pourquoi', () => {
    const status = brandLabStatus(['rotonde', 'avenues', 'closed', 'deleted'], byId);
    expect(status.tone).toBe('warning');
    expect(status.label).toBe('1 labo reçoit les RDV, 3 ne recevront rien');
    expect(status.blocked.map(b => b.reason)).toEqual([
      'aucune zone de prise de sang active',
      'n’accepte pas les rendez-vous',
      'compte labo inactif ou introuvable',
    ]);
  });

  it('prévient quand aucun labo rattaché ne peut recevoir', () => {
    expect(brandLabStatus(['avenues'], byId).label).toBe('Aucun labo ne peut recevoir : RDV traités par l’administration');
    expect(brandLabStatus(['rotonde', 'aygalade'], byId)).toMatchObject({ tone: 'success', label: '2 labos reçoivent les RDV' });
  });
});

describe('suggestLabsForBrand', () => {
  it('propose les comptes dont le nom ou l’email contient la marque, joignables d’abord, hors sélection', () => {
    expect(suggestLabsForBrand('Labio', labs, ['closed']).map(l => l.id)).toEqual(['rotonde', 'avenues']);
    expect(suggestLabsForBrand('Labo Sud', labs, []).map(l => l.id)).toEqual(['rose']);
  });

  it('ne propose rien pour un nom trop court', () => {
    expect(suggestLabsForBrand('La', labs, [])).toEqual([]);
  });
});

describe('filterBrandsByName et moveId', () => {
  it('filtre sans tenir compte des accents ni de la casse', () => {
    const brands = [{ name: 'Bioémeraude' }, { name: 'Biogroup' }, { name: 'Labio' }];
    expect(filterBrandsByName(brands, 'bioem').map(b => b.name)).toEqual(['Bioémeraude']);
    expect(filterBrandsByName(brands, '  ')).toHaveLength(3);
  });

  it('déplace une marque d’un cran sans sortir de la liste', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
});
