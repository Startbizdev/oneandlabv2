# Shells de page (`AppPageShell`, `AppPageHeader`)

Aligné sur [UPDATE/UI-UX-RENDEZ-VOUS-DASHBOARD-ET-PATIENT.md](../../UPDATE/UI-UX-RENDEZ-VOUS-DASHBOARD-ET-PATIENT.md) §11.2.

## Quand utiliser quoi

| Composant | Rôle |
|-----------|------|
| **AppPageShell** | Conteneur `max-w-*` + padding horizontal optionnel pour le corps de page. |
| **AppPageHeader** | En-tête de page : titre, description optionnelle, actions, **slot `toolbar`** (filtres uniques §4.2). Encapsule en interne `TitleDashboard` (ne pas l’utiliser seul sur les pages dashboard). |
| **Layouts** | [`layouts/dashboard.vue`](../../layouts/dashboard.vue) : sidebar + zone scroll. [`layouts/patient.vue`](../../layouts/patient.vue) : header global patient + `<main>` scroll principal. Ne pas dupliquer une deuxième « barre page » inutile sur mobile (§4.1). |

**Convention** : les routes sous `pages/` composent **`AppPageShell`** + **`AppPageHeader`** ; liste / calendrier en dessous avec `hide-header` ou `hide-header-actions` pour éviter les titres doublons.
