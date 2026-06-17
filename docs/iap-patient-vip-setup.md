# Configuration stores — Horaire VIP patient (IAP mobile)

Supplément **8,99 € TTC** pour la prise de sang en créneau prioritaire (équivalent web Stripe).

Produit unique : **`cary.patient.blood.vip`** (achat consommable / one-time).

## Apple App Store Connect

1. Ouvrir l’app **Cary** (`com.carybioapp.app`) dans [App Store Connect](https://appstoreconnect.apple.com).
2. **Monétisation → Achats intégrés** (In-App Purchases).
3. Créer un produit **Consommable** :
   - **Reference Name** : `Horaire VIP prise de sang`
   - **Product ID** : `cary.patient.blood.vip` (doit correspondre exactement au code)
   - **Prix** : **8,99 €**
4. Renseigner nom / description localisés (FR) :
   - Nom affiché : `Horaire VIP`
   - Description : supplément priorisation créneau 6h–19h pour prise de sang à domicile.
5. Soumettre le produit pour revue avec la prochaine version de l’app (statut **Ready to Submit**).
6. **Pas de nouvelle clé API** : réutiliser les variables Cary Pro déjà configurées :
   - `APPLE_IAP_ISSUER_ID`
   - `APPLE_IAP_KEY_ID`
   - `APPLE_IAP_PRIVATE_KEY_PATH` (ou `APPLE_IAP_PRIVATE_KEY`)
   - `APPLE_IAP_BUNDLE_ID=com.carybioapp.app`
7. Backend : `IAP_PATIENT_VIP_PRODUCT_ID=cary.patient.blood.vip`

### Test sandbox Apple

- Utiliser un **compte Sandbox** (Users and Access → Sandbox).
- Build **EAS natif** (pas Expo Go).
- `IAP_ALLOW_UNVERIFIED=true` en dev local uniquement pour simuler sans App Store.

## Google Play Console

1. [Google Play Console](https://play.google.com/console) → app **Cary** (`com.carybioapp.app`).
2. **Monétisation → Produits intégrés** (In-app products), pas abonnement.
3. Créer un produit **Achat unique** :
   - **ID produit** : `cary.patient.blood.vip`
   - **Prix** : **8,99 €**
   - Statut : **Actif**
4. Réutiliser le compte de service Android Publisher (même que Cary Pro) :
   - `GOOGLE_IAP_PACKAGE_NAME=com.carybioapp.app`
   - `GOOGLE_IAP_SERVICE_ACCOUNT_PATH` ou `GOOGLE_IAP_SERVICE_ACCOUNT_JSON`
5. Backend : `IAP_PATIENT_VIP_PRODUCT_ID=cary.patient.blood.vip`

### Test Google

- Compte **licence de test** ou compte interne dans Play Console.
- Build release/signed installé depuis Play (internal testing) ou build EAS avec signature prod.

## Backend

Migration colonnes IAP sur brouillons :

```bash
cd backend && php scripts/apply-migration-074-patient-booking-draft-iap.php
```

Endpoints :

| Méthode | Route | Rôle |
|---------|-------|------|
| POST | `/patient/booking-draft` | Crée le brouillon (multipart, comme web) |
| POST | `/patient/booking-draft/iap-complete` | Vérifie Apple/Google puis crée le RDV |
| GET | `/patient/booking-draft/status?draft_id=` | Statut brouillon (mobile polling optionnel) |

## Parcours mobile

1. Patient → prise de sang → onglet **Horaire VIP** dans le wizard.
2. Validation finale → `POST /patient/booking-draft` → sheet Apple / Google (`cary.patient.blood.vip`).
3. Après paiement → `POST /patient/booking-draft/iap-complete` → redirection fiche RDV.

## Alignement web / mobile

| Canal | Paiement | Montant affiché |
|-------|----------|-----------------|
| Web | Stripe Checkout | 8,99 € TTC |
| iOS | IAP consommable | 8,99 € (App Store) |
| Android | IAP one-time | 8,99 € (Google Play) |

Voir aussi : [iap-store-setup.md](./iap-store-setup.md) (abonnement infirmier Cary Pro).
