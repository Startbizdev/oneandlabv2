# Mobile — architecture styles

Documentation complète : [`src/theme/STYLES.md`](src/theme/STYLES.md)

Thème clair uniquement. Titres en Raleway, texte en police système.

## Pattern composant

```tsx
import { AppText, radius, spacing, useStyles, type Theme } from '@/theme';

export function MyScreen() {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.card}>
      <AppText variant="headline">Titre</AppText>
      <AppText variant="secondary">Une phrase d'aide.</AppText>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    card: { gap: spacing[1], padding: spacing[4], borderRadius: radius.lg, backgroundColor: c.surface },
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
| `Card` | Groupe de contenu (trait discret, sans ombre) |
| `SettingsSection` / `SettingsRow` | Menus, réglages, action isolée en rangée |
| `EmptyState` / `ErrorState` | Rien à afficher (`illustration` de `src/constants/illustrations.ts`) / échec de chargement |
| `SheetModal` | Bottom sheet |
| `FullWidthSegmentBar` | Segmented control pleine largeur |
| `Input` / `PasswordInput` / `Textarea` / `SelectField` | Saisie (styles communs `field-styles.ts`) |

## Règles

- Factory hors composant, objets simples (`useStyles` fait le `StyleSheet.create`).
- Typographie via les six rôles : `AppText variant` (`display`, `title`, `headline`, `body`, `secondary`, `caption`) ou `Theme.text.*` dans une factory.
- Espacements, rayons, icônes : `spacing[]`, `radius.*`, `iconSize.*` + `ICON_STROKE_WIDTH`, cibles `MIN_TOUCH_TARGET` — aucune valeur en dur.
- Turquoise réservé aux actions, à la sélection, à la navigation active et à la progression.
- Aucune couleur en dur hors `src/theme/` (`oneandlab/no-raw-colors`) : `c.*`, `palette.*`, `hexToRgba`.
- Pas de `import { colors }` dans un composant React.
- `flexDirection: 'row'` autorisé ; colonne de texte en row avec `flex: 1` + `minWidth: 0`.

## Vérification

```bash
npm run verify -w @oneandlab/mobile
```
