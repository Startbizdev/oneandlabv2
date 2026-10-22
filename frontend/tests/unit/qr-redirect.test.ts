import { describe, expect, it } from 'vitest';
import { isAllowedQrRedirectPath, safeQrRedirectPath } from '~/utils/qr-redirect';
import { pharmacyBookingPath, pharmacyLoginPath, pharmacyOrderPath } from '~/utils/pharmacy-landing';
import { androidAssetLinks, appleAppSiteAssociation, parseSha256Fingerprints } from '~/server/app-links/config';

const SITE = 'https://cary.bio';
const ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

describe('redirection QR', () => {
  it('accepte la prise de RDV et la page pharmacie sur la même origine', () => {
    expect(safeQrRedirectPath(`${SITE}/rendez-vous/nouveau?provider_id=1&utm_qr=t`, SITE)).toBe(
      '/rendez-vous/nouveau?provider_id=1&utm_qr=t',
    );
    expect(safeQrRedirectPath(`${SITE}/pharmacie/${ID}?utm_qr=tok`, SITE)).toBe(`/pharmacie/${ID}?utm_qr=tok`);
    expect(safeQrRedirectPath(`/pharmacie/${ID}`, SITE)).toBe(`/pharmacie/${ID}`);
  });

  it('refuse une autre origine', () => {
    expect(safeQrRedirectPath(`https://evil.example/pharmacie/${ID}`, SITE)).toBe('');
    expect(safeQrRedirectPath('//evil.example/rendez-vous/nouveau', SITE)).toBe('');
    expect(safeQrRedirectPath(`http://cary.bio/pharmacie/${ID}`, SITE)).toBe('');
  });

  it('refuse tout autre chemin', () => {
    expect(isAllowedQrRedirectPath('/pharmacie/not-a-uuid')).toBe(false);
    expect(isAllowedQrRedirectPath(`/pharmacie/${ID}/extra`)).toBe(false);
    expect(isAllowedQrRedirectPath('/pharmacie/')).toBe(false);
    expect(isAllowedQrRedirectPath('/rendez-vous/nouveau/x')).toBe(false);
    expect(safeQrRedirectPath(`${SITE}/login`, SITE)).toBe('');
    expect(safeQrRedirectPath('javascript:alert(1)', SITE)).toBe('');
  });
});

describe('page pharmacie', () => {
  it('oriente chaque rôle vers son formulaire de commande', () => {
    expect(pharmacyOrderPath('patient', ID, 'tok')).toBe(`/patient/traitements/new?pharmacy_id=${ID}&utm_qr=tok`);
    expect(pharmacyOrderPath('nurse', ID, null)).toBe(`/nurse/commandes-pharmacie/new?pharmacy_id=${ID}`);
    expect(pharmacyOrderPath('pro', ID, 'tok')).toBe(`/pro/commandes-pharmacie/new?pharmacy_id=${ID}&utm_qr=tok`);
    expect(pharmacyOrderPath('lab', ID, 'tok')).toBeNull();
    expect(pharmacyOrderPath(null, ID, 'tok')).toBeNull();
  });

  it('revient sur la page pharmacie après connexion', () => {
    const url = new URL(pharmacyLoginPath(ID, 'tok'), SITE);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('returnTo')).toBe(`/pharmacie/${ID}?utm_qr=tok&intent=commander`);
  });

  it('conserve le jeton QR pour la prise de rendez-vous', () => {
    expect(pharmacyBookingPath(ID, 'tok')).toBe(`/rendez-vous/nouveau?provider_id=${ID}&provider_type=pro&utm_qr=tok`);
  });
});

describe('fichiers d’association app', () => {
  it('produit l’AASA seulement avec un Team ID valide', () => {
    expect(appleAppSiteAssociation('')).toBeNull();
    expect(appleAppSiteAssociation('bad')).toBeNull();
    expect(appleAppSiteAssociation('ABCDE12345')).toEqual({
      applinks: {
        apps: [],
        details: [{ appIDs: ['ABCDE12345.com.carybioapp.app'], components: [{ '/': '/qr/*' }, { '/': '/pharmacie/*' }, { '/': '/p/rdv/*' }] }],
      },
    });
  });

  it('filtre les empreintes Android invalides', () => {
    const fp = Array.from({ length: 32 }, () => 'ab').join(':');
    expect(parseSha256Fingerprints(` ${fp} , nope,`)).toEqual([fp.toUpperCase()]);
    expect(androidAssetLinks([])).toBeNull();
    expect(androidAssetLinks([fp.toUpperCase()])?.[0]).toMatchObject({
      target: { package_name: 'com.carybioapp.app', sha256_cert_fingerprints: [fp.toUpperCase()] },
    });
  });
});
