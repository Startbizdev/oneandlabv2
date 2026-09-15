# Icônes du catalogue : web et mobile

L’icône choisie dans l’administration est la source du pictogramme affiché dans la sélection, le panier, le calendrier, les fiches de rendez-vous, les profils publics et les préférences de soins. Une ancienne image ne masque plus une icône explicitement sélectionnée.

- Résolution commune dans `packages/shared-utils/src/care-symbol.ts` : Lucide, Medical Icons, Health Icons et Covid Icons ; compatibilité des anciens noms et repli sémantique pour les emojis.
- Une nouvelle image personnalisée reste possible : son choix efface la sélection d’icône dans le formulaire. Les fichiers existants ne sont pas supprimés.
- Mobile : les 155 SVG correspondant au sélecteur sont embarqués dans `apps/mobile/src/assets/care-icons.json`. Actualisation : `node scripts/sync-mobile-care-icons.cjs`. Les crédits et licences sont conservés à côté des SVG.
- Administration : popup ajout/modification élargie et structurée, aperçu immédiat ; suppression de la surcharge de padding qui cassait la barre du wizard.

## Vérification

`node scripts/test-care-icons.cjs`, typecheck Nuxt, build de production, `npm run mobile:verify`, tests Playwright de la sélection, des fiches, des profils et des préférences sur API fictive isolée.

53 cas navigateur validés : 20 cas fiches/catalogue/calendrier, 31 cas parcours/profils, puis les 2 cas de modification d’icône. Mobile : zéro erreur TypeScript, layout et styles ; 86 avertissements ESLint préexistants.

## Livraison

Le script `scripts/deploy-frontend-release.sh` construit en local et remplace uniquement le frontend en gardant la version précédente et ses anciens chunks. Il ne lance aucune migration et ne modifie pas la base de données ni les fichiers des patients.

Les changements mobiles nécessitent une nouvelle distribution de l’app. Un déploiement du site ne met pas à jour les applications déjà installées. La vérification statique ne remplace pas une recette sur téléphone physique.
