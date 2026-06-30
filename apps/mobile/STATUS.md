# Android NativeTabs — statut scroll / layout

> Dernière mise à jour : alignement global sur le pattern **ScrollView + `buildTabSceneScrollConfig`** (validé sur liste RDV infirmier).

## Cause racine

Sur **Android + NativeTabs + header glass flottant**, `FlashList` / `FlatList` sans `ScrollView` parent produisent un **écran blanc** (viewport scroll à 0).  
**Ne pas utiliser** : hauteur explicite via `onLayout`, `AppRefreshControl` seul dans un wrapper partagé sans reprendre la structure exacte.

## Pattern de référence

```tsx
<View style={{ flex: 1, minWidth: 0, backgroundColor }}>
  <ScrollView
    style={{ flex: 1, minWidth: 0 }}
    collapsable={false}
    keyboardShouldPersistTaps="handled"
    nestedScrollEnabled={Platform.OS === 'android'}
    {...spreadTabSceneScrollProps(scrollConfig)}
    contentContainerStyle={scrollConfig.contentContainerStyle}
    refreshControl={<RefreshControl tintColor={primary} progressViewOffset={...} />}
  >
    {/* contenu .map() ou sections */}
  </ScrollView>
</View>
```

Composant partagé : `TabSceneScrollView` (`src/components/navigation/TabSceneScrollView.tsx`) — **copie exacte** de ce pattern (`RefreshControl`, pas `AppRefreshControl`).

Sur Android, `QueryFlatList` / `InfiniteQueryFlatList` basculent automatiquement sur `TabSceneScrollView` + `TabSceneMappedListBody`.

---

## Onglets par rôle

| Écran | Route / rôle | Mécanisme | Android |
|-------|----------------|-----------|---------|
| Liste RDV infirmier | `(nurse)/(tabs)/appointments` | ScrollView inline (référence, **ne pas modifier**) | ✅ Validé |
| Liste patients | `(nurse\|pro)/(tabs)/patients` | `TabSceneScrollView` | ✅ Aligné |
| Demandes infirmier | `(nurse)/(tabs)/demandes` | `QueryFlatList` → Android ScrollView | ✅ Aligné |
| Calendrier | `(nurse\|pro\|preleveur)/(tabs)/calendar` | ScrollView + insets + `nestedScrollEnabled` | ✅ Aligné |
| Plus / menu | `(tabs)/more` | `TabSceneScrollView` | ✅ Aligné |
| Liste RDV pro | `(pro)/(tabs)/appointments` | `InfiniteQueryFlatList` via `RoleFilteredAppointmentsListScreen` | ✅ Aligné |
| Liste RDV patient | `(patient)/(tabs)/appointments` | `InfiniteQueryFlatList` | ✅ Aligné |
| Liste RDV préleveur | `(preleveur)/(tabs)/index` | `InfiniteQueryFlatList` via `PreleveurAppointmentsListScreen` | ✅ Aligné |
| Tournée | `(preleveur)/(tabs)/tournee` | `QueryFlatList` | ✅ Aligné |
| Proches patient | `(patient)/(tabs)/relatives` | `QueryFlatList` | ✅ Aligné |
| Avis infirmier | `(nurse)/reviews` | `QueryFlatList` | ✅ Aligné |
| Avis patient | `(patient)/reviews` | `QueryFlatList` | ✅ Aligné |

## Stack (détail RDV, profil, etc.)

| Écran | Rôle | Mécanisme | Android |
|-------|------|-----------|---------|
| Détail RDV staff | nurse / pro / preleveur | `StackScrollView` + `useStackScrollConfig` | ✅ Aligné |
| Détail RDV patient | patient | `StackKeyboardScrollView` + insets stack | ✅ Aligné |
| Discussion photo soin | staff | `KeyboardScrollView` stack | ✅ ScrollView |
| Fiche patient staff | nurse / pro | `ScrollView` stack | ✅ ScrollView |
| Historique RDV patient | patient stack | `QueryFlatList` (stack, pas onglet) | ⚠️ iOS FlatList — stack généralement OK |

## Hors scope NativeTabs (OK en FlashList)

| Écran | Raison |
|-------|--------|
| Cary AI chat | `FlashList` chat inversé — pas scène onglet |
| Sheets prescriptions (sélection patient/RDV) | Modal / bottom sheet |
| PrescriptionWorkspace | Stack + sections |

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `TabSceneScrollView.tsx` | ScrollView onglet partagé |
| `StackScrollView.tsx` | ScrollView stack (détail RDV staff) |
| `StackKeyboardScrollView.tsx` | ScrollView stack + clavier (détail patient) |
| `tab-scene-mapped-list-body.tsx` | `.map()` remplaçant FlashList sur Android |
| `QueryFlatList.tsx` | Branche Android → ScrollView |
| `InfiniteQueryFlatList.tsx` | Branche Android → ScrollView |
| `liquid-glass-header-inset.tsx` | `buildTabSceneScrollConfig`, insets header/tab bar |
| `NurseAppointmentsListScreen.tsx` | **Référence manuelle** — ne pas remplacer par wrapper sans test |

## Test manuel Android

1. `(nurse)/(tabs)/appointments` — recherche + cartes RDV
2. `(nurse)/(tabs)/patients` — liste patients
3. `(nurse)/(tabs)/demandes` — cartes demandes
4. `(pro)/(tabs)/appointments` — liste pro
5. `(preleveur)/(tabs)/tournee` — arrêts tournée
6. `(patient)/(tabs)/appointments` — liste patient
7. `(nurse)/appointment/[id]` — détail RDV (segments infos/docs/échange)

## iOS

Inchangé : `FlashList` / `FlatList` avec `style={{ flex: 1 }}` dans les composants listes.
