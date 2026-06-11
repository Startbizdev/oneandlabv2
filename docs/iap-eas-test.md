# Tests EAS + resoumission App Store — IAP Cary Pro

## Prérequis

1. Migration 068 appliquée en prod : `php backend/scripts/run-migration-068-iap.php`
2. Variables `.env` IAP configurées (voir [iap-store-setup.md](./iap-store-setup.md))
3. Produit `cary.pro.monthly` actif dans ASC et Play Console
4. **Nouveau build natif obligatoire** (`expo-iap` = module natif, pas OTA seul)

## Build

```bash
cd apps/mobile
npm run verify:eas
npm run build:ios:store
# Android (profil production dans eas.json)
npx eas-cli build --platform android --profile production
```

## Checklist tests

- [ ] Infirmier **Découverte** → achat Pro iOS → `GET /plan-limits` = `nurse_pro`, rayon 100 km
- [ ] **Restore purchases** après réinstallation
- [ ] User **Pro Stripe (web)** → app affiche Pro, **pas** de double achat (`can_purchase_store: false`)
- [ ] Android : même flux Google Play
- [ ] Webhook expiration Apple/Google → retour `discovery`

## Note reviewer App Store Connect

> Abonnement Cary Pro proposé via In-App Purchase (auto-renewable subscription `cary.pro.monthly`).
> Aucun lien de paiement externe dans l’app iOS.
> Gestion des abonnements Stripe web séparée pour les utilisateurs inscrits sur cary.bio.

## Sandbox dev

`IAP_ALLOW_UNVERIFIED=true` dans `.env` backend **uniquement en local** pour tester sans clés Apple/Google.
