# Checklist smoke — module commandes pharmacie

Checklist manuelle pour valider le module en staging ou production. **Ne pas créer de fausses commandes en production** sauf via un compte de test dédié.

## Prérequis

- [ ] Migration 110 appliquée (`pharmacy_orders`, `pharmacy_order_events`, `pharmacy_order_messages`, colonnes `profiles`)
- [ ] Migration 111 appliquée (`pharmacy_favorites`)
- [ ] `php backend/scripts/verify-pharmacy-module.php` → tout OK
- [ ] Clé `pharmacy_module_config` présente dans `platform_settings`

## Configuration admin

- [ ] `GET /api/admin/pharmacy-module/config` (super_admin) retourne la config
- [ ] `PATCH /api/admin/pharmacy-module/config` met à jour `ordering_enabled_for_nurse` et persiste
- [ ] Désactiver `module_enabled` masque le module côté clients

## Droits commandeur (`can_order`)

- [ ] Infirmier avec module actif peut voir l’onglet commande
- [ ] Pro « Médecin généraliste » peut commander
- [ ] Pro « Pharmacien » ne peut pas commander (rôle récepteur)
- [ ] Patient ne peut pas accéder aux endpoints commandes

## Droits pharmacie (`can_receive`)

- [ ] Pro « Pharmacien » avec `pharmacy_orders_enabled=1` voit l’onglet réception
- [ ] Pause (`pharmacy_orders_paused=1`) bloque la réception de nouvelles commandes
- [ ] Click & collect / livraison respectent les flags profil pharmacie

## Cycle de vie commande (compte test uniquement)

- [ ] Création avec ordonnance obligatoire → statut `en_attente`
- [ ] Pharmacie accepte → `acceptee`
- [ ] Pharmacie passe en cours → `en_cours`
- [ ] Pharmacie termine → `terminee`
- [ ] Refus avec motif obligatoire → `refusee`
- [ ] Complément demandé → `complement_demande` puis retour `en_attente`
- [ ] Annulation par le commandeur → `annulee`
- [ ] Transitions invalides (ex. `en_attente` → `terminee`) rejetées

## Conversation

- [ ] Requester et pharmacie peuvent lire les messages
- [ ] Utilisateur tiers ne peut pas accéder
- [ ] Envoi bloqué sur statuts terminaux (`terminee`, `refusee`, `annulee`)

## Favoris & catalogue

- [ ] `GET /api/pharmacies` liste les pharmacies éligibles
- [ ] Ajout / retrait favori persiste
- [ ] Favoris visibles dans le catalogue

## Stats

- [ ] `GET /api/pharmacy-orders/stats/sent` pour le commandeur
- [ ] `GET /api/pharmacy-orders/stats/received` pour la pharmacie
- [ ] Admin stats agrégées accessibles

## Notifications

- [ ] Création commande → notification pharmacie
- [ ] Changement statut → notification destinataire approprié
- [ ] Nouveau message → notification interlocuteur

## Scripts de diagnostic

```bash
php backend/scripts/verify-pharmacy-module.php
php backend/scripts/inspect-pharmacy-order.php <order_uuid>
composer test:pharmacy   # depuis backend/
node packages/shared-utils/scripts/test-pharmacy-module-access.mjs
```

## Tests automatisés

- [ ] `composer test:pharmacy` (PHPUnit)
- [ ] `node packages/shared-utils/scripts/test-pharmacy-module-access.mjs`
- [ ] `npm run test:e2e -- pharmacy-orders` (Playwright, API mockée)
