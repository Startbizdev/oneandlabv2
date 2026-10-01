# Architecture styles — mobile Cary

Thème clair unique (pas de mode sombre). `app.json` force `userInterfaceStyle: "light"`.
Direction : éditoriale médicale (Apple Santé, Airbnb) — fond sable léger, cartes blanches, traits discrets, quasiment pas d'ombre.

## Stack

1. **Tokens** — `colors.ts` (`palette`, `AppColors`), `tokens.ts` (`spacing`, `radius`, `elevation`, `iconSize`, `ICON_STROKE_WIDTH`, `MIN_TOUCH_TARGET`), `typography.ts` (`font`, `FONT_SIZE_BASE`, rôles de texte)
2. **Thème** — `theme.ts` : `buildTheme(colorblindType, textScale)` renvoie `{ colors, fontSize, text, font, radius, shadow, scale }`
3. **Provider** — `ThemeProvider` (monté dans `AppProviders`) lit les réglages d'accessibilité (daltonisme, texte agrandi) ; `useTheme()` pour lire le thème
4. **Styles** — `useStyles(buildStyles)` ou `makeStyles((t) => ({ ... }))` (`make-styles.ts`), cache par factory et par thème
5. **Texte** — `AppText variant="display | title | headline | body | secondary | caption"` porte la typographie
6. **Primitives** — `Row`, `Cluster`, `Stack` (`components/layout/primitives.tsx`) et `components/ui/` (ci-dessous)

## Échelles (une seule source de vérité)

| Échelle | Valeurs |
|---------|---------|
| `spacing` (grille 4) | `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `9`=36, `10`=40, `12`=48, `16`=64, `24`=96 — demi-pas `0.5`, `1.5`, `2.5`, `3.5` réservés aux contrôles denses |
| `radius` | `sm` 8 (pastilles), `md` 12 (boutons, champs), `lg` 16 (cartes, sections), `xl` 20, `2xl` 24 (sheets), `full` |
| `iconSize` | `2xs` 12, `xs` 14, `sm` 16, `md` **20 (contenu)**, `lg` **24 (header, navigation)**, `xl` 32, `2xl` 40, `3xl` 48 |
| `elevation` | `xs`, `sm`, `md`, `lg`, `sheetTop`, `contentSheetTop` — très douces ; une carte n'a pas d'ombre, elle a un trait `c.cardBorder` |

- Icônes `lucide-react-native` : `strokeWidth={ICON_STROKE_WIDTH}` (1.75).
- Cibles tactiles : `MIN_TOUCH_TARGET` (44 pt) minimum. Si le visuel est plus petit, compléter avec `hitSlop`.

## Typographie

Six rôles (`Theme.text.*`, `AppText variant`) :

| Rôle | Taille | Police | Usage |
|------|--------|--------|-------|
| `display` | 34 | Raleway bold | chiffre ou titre héros, un par écran au plus |
| `title` | 26 | Raleway bold | titre d'écran |
| `headline` | 18 | Raleway semi-bold | titre de section, carte, sheet, état vide |
| `body` | 16 | système | contenu courant |
| `secondary` | 15 | système, gris | description, sous-titre |
| `caption` | 14 | système, gris | métadonnées, aide de champ |

- Les tailles suivent le réglage « Texte agrandi » (`Theme.fontSize` / `Theme.text` déjà mis à l'échelle).
- `fontSize` reste disponible pour les cas que les rôles ne couvrent pas (pastilles `2xs` 12 px).
- Ne jamais combiner `fontFamily` Raleway et `fontWeight` (Android retombe sur la police système).
- Aucune troncature involontaire : pas de `numberOfLines` sur un libellé, un titre ou une valeur ; laisser le texte revenir à la ligne (`flexShrink: 1` + `minWidth: 0`).

## Couleurs

- Fond d'app : `c.background` (sable `#F7F6F3`). Cartes et barres : `c.surface` (blanc). Surface neutre en retrait (piste de segments, puits d'icône, squelettes) : `c.surfaceAlt`.
- Traits : `c.cardBorder` (cartes), `c.borderLight` (séparateurs internes), `c.border` (contours de champs et boutons `outline`).
- **Turquoise (`c.primary*`) réservé** aux actions, à la sélection, à la navigation active et à la progression — jamais décoratif.
- Aucune couleur hex / `rgb()` / `rgba()` hors `src/theme/` (règle ESLint `oneandlab/no-raw-colors`). Transparence : `hexToRgba(c.primary, 0.12)`.
- Hors composant (options de navigation, helpers) : recevoir `c: AppColors` ou `Theme` en paramètre — il n'existe pas d'état global de thème.

## Primitives UX (`components/ui/`)

| Besoin | Composant |
|--------|-----------|
| Action | `Button` (`primary` une fois par écran, `secondary`, `outline`, `ghost`, `muted`, `destructive`, `dangerOutline` ; tailles `sm` 44, `md` 48, `lg` 52) ; icône seule : `IconActionButton` |
| Groupe de contenu | `Card` (trait discret, sans ombre ; `padding="none"` pour des rangées pleine largeur) |
| Menus, réglages, action isolée en rangée | `SettingsSection` + `SettingsRow` (description, valeur, badge, `trailing` pour un interrupteur) ; mise en page commune : `ListRowShell` |
| Liste issue d'une requête | `QueryFlatList` / `InfiniteQueryFlatList` : squelette au 1er chargement, `ErrorState` + « Réessayer » si l'échec survient sans cache |
| Échec de chargement hors liste | `ErrorState error={q.error} onRetry={q.refetch}` — jamais un état vide trompeur ni `error.message` brut |
| Rien à afficher | `EmptyState` (voir ci-dessous) |
| Sheet | `SheetModal` (titre `headline`, sous-titre `secondary`, retour Android et clavier gérés) |
| Onglets / modes | `FullWidthSegmentBar` |
| Saisie | `Input`, `PasswordInput`, `Textarea`, `SelectField` — styles communs dans `field-styles.ts` |
| Action destructrice ou irréversible | `ConfirmSheet` |
| Action appliquée tout de suite mais annulable | `useToast().showUndo('Passage marqué effectué', annuler)` |
| Statut de RDV | `StatusBadge` : toujours un libellé, jamais une couleur seule |
| Chargement | `Skeleton`, `SkeletonGroup`, presets `skeleton-presets.tsx` |

### EmptyState

```tsx
<EmptyState
  illustration="appointments"          // clé de ILLUSTRATIONS (src/constants/illustrations.ts)
  title="Aucun rendez-vous"            // titre court
  description="Vos rendez-vous à venir apparaîtront ici." // une phrase au plus
  actionLabel="Prendre rendez-vous"    // une action, si elle existe
  onAction={openBooking}
/>
```

- `illustration?: IllustrationKey` est prioritaire sur `Icon?: LucideIcon` (puits neutre). Pas d'emoji, pas de `require` direct.
- Toutes les illustrations passent par la map unique `ILLUSTRATIONS` de `src/constants/illustrations.ts`.

- Animations : Reanimated respecte le réglage système « Réduire les animations » par défaut (`ReduceMotion.System`) — ne jamais forcer `ReduceMotion.Never`. Pour le reste (`scrollTo({ animated })`, carrousels), lire `useReducedMotion()` de `react-native-reanimated`.

## Factory

```tsx
import { AppText, radius, spacing, useStyles, type Theme } from '@/theme';

export function MyScreen() {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.card}>
      <AppText variant="headline">Titre</AppText>
    </View>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    card: {
      flexDirection: 'row',
      gap: spacing[3],
      padding: spacing[4],
      borderRadius: radius.lg,
      backgroundColor: c.surface,
    },
    meta: { ...text.caption, color: c.textTertiary },
  } as const;
}
```

- La factory est définie **hors** du composant et renvoie des objets simples (`useStyles` appelle `StyleSheet.create`).
- Variantes : deux factories nommées (`buildCompactStyles`, `buildDefaultStyles`) plutôt qu'une lambda recréée à chaque rendu.
- Couleurs inline en JSX (icônes) : `useAppColors()` ou `useTheme().colors`.

## Layout (React Native / Yoga)

`flexDirection: 'row'` est autorisé. Garde-fous utiles :

| Rôle | Style |
|------|-------|
| Colonne de texte dans une row | `flex: 1` + `minWidth: 0` |
| Slot fixe (icône, bouton) | `flexShrink: 0` |
| Texte en row | `flexShrink: 1` ; `numberOfLines` seulement pour un aperçu volontaire (extrait de message) |

`npm run lint:layout` affiche un rapport indicatif (non bloquant) des `flex` sans `minWidth: 0`.

## Vérification (CI)

```bash
npm run verify -w @oneandlab/mobile
# équivalent : npm run typecheck && npm run lint
```

- ESLint : `oneandlab/no-raw-colors` (error), `no-explicit-any` (error), `react-hooks/rules-of-hooks` (error).
