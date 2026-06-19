# Cary IA Hub — audit UX (Phase 1)

Audit du 19 juin 2026 — corrections appliquées sur `features/ai-hub`.

---

## Problèmes constatés

| # | Symptôme | Cause |
|---|----------|--------|
| 1 | Texte assistant trop gros | `fontSize.lg` (20 px) + `CaryMarkdown` qui imposait encore `lg` |
| 2 | Disclaimer par-dessus le fil de chat | Footer en `position: absolute` sans réserve de scroll suffisante ; padding liste = hauteur compositeur **sans** disclaimer |
| 3 | Marges incohérentes | Double padding horizontal (footer + compositeur) ; pas de fond opaque sur le bloc bas |
| 4 | Disclaimer dupliqué | Affiché dans le footer **et** sur la carte récap RDV |
| 5 | Bulles trop massives | `padding` et `radius.xl` généreux pour un chat dense |

---

## Corrections

### Typographie
- Assistant Cary : **16 px** (`base`), regular
- Messages utilisateur : **15 px** (`sm`)
- Disclaimer : **12 px** (`2xs`), 2 lignes max
- « Cary réfléchit… » : **15 px**, italic

### Footer (disclaimer + saisie)
- Bloc unique **opaque** (`background`) avec bordure haute
- Disclaimer dans une bande `surfaceAlt` **au-dessus** du champ (pas flottant sur le texte)
- Masqué quand le clavier est ouvert (plus d’espace pour taper)
- Constante `PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER` pour le `paddingBottom` de la liste

### Liste / scroll
- `extraBottom` = hauteur footer **avec** disclaimer + marge
- Fond `background` sur écran + liste (plus de « trou » blanc)

### Carte récap RDV
- Disclaimer légal retiré (reste dans le footer)
- Hint court : « Vérifiez le récap avant de valider. »

---

## Fichiers modifiés

- `PatientAiChatFooter.tsx`
- `PatientAiChatComposer.tsx` (mode `embedded`)
- `CaryAiHubScreen.tsx`
- `CaryMarkdown.tsx`
- `CaryAiBookingRecapCard.tsx`

---

## Checklist recette visuelle

- [ ] Dernier message lisible au-dessus du disclaimer (pas de chevauchement)
- [ ] Taille de texte homogène avec le reste de l’app (RDV, notifications)
- [ ] Chips suggestions alignées H_PADDING
- [ ] Clavier ouvert : disclaimer masqué, compositeur visible
- [ ] Carte récap sans répéter le disclaimer complet
