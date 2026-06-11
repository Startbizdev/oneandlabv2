# Configuration stores — Cary Pro IAP

Produit unique : **`cary.pro.monthly`** → plan backend `nurse_pro` (29 €/mois).

## Apple App Store Connect

1. **Monétisation → Abonnements auto-renouvelables**
2. Groupe : **Cary Pro**
3. Produit : **cary.pro.monthly** (Reference Name: Pro Monthly)
4. Prix : **29 €/mois** + offre introductive **30 jours gratuits** (optionnel, aligné web Stripe)
5. **Users and Access → Integrations → In-App Purchase** : générer clé API (`.p8`)
6. Variables `.env` :
   - `APPLE_IAP_ISSUER_ID`
   - `APPLE_IAP_KEY_ID`
   - `APPLE_IAP_PRIVATE_KEY_PATH` (ou contenu PEM)
   - `APPLE_IAP_BUNDLE_ID=com.carybioapp.app`
7. **App Store Server Notifications V2** → `https://cary.bio/api/iap/apple/notifications`

## Google Play Console

1. **Monétisation → Abonnements** → `cary.pro.monthly`, 29 €/mois
2. Essai gratuit 30 jours (optionnel)
3. Compte de service JSON → API Android Publisher activée
4. Variables `.env` :
   - `GOOGLE_IAP_SERVICE_ACCOUNT_JSON` (chemin fichier) ou `GOOGLE_IAP_SERVICE_ACCOUNT_PATH`
   - `GOOGLE_IAP_PACKAGE_NAME=com.carybioapp.app`
5. **Real-time developer notifications** → topic Pub/Sub → `https://cary.bio/api/iap/google/notifications`

## Backend

Après migration 068 :

```bash
cd backend && php scripts/apply-migration-068-iap.php
```

Sandbox : `IAP_ALLOW_UNVERIFIED=true` (dev uniquement, jamais en production).
