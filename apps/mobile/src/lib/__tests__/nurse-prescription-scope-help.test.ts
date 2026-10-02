import { shouldShowNursePrescriptionScopeHelp } from '@oneandlab/shared-utils';

describe('aide « Que puis-je prescrire en tant qu’infirmier ? »', () => {
  it('s’affiche pour un infirmier sur une prescription d’actes infirmiers', () => {
    expect(shouldShowNursePrescriptionScopeHelp({ role: 'nurse' }, 'nursing')).toBe(true);
  });

  it('s’affiche pour un pro inscrit comme infirmier IPA', () => {
    expect(shouldShowNursePrescriptionScopeHelp({ role: 'pro', emploi: 'Infirmier IPA' }, 'nursing')).toBe(true);
  });

  it('ne s’affiche pas pour un médecin ni un pro sans profession', () => {
    expect(shouldShowNursePrescriptionScopeHelp({ role: 'pro', emploi: 'Médecin généraliste' }, 'nursing')).toBe(false);
    expect(shouldShowNursePrescriptionScopeHelp({ role: 'pro', emploi: null }, 'nursing')).toBe(false);
  });

  it('ne s’affiche pas hors prescription d’actes infirmiers ni sans utilisateur', () => {
    expect(shouldShowNursePrescriptionScopeHelp({ role: 'nurse' }, 'medical')).toBe(false);
    expect(shouldShowNursePrescriptionScopeHelp(null, 'nursing')).toBe(false);
  });
});
