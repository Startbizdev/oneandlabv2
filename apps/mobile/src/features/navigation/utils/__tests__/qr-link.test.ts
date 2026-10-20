import { dispatchQrLinkTarget, parseQrRedirectUrl, pharmacyOrderWizardHref } from '../qr-link';

const PHARMACY_ID = '3f1c2a4e-9b7d-4c1e-8a2f-5d6e7f8a9b0c';
const HOME = '/(patient)/(tabs)/appointments' as const;

describe('parseQrRedirectUrl', () => {
  it('reconnaît une pharmacie et garde le jeton QR', () => {
    expect(parseQrRedirectUrl(`https://cary.bio/pharmacie/${PHARMACY_ID}?utm_qr=abc123`)).toEqual({
      kind: 'pharmacy',
      pharmacyId: PHARMACY_ID,
      utmQr: 'abc123',
    });
  });

  it('retombe sur le jeton scanné quand le lien ne porte pas utm_qr', () => {
    expect(parseQrRedirectUrl(`https://cary.bio/pharmacie/${PHARMACY_ID}/`, 'tok')).toEqual({
      kind: 'pharmacy',
      pharmacyId: PHARMACY_ID,
      utmQr: 'tok',
    });
  });

  it('lit la prise de RDV avec prestataire', () => {
    expect(
      parseQrRedirectUrl('https://cary.bio/rendez-vous/nouveau?provider_id=p-1&provider_type=lab&utm_qr=x%2By'),
    ).toEqual({ kind: 'booking', providerId: 'p-1', providerType: 'lab', utmQr: 'x+y' });
  });

  it('accepte un chemin relatif et ignore le fragment', () => {
    expect(parseQrRedirectUrl('/rendez-vous/nouveau#top')).toEqual({
      kind: 'booking',
      providerId: null,
      providerType: null,
      utmQr: null,
    });
  });

  it.each([null, '', 'https://cary.bio/', 'https://cary.bio/pharmacie/', 'https://cary.bio/autre/page'])(
    'classe %p comme inconnu',
    (url) => {
      expect(parseQrRedirectUrl(url)).toEqual({ kind: 'unknown' });
    },
  );
});

describe('pharmacyOrderWizardHref', () => {
  it('ouvre l’assistant du rôle avec la pharmacie et le jeton', () => {
    expect(pharmacyOrderWizardHref('nurse', PHARMACY_ID, 'tok')).toEqual({
      pathname: '/(nurse)/commandes-pharmacie/new',
      params: { pharmacy_id: PHARMACY_ID, utm_qr: 'tok' },
    });
    expect(pharmacyOrderWizardHref('patient', PHARMACY_ID, null)).toEqual({
      pathname: '/(patient)/traitements/new',
      params: { pharmacy_id: PHARMACY_ID },
    });
  });

  it('n’a pas d’assistant pour le préleveur', () => {
    expect(pharmacyOrderWizardHref('preleveur', PHARMACY_ID, 'tok')).toBeNull();
  });
});

describe('dispatchQrLinkTarget', () => {
  const pharmacy = { kind: 'pharmacy', pharmacyId: PHARMACY_ID, utmQr: 'tok' } as const;

  it('envoie le patient vers la commande pharmacie', () => {
    expect(dispatchQrLinkTarget(pharmacy, 'patient', HOME, true)).toEqual({
      href: { pathname: '/(patient)/traitements/new', params: { pharmacy_id: PHARMACY_ID, utm_qr: 'tok' } },
      message: null,
    });
  });

  it('renvoie à l’accueil avec un message sans droit de commande ou sans assistant', () => {
    const noRights = dispatchQrLinkTarget(pharmacy, 'pro', HOME, false);
    expect(noRights.href).toBe(HOME);
    expect(noRights.message).toMatch(/pharmacie/);
    expect(dispatchQrLinkTarget(pharmacy, 'preleveur', HOME, true).href).toBe(HOME);
  });

  it('ouvre la prise de RDV patient avec le prestataire au format du formulaire', () => {
    expect(
      dispatchQrLinkTarget(
        { kind: 'booking', providerId: 'p-1', providerType: 'nurse', utmQr: null },
        'patient',
        HOME,
        false,
      ),
    ).toEqual({
      href: { pathname: '/(patient)/booking/new', params: { provider_id: 'p-1', provider_role: 'nurse' } },
      message: null,
    });
  });

  it('laisse les soignants sur leur accueil pour un QR de prise de RDV', () => {
    const res = dispatchQrLinkTarget(
      { kind: 'booking', providerId: 'p-1', providerType: 'nurse', utmQr: null },
      'nurse',
      '/(nurse)/(tabs)/appointments',
      true,
    );
    expect(res.href).toBe('/(nurse)/(tabs)/appointments');
    expect(res.message).not.toBeNull();
  });

  it('signale un QR inconnu', () => {
    const res = dispatchQrLinkTarget({ kind: 'unknown' }, 'patient', HOME, true);
    expect(res.href).toBe(HOME);
    expect(res.message).toMatch(/reconnu/);
  });
});
