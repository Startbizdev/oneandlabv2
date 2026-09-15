# Reproduire la recette locale

Les tests navigateur utilisent des réponses fictives. La base MySQL des tests contient uniquement des données synthétiques. Les résultats et limites de la recette sont consignés dans `etat-et-risques.md`.

## Web

Depuis la racine, exécuter le typage puis la compilation **successivement** : les deux commandes écrivent dans `.nuxt`.

```powershell
npm run typecheck --workspace=oneandlab-frontend
npm run build --workspace=oneandlab-frontend
```

Démarrer le serveur de profils publics fictifs dans un terminal :

```powershell
node frontend/e2e/fixtures/public-api-server.cjs
```

Dans un autre terminal, depuis `frontend` :

```powershell
$env:PORT='3101'
$env:HOST='127.0.0.1'
$env:NUXT_PUBLIC_API_BASE='/api'
$env:NUXT_API_INTERNAL_BASE='http://127.0.0.1:8889/api'
node .output/server/index.mjs
```

Ces variables servent exclusivement à la recette locale. Redémarrer le serveur de prévisualisation après une nouvelle compilation. Ne pas reconstruire `.output` pendant qu’une recette utilise ce dossier. Pour poursuivre le développement pendant les tests, copier la compilation terminée dans un nouveau dossier temporaire, puis lancer son `server/index.mjs` avec les mêmes variables ; la recette dispose ainsi de fichiers stables.

Enfin, depuis `frontend` :

```powershell
$env:CI='1'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3101'
$taskSpecs = Get-ChildItem e2e/*.spec.ts |
  Where-Object Name -ne 'patient-documents-flow.spec.ts' |
  ForEach-Object { 'e2e/' + $_.Name }
npx playwright test @taskSpecs --retries=0 --reporter=line
```

`patient-documents-flow.spec.ts` est un ancien scénario d’intégration nécessitant un backend et un compte de test réels. Il n’est pas inclus dans le résultat de la recette fictive et n’a pas été validé ici. La bibliothèque, les pièces préremplies et la reprise après échec disposent de scénarios fictifs distincts.

## Mobile

Depuis la racine :

```powershell
npm run mobile:verify
```

Depuis `apps/mobile` :

```powershell
npx expo export --platform all --output-dir dist-verification
```

L’export vérifie la génération des bundles iOS/Android. Il ne signe ni ne publie d’application. `dist-verification` est un artefact local ignoré par Git.

## Backend

Les tests autonomes utilisent SQLite ou des données en mémoire :

```powershell
Get-ChildItem backend/tests/appointments/*-standalone.php | ForEach-Object {
  php $_.FullName
  if ($LASTEXITCODE -ne 0) { throw $_.Name }
}
```

Les tests `*-mysql.php` nécessitent le serveur MySQL synthétique local sur `127.0.0.1:13316`. Leur connecteur vérifie aussi le chemin du répertoire de données avant toute création de table. Il ne lit pas les identifiants de production. Chaque exécution crée une base au nom aléatoire.

Sous Windows, avec l’extension PDO MySQL disponible :

```powershell
Get-ChildItem backend/tests/appointments/*-mysql.php | ForEach-Object {
  php -d extension=php_pdo_mysql.dll $_.FullName
  if ($LASTEXITCODE -ne 0) { throw $_.Name }
}
```

Les scripts `scripts/test-*.cjs` couvrent notamment les données historiques, la pagination, les reprises de documents, la sélection des patients, les profils et les durées. Ils s’exécutent individuellement avec Node.

## Inventaire

```powershell
node scripts/audit-ui-surface.mjs
node scripts/audit-unused-web-components.mjs
git diff --check
```

L’inventaire recense la surface du projet ; il ne certifie pas une recette exhaustive de toutes les actions de chaque page.
