# Cary Mobile

Application Expo (iOS / Android) pour patients, infirmiers, professionnels de santé et préleveurs.

## Branding

- Nom affiché : **Cary** (`app.json` → `expo.name`)
- **Logo** (horizontal, écran d’accueil) : `assets/logo-cary.png` — ne pas écraser via `icons:generate`
- **Splash natif** (lancement) : `assets/splash-logo.png` (dérivé du logo, ~200 px de large)
- **Icône app** (symbole seul) : `assets/icon.png`, `adaptive-icon.png` ← `assets/cary-app-icon-source.png`
- Régénérer les icônes app : `npm run icons:generate`
- Deep links : schéma `cary://` (voir `src/config/brand.ts`)

Après changement d’icône native : rebuild dev client (`npm run ios:dev-build` ou `expo run:android`).

## API

L’app pointe par défaut vers l’**API production** :

```bash
# .env (optionnel)
# EXPO_PUBLIC_API_BASE=https://app.oneandlab.fr/api
```

Pas de credentials SSH dans l’app — seule l’URL publique `https://app.oneandlab.fr/api`.

## Démarrage

```bash
cd apps/mobile
npm install
npm run start:clean   # Metro avec cache vidé
```
