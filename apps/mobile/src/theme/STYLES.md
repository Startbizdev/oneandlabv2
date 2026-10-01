# Architecture styles — mobile Cary

Thème clair unique (pas de mode sombre). `app.json` force `userInterfaceStyle: "light"`.

## Stack

1. **Tokens** — `colors.ts` (`palette`, `AppColors`), `tokens.ts` (spacing, radius, elevation, iconSize), `typography.ts` (`font`, `FONT_SIZE_BASE`, `textStyles`)
2. **Thème** — `theme.ts` : `buildTheme(colorblindType, textScale)` renvoie `{ colors, fontSize, font, space, radius, shadow, scale }`
3. **Provider** — `ThemeProvider` (monté dans `AppProviders`) lit les réglages d'accessibilité (daltonisme, texte agrandi) ; `useTheme()` pour lire le thème
4. **Styles** — `useStyles(buildStyles)` ou `makeStyles((t) => ({ ... }))` (`make-styles.ts`), cache par factory et par thème
5. **Texte** — `AppText variant="h1 | h2 | body | caption | label…"` porte la typographie
6. **Primitives** — `Row`, `Cluster`, `Stack` (`components/layout/primitives.tsx`), `Button`, `IconActionButton`, `ListRowShell`, `FullWidthSegmentBar`

## Primitives UX (`components/ui/`)

| Besoin | Composant |
|--------|-----------|
| Liste issue d'une requête | `QueryFlatList` / `InfiniteQueryFlatList` : squelette au 1er chargement, `ErrorState` + « Réessayer » si l'échec survient sans cache, « Réessayer » en pied de liste si la page suivante échoue |
| Échec de chargement hors liste | `ErrorState error={q.error} onRetry={q.refetch}` — jamais un état vide trompeur ni `error.message` brut |
| Rien à afficher | `EmptyState` (avec une action quand elle existe) |
| Action destructrice ou irréversible | `ConfirmSheet` (titre, conséquence, récap optionnel, `tone="destructive"`) |
| Action appliquée tout de suite mais annulable | `useToast().showUndo('Passage marqué effectué', annuler)` |
| Menus et réglages | `SettingsSection` + `SettingsRow` (description, valeur, badge, `trailing` pour un interrupteur) |
| Statut de RDV | `StatusBadge` : toujours un libellé, jamais une couleur seule |

- Cibles tactiles : **44 pt minimum** (`Button` toutes tailles, puces, segments, onglets). Si le visuel est plus petit, compléter avec `hitSlop`.
- Animations : Reanimated respecte le réglage système « Réduire les animations » par défaut (`ReduceMotion.System`) — ne jamais forcer `ReduceMotion.Never`. Pour le reste (`scrollTo({ animated })`, carrousels), lire `useReducedMotion()` de `react-native-reanimated`.

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
- Hors composant (options de navigation, helpers) : recevoir `c: AppColors` ou `Theme` en paramètre — il n'existe plus d'état global de thème.

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

- ESLint : `oneandlab/no-raw-colors` (error), `no-explicit-any` (error), `react-hooks/rules-of-hooks` (error).
