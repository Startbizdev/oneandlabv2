import { ErrorCode } from 'expo-iap';

const STORE_UNAVAILABLE =
  'La boutique est momentanément indisponible. Vérifiez votre connexion puis réessayez.';
const OFFER_UNAVAILABLE =
  'Cette offre est temporairement indisponible dans la boutique. Réessayez plus tard.';

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.NetworkError]: 'Connexion instable : l’achat n’a pas abouti. Réessayez.',
  [ErrorCode.ServiceTimeout]: STORE_UNAVAILABLE,
  [ErrorCode.ServiceDisconnected]: STORE_UNAVAILABLE,
  [ErrorCode.ServiceError]: STORE_UNAVAILABLE,
  [ErrorCode.BillingUnavailable]: STORE_UNAVAILABLE,
  [ErrorCode.IapNotAvailable]: 'Les achats intégrés sont désactivés sur cet appareil.',
  [ErrorCode.EmptySkuList]: OFFER_UNAVAILABLE,
  [ErrorCode.SkuNotFound]: OFFER_UNAVAILABLE,
  [ErrorCode.ItemUnavailable]: OFFER_UNAVAILABLE,
  [ErrorCode.QueryProduct]: OFFER_UNAVAILABLE,
  [ErrorCode.AlreadyOwned]:
    'Vous possédez déjà cet abonnement. Utilisez « Restaurer mes achats » pour le réactiver.',
  [ErrorCode.DuplicatePurchase]:
    'Cet achat est déjà en cours de traitement. Utilisez « Restaurer mes achats » si besoin.',
  [ErrorCode.Pending]:
    'Votre achat est en attente de validation par la boutique. Il sera activé dès sa confirmation.',
  [ErrorCode.DeferredPayment]:
    'Votre achat attend une approbation (contrôle parental ou paiement différé).',
  [ErrorCode.UserError]: 'Achat refusé par la boutique. Vérifiez votre moyen de paiement.',
};

function isErrorCode(code: string): code is ErrorCode {
  return (Object.values(ErrorCode) as string[]).includes(code);
}

/** Code d'erreur expo-iap éventuel porté par une erreur inconnue. */
export function iapErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}

/** Message utilisateur pour une erreur boutique ; `null` si l'utilisateur a lui-même annulé. */
export function iapErrorMessage(error: unknown): string | null {
  const code = iapErrorCode(error);
  if (code === ErrorCode.UserCancelled) return null;
  return (code && isErrorCode(code) ? MESSAGES[code] : undefined) ?? 'L’achat n’a pas abouti. Réessayez dans un instant.';
}
