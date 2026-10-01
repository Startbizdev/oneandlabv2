# Mobile — architecture styles

Documentation complète : [`src/theme/STYLES.md`](src/theme/STYLES.md)

Thème clair uniquement. Titres en Raleway, texte en police système.

## Pattern composant

```tsx
import { AppText, font, useStyles, type Theme } from '@/theme';

export function MyScreen() {
  const styles = useStyles(buildStyles);
  return <AppText style={styles.title}>Titre</AppText>;
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    title: { ...font.heading, fontSize: fontSize.lg, color: c.textPrimary },
  } as const;
}
```

## Primitives (réutiliser avant d'en créer)

| Composant | Usage |
|-----------|--------|
| `Row` / `Cluster` / `Stack` | Layout (`@/components/layout/primitives`) |
| `ListRowShell` | `[leading \| body flex:1 \| trailing/actions]` |
| `Button` | Bouton texte |
| `IconActionButton` | Bouton icône |
| `FullWidthSegmentBar` | Segmented control pleine largeur |

## Règles

- Factory hors composant, objets simples (`useStyles` fait le `StyleSheet.create`).
- Typographie via `font.*` et `fontSize.*` du thème, ou `AppText variant`.
- Aucune couleur en dur hors `src/theme/` (`oneandlab/no-raw-colors`) : `c.*`, `palette.*`, `hexToRgba`.
- Pas de `import { colors }` dans un composant React.
- `flexDirection: 'row'` autorisé ; colonne de texte en row avec `flex: 1` + `minWidth: 0`.

## Vérification

```bash
npm run verify -w @oneandlab/mobile
```
