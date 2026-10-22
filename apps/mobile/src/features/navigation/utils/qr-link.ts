import type { Href } from 'expo-router';
import type { MobileRole } from '@oneandlab/shared-constants';

/**
 * Cible d'un QR code Cary (`https://cary.bio/qr/{token}`), d'après le `redirect_url` de `GET /qr/resolve`
 * (`QrCodeService::buildRedirectUrl`) : pharmacie → commande, autre prestataire → prise de RDV.
 */
export type QrLinkTarget =
  | { kind: 'pharmacy'; pharmacyId: string; utmQr: string | null }
  | { kind: 'booking'; providerId: string | null; providerType: string | null; utmQr: string | null }
  | { kind: 'unknown' };

/** Résultat de l'aiguillage pour un rôle : écran à ouvrir, message éventuel (rôle sans accès). */
export type QrLinkDispatch = { href: Href; message: string | null };

const NO_ORDER_MESSAGE = 'La commande en pharmacie n’est pas disponible avec votre compte.';
const NO_BOOKING_MESSAGE = 'La prise de rendez-vous depuis un QR code est réservée aux patients.';
const UNKNOWN_MESSAGE = 'Ce QR code n’est pas reconnu.';

function decode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Analyse manuelle : `URL.searchParams` reste incomplet selon les moteurs JS de React Native. */
function splitUrl(url: string): { path: string; query: Record<string, string> } {
  const withoutHash = url.split('#')[0] ?? '';
  const [beforeQuery = '', rawQuery = ''] = withoutHash.split('?', 2) as [string?, string?];
  const path = beforeQuery.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '') || '/';
  const query: Record<string, string> = {};
  for (const pair of rawQuery.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decode(eq < 0 ? pair : pair.slice(0, eq));
    if (key && !(key in query)) query[key] = decode(eq < 0 ? '' : pair.slice(eq + 1)).trim();
  }
  return { path: path.replace(/\/+$/, '') || '/', query };
}

function nonEmpty(value: string | undefined | null): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export function parseQrRedirectUrl(url: string | null | undefined, fallbackUtmQr?: string | null): QrLinkTarget {
  if (!url?.trim()) return { kind: 'unknown' };
  const { path, query } = splitUrl(url.trim());
  const utmQr = nonEmpty(query.utm_qr) ?? nonEmpty(fallbackUtmQr);

  const pharmacy = /^\/pharmacie\/([^/]+)$/.exec(path);
  if (pharmacy?.[1]) {
    const pharmacyId = nonEmpty(decode(pharmacy[1]));
    return pharmacyId ? { kind: 'pharmacy', pharmacyId, utmQr } : { kind: 'unknown' };
  }
  if (path === '/rendez-vous/nouveau') {
    return {
      kind: 'booking',
      providerId: nonEmpty(query.provider_id),
      providerType: nonEmpty(query.provider_type),
      utmQr,
    };
  }
  return { kind: 'unknown' };
}

/** Assistant de commande pharmacie du rôle, pharmacie présélectionnée ; `null` si le rôle ne commande pas. */
export function pharmacyOrderWizardHref(role: MobileRole, pharmacyId: string, utmQr: string | null): Href | null {
  const params: Record<string, string> = { pharmacy_id: pharmacyId };
  if (utmQr) params.utm_qr = utmQr;
  switch (role) {
    case 'patient':
      return { pathname: '/(patient)/traitements/new', params };
    case 'nurse':
      return { pathname: '/(nurse)/commandes-pharmacie/new', params };
    case 'pro':
      return { pathname: '/(pro)/commandes-pharmacie/new', params };
    case 'preleveur':
      return null;
  }
}

/**
 * Écran à ouvrir pour un QR résolu. `canOrder` : droits du module pharmacie (`GET /pharmacy-module/config`) ;
 * un compte pharmacie ou un module désactivé retombe sur l'accueil avec un message.
 */
export function dispatchQrLinkTarget(
  target: QrLinkTarget,
  role: MobileRole,
  home: Href,
  canOrder: boolean,
): QrLinkDispatch {
  if (target.kind === 'pharmacy') {
    if (!canOrder) return { href: home, message: NO_ORDER_MESSAGE };
    const href: Href | null = pharmacyOrderWizardHref(role, target.pharmacyId, target.utmQr);
    if (!href) return { href: home, message: NO_ORDER_MESSAGE };
    return { href, message: null };
  }
  if (target.kind === 'booking') {
    if (role !== 'patient') return { href: home, message: NO_BOOKING_MESSAGE };
    const params: Record<string, string> = {};
    if (target.providerId) params.provider_id = target.providerId;
    // Le formulaire lit `provider_role` (nurse | lab | pro), valeurs identiques à `provider_type`.
    if (target.providerType) params.provider_role = target.providerType;
    return { href: { pathname: '/(patient)/booking/new', params }, message: null };
  }
  return { href: home, message: UNKNOWN_MESSAGE };
}
