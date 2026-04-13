# Audit : 577 patients legacy → 378 sur la nouvelle plateforme

**Date :** 20 mars 2026  
**Méthode :** Connexion SSH réelle sur `oneandlab-vps`, exécution de scripts d'audit sur MongoDB legacy

---

## 1. Résultats de l'audit (serveur legacy)

### 1.1 Comptages MongoDB (collection `patients`)

| Métrique | Valeur |
|----------|--------|
| **Total patients** | 577 |
| Patients avec `professionalId` (créés par pro/infirmier) | 245 |
| Patients avec `userId` (compte User) | 17 |
| Patients sans `userId` | 560 |

### 1.2 Doublons par `email_search_hash` (MongoDB)

| Métrique | Valeur |
|----------|--------|
| Groupes avec même `email_search_hash` | **0** |
| Patients en excédent | **0** |
| Patients sans `email_search_hash` | **568** |

**Conclusion :** Le legacy n’a **pas** de contrainte d’unicité d’email pour la majorité des patients (568 n’ont pas de hash). Les 9 qui en ont un sont uniques.

### 1.3 Doublons par email déchiffré (SHA256, comme la migration)

| Métrique | Valeur |
|----------|--------|
| **Emails uniques** (après déchiffrement) | 413 |
| Groupes avec même email | 39 |
| **Patients en excédent** (fusionnés par la migration) | **164** |
| 577 - 164 | **413** profils uniques attendus |

**Exemple de doublons :**
- `carlastartbiz@gmail.com` : **4 patients** (tous `professionalId: null`)
- `shany.pastre@gmail.com` : **3 patients** (dont 1 avec `professionalId`)

---

## 2. Cause racine : 577 → 378

### 2.1 Fusion par email (dédoublonnage)

La migration utilise `email_hash = SHA256(email_normalisé)` pour détecter les doublons. Si un profil avec le même hash existe déjà, le patient legacy est fusionné dans ce profil (pas de nouveau profil créé).

- **577** patients dans le legacy
- **164** patients partagent un email avec au moins un autre patient
- **413** emails uniques → **413 profils** attendus après migration

### 2.2 Écart 413 vs 378 (~35)

L’écart d’environ 35 entre 413 et 378 peut venir de :

1. **Profils de setup** : `setup-database.php` crée des patients de test (ex. `patient@oneandlab.fr`). Lors de la migration, un patient legacy avec le même email est fusionné dans ce profil existant.
2. **Périmètre d’export** : l’export utilisé pour la migration peut ne pas contenir exactement les mêmes 577 patients.
3. **Erreurs de migration** : patients dont le déchiffrement ou l’insertion a échoué.

---

## 3. Logique legacy : comment les pros/infirmiers voient leurs patients

### 3.1 Route API

```
GET /api/pro/patients  →  patientController.getPatientsForProfessional
```

### 3.2 Requête MongoDB

```javascript
Patient.find({ professionalId: req.user.roleDetailsId })
```

Les pros/infirmiers voient uniquement les patients dont `professionalId` correspond à leur ID.

### 3.3 Conséquence pour la migration

- **245** patients ont un `professionalId` dans le legacy.
- Lors de la fusion par email, si le profil existant a `created_by = NULL` et que le patient fusionné a un `professionalId`, le lien pro/infirmier peut être perdu.
- Le script `fix-patient-created-by.php` corrige ce cas en mettant à jour `profiles.created_by` à partir des données legacy.

---

## 4. Logique legacy : laboratoires

### 4.1 Source des patients

- `lab.patients` : tableau d’IDs de patients associés au labo
- Patients ayant des RDV avec ce labo mais pas encore dans `lab.patients` → ajoutés automatiquement

### 4.2 Route

```
GET /api/labo-admin/patients  →  laboAdminController.getLabPatients
```

---

## 5. Actions recommandées

1. **Exécuter `fix-patient-created-by.php`** pour restaurer `created_by` sur les patients fusionnés ayant un `professionalId` dans le legacy.
2. **Vérifier les 35 profils manquants** (413 vs 378) : comparer les profils créés par `setup-database.php` et les patients legacy fusionnés.
3. **Conserver le script d’audit** `audit-patients-legacy.js` pour les prochaines migrations ou vérifications.

---

## 6. Fichiers d’audit

- `scripts/migration/audit-patients-legacy.js` : script exécuté sur le VPS legacy
- Commande : `cd /var/www/onl/backend && node scripts/migration/audit-patients-legacy.js`
