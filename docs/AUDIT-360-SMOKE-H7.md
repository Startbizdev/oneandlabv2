# Checklist smoke post-release (H7)

À exécuter **après** `scripts/deploy-safe-release.sh` (ou `buildscriptoneandlab.sh`) — uniquement sur GO ops.

## Web

- [ ] Login patient / nurse / lab / pro
- [ ] Création RDV nursing + blood_test (wizard staff)
- [ ] Liste RDV `scope=list` lab (pagination)
- [ ] Détail RDV patient (polling statut)
- [ ] Care photos / discussion
- [ ] Documents médicaux upload + liste
- [ ] Notifications badge / feed
- [ ] Pharmacie : créer commande + messages

## Mobile (après EAS /dev client)

- [ ] `npm run verify:eas --workspace=@oneandlab/mobile` avant build
- [ ] Build `build:dev:ios` ou `build:dev:android` d’abord si doute
- [ ] Même parcours smoke : RDV, notifs, pharmacie

## Non-objectifs

- Pas de force-push
- Pas d’EAS production sans confirmation séparée
