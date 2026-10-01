# Architecture styles — mobile Cary

Thème clair unique (pas de mode sombre). `app.json` force `userInterfaceStyle: "light"`.

## Stack

1. **Tokens** — `colors.ts` (`palette`, `AppColors`), `tokens.ts` (spacing, radius, elevation, iconSize), `typography.ts` (`font`, `FONT_SIZE_BASE`, `textStyles`)
2. **Thème** — `theme.ts` : `buildTheme(colorblindType, textScale)` renvoie `{ colors, fontSize, font, space, radius, shadow, scale }`
3. **Provider** — `ThemeProvider` (monté dans `AppProviders`) lit les réglages d'accessibilité (daltonisme, texte agrandi) ; `useTheme()` pour lire le thème
4. **Styles** — `useStyles(buildStyles)` ou `makeStyles((t) => ({ ... }))` (`make-styles.ts`), cache par factory et par thème
5. **Texte** — `AppText variant="h1 | h2 | body | caption | label…"` porte la typographie
6. **Primitives** — `Row`, `Cluster`, `Stack` (`components/layout/primitives.tsx`), `Button`, `IconActionButton`, `ListRowShell`, `FullWidthSegmentBar`

## Typographie

- Titres : **Raleway** (`font.heading`, `font.headingSemiBold`, `font.headingExtraBold`), chargée dans `app/_layout.tsx`.
- Texte courant : **police système** (`font.regular`, `font.medium`, `font.semiBold`, `font.bold`) — la graisse seule, pas de `fontFamily`.
- Ne jamais combiner `fontFamily` Raleway et `fontWeight` (Android retombe sur la police système).

## Factory

```tsx
import { AppText, font, useStyles, type Theme } from '@/theme';

export function MyScreen() {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.card}>
      <AppText style={styles.title}>Titre</AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize, space, radius }: Theme) {
  return {
    card: {
      flexDirection: 'row',
      gap: space.md,
      padding: space.lg,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
    },
    title: { ...font.heading, fontSize: fontSize.lg, color: c.textPrimary },
  } as const;
}
```

- La factory est définie **hors** du composant et renvoie des objets simples (`useStyles` appelle `StyleSheet.create`).
- Variantes : deux factories nommées (`buildCompactStyles`, `buildDefaultStyles`) plutôt qu'une lambda recréée à chaque rendu.
- Couleurs inline en JSX (icônes) : `useAppColors()` ou `useTheme().colors`.

## Couleurs

- Fond d'app unique : `c.background` (`#F6F8F8`, aligné sur le web). Cartes et barres : `c.surface` (blanc).
- Aucune couleur hex / `rgb()` / `rgba()` hors `src/theme/` (règle ESLint `oneandlab/no-raw-colors`). Transparence : `hexToRgba(c.primary, 0.12)`.
- `import { colors }` (proxy statique) : réservé à `navigation/screen-options.ts` et `components/navigation/header-layout.ts`.

## Layout (React Native / Yoga)

`flexDirection: 'row'` est autorisé. Garde-fous utiles :

| Rôle | Style |
|------|-------|
| Colonne de texte dans une row | `flex: 1` + `minWidth: 0` |
| Slot fixe (icône, bouton) | `flexShrink: 0` |
| Texte en row | `numberOfLines` explicite |

`npm run lint:layout` affiche un rapport indicatif (non bloquant) des `flex` sans `minWidth: 0`.

## Vérification (CI)

```bash
npm run verify -w @oneandlab/mobile
# équivalent : npm run typecheck && npm run lint
```

- ESLint : `oneandlab/no-raw-colors` (error), `oneandlab/no-static-colors-import` (error), `no-explicit-any` (error).
