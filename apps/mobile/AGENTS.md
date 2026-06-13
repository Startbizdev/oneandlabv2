# Mobile — architecture styles

Documentation complète : [`src/theme/STYLES.md`](src/theme/STYLES.md)

## Pattern composant

```tsx
function buildStyles(c: AppColors) {
  return {
    surface: {
      backgroundColor: c.surface,
    },
  };
}

export function MyScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'MyScreen');
  return <Icon color={c.primary} />;
}
```

## Primitives layout (obligatoires)

| Composant | Usage |
|-----------|--------|
| `Row` | Ligne horizontale sûre (`minWidth: 0` intégré) |
| `Cluster` | `[leading \| contenu flex \| actions]` |
| `Stack` | Empilement vertical avec `gap` tokenisé |
| `Box` | Conteneur générique |
| `Spacer` | Espace flexible ou fixe |

Import : `@/components/layout/primitives`

## Primitives composant (réutiliser)

| Composant | Usage |
|-----------|--------|
| `StackCard` | Carte 2 sections (corps + footer actions séparés) |
| `ListRowShell` | `[leading \| body flex:1 \| trailing/actions]` |
| `Button` | Seul bouton texte autorisé |
| `IconActionButton` | Bouton icône tokenisé |
| `FullWidthSegmentBar` | Segmented control pleine largeur |

## Règles

- Factory plain object — jamais `StyleSheet.create` dans `build*Styles`
- `useThemedStyles` dans les composants React (plus de `new Proxy`)
- `useAppColors()` pour icônes / couleurs inline — **pas** `import { colors }`
- Corps riche + actions : **deux rangées** (`StackCard`) ou `Cluster`, pas une row brute
- Deux factories nommées si variantes (compact / footer) — pas de `(c) => build(c, flag)`
- Pas de `flexDirection: 'row'` à la main — utiliser `Row` / `Cluster` / `ListRowShell`

## Vérification

```bash
npm run verify -w @oneandlab/mobile
```
