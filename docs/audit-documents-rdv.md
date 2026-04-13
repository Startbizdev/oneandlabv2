# Audit : Documents médicaux et rendez-vous

**Date :** 2 mars 2025  
**Périmètre :** Espace patient (/rendez-vous, /profile), espace admin (prise RDV, détail RDV), espace pro santé (prise RDV, détail RDV)

---

## 1. Résumé exécutif

L’audit identifie **5 problèmes majeurs** et **2 points d’attention** concernant la gestion des documents (carte vitale, mutuelle, autres assurances, ordonnance) dans les flux de rendez-vous.

---

## 2. Espace patient

### 2.1 Page `/rendez-vous/nouveau` (création RDV)

| Élément | Statut | Détail |
|--------|--------|--------|
| **LabForm / NursingForm** | ✅ | Chargent les documents du profil via `loadProfileDocuments()` → GET `/patient-documents` |
| **Documents pré-remplis** | ✅ | Pour "Pour moi-même" : carte vitale, mutuelle, autres assurances sont chargés et réutilisés |
| **Ordonnance** | ✅ | Non persistée dans le profil (comportement attendu) |
| **Proches** | ⚠️ | Pour "Pour un proche" : `loadProfileDocuments` n’est pas appelé (`props.relative`). Les documents du patient principal ne sont pas proposés pour le proche. Les proches n’ont pas de `patient_documents` dédiés. |
| **useAppointments** | ✅ | Gère les documents du profil (`medical_document_id`, `isNew: false`) via `/medical-documents/copy` et les nouveaux fichiers via POST `/medical-documents` |
| **Sauvegarde patient_documents** | ✅ | Le backend `medical-documents/index.php` enregistre dans `patient_documents` quand le **patient** upload (carte_vitale, carte_mutuelle, autres_assurances) |

**Conclusion patient /rendez-vous :** Le flux fonctionne pour "Pour moi-même". Pour un proche, les documents doivent être re-saisis à chaque RDV (pas de stockage par proche).

---

### 2.2 Page `/profile` (patient)

| Élément | Statut | Détail |
|--------|--------|--------|
| **patient/profile/index.vue** | ✅ | Charge via GET `/patient-documents`, upload via POST `/patient-documents/upload` |
| **profile/index.vue (admin)** | ✅ | Charge avec `?user_id=` pour l’admin, upload avec `user_id` |
| **Persistance** | ✅ | Les documents sont bien enregistrés dans `patient_documents` |

---

## 3. Espace admin

### 3.1 Prise de RDV (`/admin/appointments/new`)

| Élément | Statut | Détail |
|--------|--------|--------|
| **AppointmentForm** | ✅ | Utilise `loadPatientDocuments(patientId)` → GET `/patient-documents?user_id=xxx` (autorisé pour super_admin) |
| **Affichage documents existants** | ✅ | `patientDocuments` affiche les documents du patient (carte vitale, mutuelle, etc.) |
| **Création RDV** | ✅ | `copyPatientDocumentsToAppointment()` copie les documents du profil vers le RDV via `/medical-documents/copy` |
| **Upload nouveau fichier** | ❌ **BUG** | Quand l’admin upload un **nouveau** fichier (carte vitale, mutuelle, autres assurances) via `uploadFormFilesToAppointment` → POST `/medical-documents`, le backend **ne sauvegarde pas** dans `patient_documents`. Condition actuelle : `$appointment['patient_id'] === $user['user_id']` (seul le patient déclenche la sauvegarde). |

**Impact :** Si l’admin crée un RDV pour un patient et upload des documents, ces documents ne sont pas enregistrés dans le profil patient. Lors d’un prochain RDV pour le même patient, `loadPatientDocuments` retourne vide et l’admin doit ré-uploader les documents.

---

### 3.2 Détail RDV (`/admin/appointments/[id]`)

| Élément | Statut | Détail |
|--------|--------|--------|
| **AppointmentDetailPage** | ✅ | Slot `documentsCard` fourni |
| **Chargement documents** | ✅ | GET `/medical-documents?appointment_id=xxx` renvoie les documents du RDV + documents du profil patient (`patient_profile`) |
| **Affichage** | ✅ | Liste des documents avec badge "Compte patient" pour les docs du profil |
| **Upload** | ✅ | L’admin peut ajouter des documents (même problème de non-sauvegarde dans `patient_documents` que ci-dessus) |

---

## 4. Espace pro santé

### 4.1 Prise de RDV (`/pro/appointments/new`)

| Élément | Statut | Détail |
|--------|--------|--------|
| **AppointmentForm** | ✅ | `loadPatientDocuments` avec `?user_id=` (autorisé pour pro sur patients créés par lui) |
| **uploadPatientDocumentToProfile** | ✅ | Quand le pro remplace un document (PATIENT_DOC_TYPES), upload vers `/patient-documents/upload` → enregistrement dans `patient_documents` |
| **Upload nouveau fichier** | ❌ **BUG** | Même problème que l’admin : upload vers `/medical-documents` sans sauvegarde dans `patient_documents` |

---

### 4.2 Détail RDV (`/pro/appointments/[id]`)

| Élément | Statut | Détail |
|--------|--------|--------|
| **Slot documentsCard** | ❌ **BUG** | La page pro **ne fournit pas** le slot `documentsCard` à `AppointmentDetailPage`. La section "Documents médicaux" n’est **jamais affichée** pour le pro. |

**Impact :** Le pro ne voit pas les documents du RDV dans la page de détail.

---

### 4.3 Lab, Nurse, Subaccount, Préleveur

| Rôle | Création RDV | Détail RDV |
|------|--------------|------------|
| **Lab** | ❌ Pas de page de création | ✅ Slot `documentsCard` fourni |
| **Nurse** | ❌ Pas de page de création | ✅ Slot `documentsCard` fourni |
| **Subaccount** | ❌ Pas de page de création | ✅ Slot `documentsCard` fourni |
| **Préleveur** | ❌ Pas de page de création | ✅ Slot `documentsCard` fourni |

---

## 5. Backend

### 5.1 API `patient-documents` (GET)

| Rôle | Accès | Paramètre |
|------|-------|-----------|
| patient | ✅ Ses documents | — |
| super_admin | ✅ Documents d’un patient | `?user_id=xxx` obligatoire |
| pro | ✅ Patients créés par lui | `?user_id=xxx` obligatoire |
| lab, nurse, subaccount, preleveur | ❌ 403 | — |

**Note :** Lab, nurse, subaccount n’ont pas de page de création de RDV, donc pas d’appel à `loadPatientDocuments`. Pas de blocage fonctionnel.

---

### 5.2 API `patient-documents/upload` (POST)

| Rôle | Accès | Paramètre |
|------|-------|-----------|
| patient | ✅ Son profil | — |
| super_admin | ✅ Pour un patient | `user_id` obligatoire |
| pro | ✅ Pour un patient créé par lui | `user_id` obligatoire |
| lab, nurse, subaccount | ❌ 403 | — |

---

### 5.3 API `medical-documents` (POST)

| Comportement | Détail |
|--------------|--------|
| Enregistrement dans `medical_documents` | ✅ Toujours |
| Enregistrement dans `patient_documents` | ⚠️ **Uniquement si** `$appointment['patient_id'] === $user['user_id']` (patient qui upload) **et** type = carte_vitale, carte_mutuelle, autres_assurances |

**Problème :** Quand admin ou pro upload un document de profil pour un patient, il n’est pas enregistré dans `patient_documents`.

---

### 5.4 API `medical-documents` (GET)

| Comportement | Détail |
|--------------|--------|
| Documents du RDV | ✅ `appointment_id = xxx` |
| Documents du profil patient | ✅ Pour lab, subaccount, nurse, pro, super_admin : jointure avec `patient_documents` pour compléter la liste |

---

## 6. Liste des problèmes identifiés

### P1 – Documents uploadés par admin/pro non persistés dans le profil patient (Backend)

**Fichier :** `backend/api/medical-documents/index.php` (lignes 348–384)

**Problème :** La sauvegarde dans `patient_documents` n’est faite que si c’est le patient qui upload (`$appointment['patient_id'] === $user['user_id']`). Quand admin ou pro upload carte vitale, mutuelle ou autres assurances, ces documents ne sont pas enregistrés dans le profil patient.

**Correction proposée :** Pour les types `carte_vitale`, `carte_mutuelle`, `autres_assurances`, enregistrer dans `patient_documents` pour `$appointment['patient_id']` quel que soit l’utilisateur qui upload (patient, admin ou pro), sous réserve des droits d’accès au RDV.

---

### P2 – Pro ne voit pas les documents dans le détail RDV (Frontend)

**Fichier :** `frontend/pages/pro/appointments/[id].vue`

**Problème :** La page ne fournit pas le slot `documentsCard` à `AppointmentDetailPage`. La section "Documents médicaux" n’est jamais affichée.

**Correction proposée :** Ajouter un slot `documentsCard` similaire à celui de `admin/appointments/[id]/index.vue` ou `nurse/appointments/[id].vue`.

---

### P3 – Proches : documents non réutilisables (Comportement / design)

**Contexte :** Lors d’un RDV "Pour un proche", les documents du patient principal ne sont pas proposés. Les proches n’ont pas de `patient_documents` dédiés.

**Options :**
- Conserver le comportement actuel (documents à fournir à chaque RDV pour un proche).
- Ou étendre le modèle pour associer des documents aux proches (nouvelle table, migrations, etc.).

---

### P4 – Logs de debug résiduels (Backend)

**Fichiers :** `backend/api/medical-documents/index.php`, `backend/api/medical-documents/copy.php`

**Problème :** Présence de blocs `#region agent log` et chemins de log en dur (`/Users/alessandro/Documents/onev2/.cursor/debug.log`).

**Correction proposée :** Supprimer ces logs ou les remplacer par un système de logging configurable.

---

### P5 – Variable non définie dans le log (Backend)

**Fichier :** `backend/api/medical-documents/index.php` (ligne 289)

**Problème :** La variable `$projectRoot` est utilisée dans le bloc de log mais n’est pas définie dans ce fichier, ce qui peut provoquer un avertissement PHP.

---

## 7. Synthèse des corrections (appliquées le 02/03/2025)

| Priorité | Problème | Statut |
|----------|----------|------------|
| 1 | P1 – Persister les documents admin/pro dans le profil patient | ✅ Corrigé |
| 2 | P2 – Afficher les documents pour le pro | ✅ Corrigé |
| 3 | P4 – Nettoyer les logs de debug | ✅ Corrigé |
| 4 | P5 – Variable projectRoot / logs – Corriger l’écriture du fichier chiffré | ✅ Corrigé |

---

## 8. Flux documentaires (schéma)

```
PATIENT crée RDV (/rendez-vous/nouveau)
  → LabForm/NursingForm charge /patient-documents (pour moi-même)
  → Soumission : form_data.files avec medical_document_id (profil) ou File (nouveau)
  → useAppointments : /medical-documents/copy pour profil, POST /medical-documents pour nouveau
  → Backend : medical_documents + patient_documents (si patient upload)

ADMIN crée RDV (/admin/appointments/new)
  → loadPatientDocuments(?user_id=) → patient_documents
  → copyPatientDocumentsToAppointment() pour docs existants
  → uploadFormFilesToAppointment() pour nouveaux → /medical-documents
  → BUG : nouveaux docs pas sauvegardés dans patient_documents

PRO crée RDV (/pro/appointments/new)
  → Même flux que admin
  → uploadPatientDocumentToProfile() pour remplacement → /patient-documents/upload ✅
  → uploadFormFilesToAppointment() pour nouveaux → /medical-documents → BUG

DÉTAIL RDV
  → GET /medical-documents?appointment_id= → docs RDV + patient_profile
  → Admin, lab, nurse, subaccount : slot documentsCard ✅
  → Pro : pas de slot documentsCard ❌
```
