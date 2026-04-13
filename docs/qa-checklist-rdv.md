# Checklist QA — RDV et périmètre associé (régression post-remédiation)

À exécuter manuellement par rôle après déploiement. Les scénarios Playwright optionnels vivent sous `frontend/e2e/`.

## Patient

- [ ] Création / consultation d’un RDV (flux habituel).
- [ ] Détail RDV, changement de statut côté patient si applicable.
- [ ] Annulation sans motif « pro » (comportement attendu produit).
- [ ] Documents : carte vitale / mutuelle / autres assurances sur la fiche patient ; documents liés au RDV si prévu.

## Professionnel (pro)

- [ ] Liste RDV : inclut les RDV créés par le pro et ceux des patients liés via **PPA** (après acceptation / lien métier).
- [ ] Détail d’un RDV autorisé.
- [ ] Upload documents patient : accès si **created_by** ou **PPA** (aligné avec le profil patient).
- [ ] Profil : liens historique RDV pointent vers **`/pro/appointments`** (liste + détail).

## Infirmier (nurse)

- [ ] RDV nursing / blood_test selon règles existantes ; confirmation et limites plan.
- [ ] Partage pour infirmier (`share-for-nurse`) si utilisé dans le flux.

## Laboratoire / sous-compte

- [ ] Liste RDV équipe ; documents médicaux RDV.
- [ ] Réassignation RDV si applicable.

## Préleveur

- [ ] Liste RDV assignés (lab / assignation).

## Super admin

- [ ] Liste / détail RDV admin ; `user_id` en query si besoin.
- [ ] PUT édition complète RDV réservée super admin.
- [ ] Notifications admin (`send`) uniquement super_admin.

## Public / non régression

- [ ] Formulaire contact : envoi OK ; **429** après rafales (rate limit ~10/min/IP).
- [ ] Lookup patient par email (pro/lab/etc.) : **429** après rafales (rate limit ~60/min/user+IP).

## Sécurité

- [ ] `POST /api/appointments` refusé pour rôles non listés (ex. préleveur si exclu).
- [ ] `patient-documents/upload-debug.php` : **404** en production (`APP_ENV=production`).
