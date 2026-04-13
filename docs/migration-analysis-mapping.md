# Rapport d'analyse de migration — Legacy → Nouvelle plateforme

**Date :** 10 mars 2026  
**Auteur :** Analyse automatisée  
**Contexte :** Migration de données HDS entre plateforme legacy (Node.js/MongoDB) et nouvelle plateforme (PHP/MySQL)

---

## 1. Vue d'ensemble

### 1.1 Plateforme legacy

| Caractéristique | Valeur |
|-----------------|--------|
| **Stack** | Node.js, Express, MongoDB, Mongoose |
| **Emplacement** | `/var/www/onl` (VPS 51.68.103.85) |
| **Base de données** | MongoDB (collections) |
| **Identifiants** | ObjectId (24 caractères hex) |
| **Chiffrement** | AES-256-GCM, format `iv:authTag:encryptedData` (hex) |
| **Clé** | `ENCRYPTION_KEY` (32 bytes hex), `HMAC_KEY` (recherche aveugle) |

### 1.2 Nouvelle plateforme (cible)

| Caractéristique | Valeur |
|-----------------|--------|
| **Stack** | PHP, Nuxt/Vue (frontend), MySQL |
| **Emplacement** | Workspace `onev2` |
| **Base de données** | MySQL (InnoDB) |
| **Identifiants** | UUID v4 (CHAR(36)) |
| **Chiffrement** | AES-256-GCM avec enveloppe KEK/DEK |
| **Format** | Colonnes `*_encrypted` + `*_dek` séparées |

### 1.3 Différences architecturales majeures

- **Legacy** : Modèles séparés (Patient, User, Lab, Professional, Phlebotomist, Relative) avec `User` central et `roleDetailsId`/`roleDetailsModel` pour polymorphisme.
- **Cible** : Table unifiée `profiles` avec `role` ENUM ; pas de tables Lab/Professional/Phlebotomist distinctes — tout est dans `profiles` + tables de liaison.
- **Legacy** : Fichiers chiffrés stockés dans `uploads/encrypted/` avec extension `.enc`.
- **Cible** : `medical_documents` + `patient_documents` ; chemins et option `encrypted`/`file_dek`.

---

## 1.4 Périmètre de migration et échantillons (extrait SSH — 10 mars 2026)

Données extraites du VPS legacy via SSH. Périmètre ciblé : **Laboratoire Labio** (avec RDV assignés + préleveurs), **Les Pros Santé** (pros), **Infirmiers / IPA** (nurses), **Patients**, **Relatives**, **RDV**.

### Totaux legacy

| Entité | Nombre | Rôle cible |
|--------|--------|------------|
| Labs | 5 611 | `lab` |
| Professionals | 131 | `nurse` ou `pro` |
| Users | 4 965 | selon roleDetailsModel |
| Patients | 577 | `patient` |
| Relatives | 73 | `patient_relatives` |
| Appointments | 912 | `appointments` |

### Répartition Users par rôle legacy

| Rôle legacy | Nombre | Mapping cible |
|-------------|--------|---------------|
| lab_admin | 4 484 | `lab` |
| patient | 337 | `patient` |
| professional | 130 | `nurse` ou `pro` (selon specialty) |
| phlebotomist | 11 | `preleveur` |
| superadmin | 3 | `super_admin` |

### Périmètre Labio (laboratoires avec RDV assignés)

*Correction : les 13 labs « Labio » incluaient des établissements sans activité. Le périmètre cible = **Labio ayant des RDV assignés**.*

| Critère | Valeur | Statut |
|---------|--------|--------|
| Labs Labio avec RDV assignés | **3** | OK |
| **Laboratoire LABIO** (principal) | `689233af3b78f462d126e06a` — Plan-de-Cuques, lab@oneandlab.fr — **871 RDV** | OK |
| Laboratoire Labio 5 Avenues | 1 RDV | OK |
| LABORATORY ROTONDE - LABIO | Plan-de-Cuques, 1 RDV | OK |
| **Préleveurs du Labio principal** | **8** | OK |

#### Préleveurs du Laboratoire LABIO (689233af3b78f462d126e06a)

| Nom | Email | Téléphone |
|-----|-------|-----------|
| Centraix Labo | centraix@labio.fr | 04 42 59 17 00 |
| Eguilles labo | eguilles@labio.fr | 0442925800 |
| zenou joseph | zenou.joseph13@gmail.com | 0621542927 |
| Sarah Touloum | sarahtouloum13@gmail.com | +33 7 88 04 14 25 |
| Puyricard Labo | puyricard@labio.fr | +33442921905 |
| Isabelle Kaprielian | isabellekaprielian@orange.fr | 0675729138 |
| Secretariat Rotonde | ikaprielian@labio.fr | 0491075460 |
| Sarah Touloum | sarahtouloum13@gmail.com | 0788041425 |

*Note : 2 entrées « Sarah Touloum » possibles (doublon à vérifier).*

### Périmètre Les Pros Santé (professionnels santé → role `pro`)

| Critère | Valeur | Statut |
|---------|--------|--------|
| Pros non-infirmiers (médecins, pharmaciens, psychiatres, etc.) | **27** | OK |
| Échantillon | Marie Martin (medecin), Dr Jacqueline khayat (Médecin généraliste), CARA SANTE (medical_center), ouertani nadia (Pharmacien), Dr. Saada Michaël (Psychiatre), etc. | OK |
| Types | `individual`, `medical_center` | OK |

*Note : Aucun lab nommé « Les Pros Santé » trouvé. Les pros santé = professionnels (médecins, kinés, etc.) → role `pro`.*

### Périmètre Infirmiers / IPA (→ role `nurse`)

| Critère | Valeur | Statut |
|---------|--------|--------|
| Professionals avec specialty Infirmier(e) ou Infirmier(e)IPA | **104** | OK |
| Échantillon | zenou joseph (Infirmier(e)), Jessica ETTEDGUI (Infirmier(e)), loreto pauline (Infirmier(e)IPA), Kaprielian Isabelle (Infirmier(e)), etc. | OK |
| Type | `individual` | OK |

### Tableau récapitulatif — Ce qu’on récupère

| Entité | Filtre / critère | Nb | Rôle cible | Compatible | Notes |
|--------|------------------|-----|------------|------------|-------|
| **Labio (avec RDV)** | Labs Labio ayant des appointments assignés | **3** | `lab` | Oui | Dont 1 principal : 871 RDV |
| **Préleveurs Labio** | Phlebotomists du Labio principal | **8** | `preleveur` | Oui | lab_id → Labio 689233af3b78f462d126e06a |
| Labs (tous) | — | 5 611 | `lab` | Oui | Ou migration complète |
| Pros infirmiers | specialty Infirmier / IPA / IDE | 104 | `nurse` | Oui | Mapping direct |
| Pros autres (médecins, etc.) | specialty ≠ Infirmier | 27 | `pro` | Oui | Mapping direct |
| Patients | — | 577 | `patient` | Oui | Avec déchiffrement |
| Relatives | — | 73 | `patient_relatives` | Oui | Mapping relationship |
| Appointments | — | 912 | `appointments` | Oui | Liens patient_id, relative_id, lab_id |
| Phlebotomists (tous) | — | 11 (users) | `preleveur` | Oui | Via lab_id ; 8 pour Labio |

### Échantillon Relatives

| firstName | lastName | relationship | patientId |
|-----------|-----------|--------------|-----------|
| (déchiffré) | (déchiffré) | parent, enfant, conjoint, frere, soeur, autre | ObjectId |

*73 proches au total. Mapping `relationship` legacy → `relationship_type` cible : parent→parent, enfant→child, conjoint→spouse, frere/soeur→sibling, autre→other.*

### Statut global

| Périmètre | Statut | Action |
|-----------|--------|--------|
| Labio (3 labs avec RDV, 8 préleveurs) | OK | Migration prête |
| Infirmiers (104) | OK | Mapping nurse validé |
| Pros santé (27) | OK | Mapping pro validé |
| Patients (577) | OK | Déchiffrement + rechiffrement |
| Relatives (73) | OK | Mapping relationship_type |
| RDV (912) | OK | Liens à recalculer (ObjectId→UUID) |
| Fichiers .enc | À traiter | Décrypt + rechiffrer + medical_documents |

---

## 2. Analyse détaillée de la plateforme legacy

### 2.1 Modèle Patient (`patientModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| name | String | oui | oui | — | Généré depuis firstName+lastName |
| firstName | String | non | oui | — | |
| lastName | String | non | oui | — | |
| email | String | oui | oui | — | email_search_hash pour recherche |
| email_search_hash | String | non | non | — | HMAC SHA256, unique sparse |
| phone | String | non | oui | — | |
| expoPushToken | String | non | non | — | Push notifications |
| notificationSettings | Object | non | non | — | pushEnabled, appointments, messages, results, reminders, promotions |
| address | String | oui | oui | — | |
| addressDetails | String | non | oui | — | |
| floor | String | non | oui | — | |
| accessCode | String | non | oui | — | |
| dateOfBirth | Date | non | oui | — | Validation 0–120 ans |
| gender | String | non | oui | — | enum: male, female, other |
| labs | [ObjectId] | non | — | ref: Lab | |
| professionalId | ObjectId | non | — | ref: Professional | |
| userId | ObjectId | non | — | ref: User | |
| socialSecurityNumber | String | non | oui | — | NSS — très sensible |
| notes | String | non | oui | — | Notes pro/labo |
| notePatient | String | non | oui | — | Notes personnelles |
| createdAt | Date | — | — | — | |
| updatedAt | Date | — | — | — | |

### 2.2 Modèle Laboratory (`labModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| name | String | oui | oui | — | |
| email | String | oui | oui | — | |
| phone | String | oui | oui | — | |
| address | String | oui | oui | — | |
| city | String | oui | oui | — | |
| postalCode | String | oui | oui | — | |
| location | GeoJSON Point | non | non | — | 2dsphere index |
| siretNumber | String | oui | oui | — | |
| responsible | String | oui | oui | — | |
| openingHours | String | non | non | — | Texte |
| schedule | [dayScheduleSchema] | non | non | — | Structuré par jour |
| subscriptionStatus | String | non | non | — | pending, active, suspended |
| stripeCustomerId | String | non | non | — | |
| patients | [ObjectId] | non | — | ref: Patient | |
| averageRating | Number | non | non | — | |
| totalReviews | Number | non | non | — | |
| homeVisitEnabled | Boolean | non | non | — | |
| logo | String | non | non | — | Nom fichier |
| createdAt | Date | — | — | — | |
| updatedAt | Date | — | — | — | |

### 2.3 Modèle Phlebotomist (`phlebotomistModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| name | String | oui | oui | — | |
| email | String | oui | oui | — | unique |
| phone | String | non | oui | — | |
| address | String | non | oui | — | |
| labId | ObjectId | oui | — | ref: Laboratory | |
| status | String | non | non | — | available, unavailable, busy |
| interventionRadiusKm | Number | oui | non | — | 1–50 |
| stats | Object | non | non | — | averageVisitTime, totalVisits, totalVisitTime |
| scheduleRules | [ObjectId] | non | — | ref: RecurringRule | |
| availability | String | non | non | — | |
| defaultScheduleSettings | Object | non | non | — | slotDuration, breakBetweenSlots, maxDailyAppointments |
| currentLocation | GeoJSON | non | non | — | 2dsphere |
| createdAt | Date | — | — | — | |
| updatedAt | Date | — | — | — | |

### 2.4 Modèle Professional (`professionalModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| type | String | oui | non | — | individual, medical_center |
| email | String | oui | oui | — | |
| phone | String | non | oui | — | |
| address | String | non | oui | — | |
| password | String | non | non | — | Hash bcrypt |
| name | String | cond. | oui | — | Si type=individual |
| adeliNumber | String | non | oui | — | |
| specialty | String | non | oui | — | |
| centerName | String | cond. | oui | — | Si type=medical_center |
| siretNumber | String | non | oui | — | |
| responsiblePerson | String | non | oui | — | |
| appointments | [ObjectId] | non | — | ref: Appointment | |
| favoriteLabs | [ObjectId] | non | — | ref: Lab | |
| message | String | non | oui | — | |
| createdAt | Date | — | — | — | |
| updatedAt | Date | — | — | — | |

### 2.5 Modèle User (`userModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| name | String | oui | oui | — | |
| firstName | String | non | oui | — | |
| lastName | String | non | oui | — | |
| email | String | oui | oui | — | |
| email_search_hash | String | non | non | — | unique sparse |
| phone | String | non | oui | — | |
| phoneVerified | Boolean | non | non | — | |
| password | String | oui | non | — | bcrypt |
| role | String | non | non | — | superadmin, admin, lab_admin, professional, phlebotomist, patient, relative |
| roleDetailsId | ObjectId | cond. | — | refPath | Si rôle ≠ superadmin/admin |
| roleDetailsModel | String | cond. | — | — | Laboratory, Phlebotomist, Patient, Professional, Relative |
| accountStatus | String | non | non | — | active, inactive |
| isEmailVerified | Boolean | non | non | — | |
| is2FAEnabled | Boolean | non | non | — | |
| twoFactorSecret | String | non | non | — | |
| resetPasswordToken | String | non | non | — | |
| resetPasswordExpires | Date | non | non | — | |
| createdAt | Date | — | — | — | |
| updatedAt | Date | — | — | — | |
| passwordChangedAt | Date | non | non | — | |

### 2.6 Modèle Relative (`relativeModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| patientId | ObjectId | oui | — | ref: Patient | |
| firstName | String | oui | oui | — | |
| lastName | String | oui | oui | — | |
| name | String | oui | oui | — | Généré |
| relationship | String | oui | non | — | parent, enfant, conjoint, frere, soeur, autre |
| email | String | non | oui | — | |
| phone | String | non | oui | — | |
| address | String | non | oui | — | |
| addressDetails | String | non | oui | — | |
| floor | String | non | oui | — | |
| accessCode | String | non | oui | — | |
| dateOfBirth | Date | oui | oui | — | |
| gender | String | oui | oui | — | male, female, other |
| legalConsent1 | Boolean | oui | non | — | |
| legalConsent2 | Boolean | oui | non | — | |
| createdAt | Date | — | — | — | |
| updatedAt | Date | — | — | — | |

### 2.7 Modèle Appointment (`appointmentModel.js`)

| Champ | Type | Requis | Chiffré | Relations | Notes |
|-------|------|--------|---------|------------|-------|
| patientId | ObjectId | cond. | — | refPath | Sauf isTemporary |
| patientModel | String | oui | non | — | Patient ou Relative |
| isTemporary | Boolean | non | non | — | |
| hasPrescription | String | oui | non | — | |
| prescriptionFile | Object | non | — | — | Fichier chiffré (path, encryptedSize, fileHash) |
| carteVitaleFile | Object | non | — | — | Idem |
| mutuelleFile | Object | non | — | — | Idem |
| attestationFile | Object | non | — | — | Idem |
| analysisResults | Object | non | — | — | Idem |
| location | String | oui | non | — | domicile, laboratoire |
| availability | String | oui | non | — | fullDay, specificSlot |
| timeSlot | String | non | non | — | |
| desiredDate | Date | non | non | — | |
| labId | ObjectId | cond. | — | ref: Laboratory | Si location=laboratoire |
| phlebotomistId | ObjectId | non | — | ref: Phlebotomist | |
| professionalId | ObjectId | non | — | ref: Professional | |
| status | String | non | non | — | pending, confirmed, planned, completed, cancelled, expired |
| reference | String | non | non | — | RDV-XXXXXX unique |
| startTime | Date | non | non | — | |
| endTime | Date | non | non | — | |
| dateTime | Date | oui | non | — | |
| type | String | non | non | — | laboratory, homeVisit |
| address | String | cond. | oui | — | Si homeVisit |
| addressDetails, floor, accessCode | String | non | oui | — | |
| city | String | cond. | non | — | Si homeVisit |
| coordinates | Object | cond. | non | — | lat, lng |
| labQueue | Array | non | non | — | labId, labName, notifiedAt, expiresAt, status |
| relativeId | ObjectId | non | — | ref: Relative | |
| relativeInfo | Object | non | oui | — | Données proche embarquées |
| mainPatientInfo | Object | non | oui | — | Snapshot patient |
| refusedByLabs | [ObjectId] | non | — | — | |
| deletedByLabs | [ObjectId] | non | — | — | |
| notes | String | non | oui | — | |
| createdBy | Object | non | non | — | userId, role, userType |
| bookedBy | ObjectId | non | — | ref: Patient | |
| contactEmail, contactPhone | String | non | oui | — | |
| isForRelative, isRelative | Boolean | non | non | — | |
| failureReason, expiredAt | — | non | non | — | |
| createdAt, updatedAt | Date | — | — | — | |

### 2.8 Chiffrement legacy — format et champs

**Format AES-256-GCM :** `iv:authTag:encryptedData` (hex, séparé par `:`)

- **iv** : 16 bytes (32 hex)
- **authTag** : 16 bytes (32 hex)
- **encryptedData** : ciphertext en hex

**Format composé :** plusieurs valeurs chiffrées séparées par espace (ex. `firstName lastName`).

**Champs sensibles identifiés (decryptionUtils.js) :**

- socialSecurityNumber, phone, email, address, medicalHistory, notes, diagnosis, prescription, prescriptionFile
- name, firstName, lastName, adeliNumber, siretNumber, responsible, centerName, specialty, responsiblePerson, message

**Fichiers chiffrés :**

- Emplacement : `/var/www/onl/backend/uploads/encrypted/` et sous-dossiers (`documents/`)
- Extension : `.enc`
- Métadonnées dans les modèles : `filename`, `path`, `originalname`, `mimetype`, `size`, `encryptedSize`, `fileHash`

---

## 3. Analyse de la plateforme cible (nouvelle)

### 3.1 Table `profiles`

Table unifiée pour tous les utilisateurs (patients, labos, infirmiers, préleveurs, pros, admins).

| Colonne | Type | Requis | Chiffré | Notes |
|---------|------|--------|---------|-------|
| id | CHAR(36) | oui | — | UUID v4 PK |
| role | ENUM | oui | non | super_admin, lab, subaccount, preleveur, nurse, pro, patient |
| email_encrypted | TEXT | oui | oui | |
| email_dek | TEXT | oui | oui | |
| email_hash | VARCHAR(64) | oui | non | SHA256 pour recherche |
| first_name_encrypted | TEXT | oui | oui | |
| first_name_dek | TEXT | oui | oui | |
| last_name_encrypted | TEXT | oui | oui | |
| last_name_dek | TEXT | oui | oui | |
| phone_encrypted | TEXT | non | oui | |
| phone_dek | TEXT | non | oui | |
| address_encrypted | TEXT | non | oui | |
| address_dek | TEXT | non | oui | |
| gender_encrypted | TEXT | non | oui | |
| gender_dek | TEXT | non | oui | |
| birth_date_encrypted | TEXT | non | oui | |
| birth_date_dek | TEXT | non | oui | |
| rpps_encrypted, rpps_dek | TEXT | non | oui | Infirmiers |
| siret_encrypted, siret_dek | TEXT | non | oui | Labos |
| rcp_insurance_encrypted, rcp_insurance_dek | TEXT | non | oui | |
| adeli_encrypted, adeli_dek | TEXT | non | oui | Pros |
| company_name_encrypted, company_name_dek | TEXT | non | oui | Labos |
| lab_id | CHAR(36) | non | — | FK profiles (subaccount, preleveur) |
| created_by | CHAR(36) | non | — | FK profiles |
| city_plain | VARCHAR(255) | non | non | Ville en clair pour recherche |
| mfa_enabled, totp_secret_encrypted, totp_secret_dek | — | non | oui | MFA |
| public_slug, profile_image_url, cover_image_url | — | non | non | Profil public |
| biography, faq, is_public_profile_enabled | — | non | non | |
| is_accepting_appointments | BOOLEAN | non | non | |
| min_booking_lead_time_hours | SMALLINT | non | non | |
| accept_rdv_saturday, accept_rdv_sunday | BOOLEAN | non | non | |
| emploi | VARCHAR(120) | non | non | |
| banned_until, incident_count, last_incident_at | — | non | non | |
| created_at, updated_at | TIMESTAMP | — | — | |

### 3.2 Table `appointments`

| Colonne | Type | Requis | Chiffré | Notes |
|---------|------|--------|---------|-------|
| id | CHAR(36) | oui | — | UUID PK |
| type | ENUM | oui | non | blood_test, nursing |
| status | ENUM | oui | non | pending, confirmed, inProgress, completed, canceled, expired, refused |
| patient_id | CHAR(36) | non | — | FK profiles (NULL si guest) |
| relative_id | CHAR(36) | non | — | FK patient_relatives |
| assigned_to | CHAR(36) | non | — | FK profiles |
| assigned_nurse_id | CHAR(36) | non | — | FK profiles |
| assigned_lab_id | CHAR(36) | non | — | FK profiles |
| created_by | CHAR(36) | oui | — | FK profiles |
| created_by_role | ENUM | oui | non | |
| category_id | CHAR(36) | non | — | FK care_categories |
| form_type | ENUM | oui | non | nursing, blood_test |
| location_lat, location_lng | DECIMAL | oui | non | |
| address_encrypted, address_dek | TEXT | oui | oui | |
| form_data_encrypted, form_data_dek | TEXT | non | oui | JSON |
| guest_token | VARCHAR(255) | non | non | |
| guest_email_encrypted, guest_email_dek | TEXT | non | oui | |
| scheduled_at | DATETIME | oui | non | |
| started_at, completed_at | DATETIME | non | non | |
| duration_minutes | INT | non | non | |
| canceled_by | CHAR(36) | non | — | |
| created_at, updated_at | TIMESTAMP | — | — | |

### 3.3 Table `patient_relatives`

| Colonne | Type | Requis | Chiffré | Notes |
|---------|------|--------|---------|-------|
| id | CHAR(36) | oui | — | UUID PK |
| patient_id | CHAR(36) | oui | — | FK profiles |
| first_name_encrypted, first_name_dek | TEXT | oui | oui | |
| last_name_encrypted, last_name_dek | TEXT | oui | oui | |
| relationship_type | ENUM | oui | non | child, parent, spouse, sibling, grandparent, grandchild, other |
| email_encrypted, email_dek | TEXT | non | oui | |
| email_hash | VARCHAR(64) | non | non | |
| phone_encrypted, phone_dek | TEXT | non | oui | |
| address_encrypted, address_dek | TEXT | non | oui | |
| gender_encrypted, gender_dek | TEXT | non | oui | |
| birth_date_encrypted, birth_date_dek | TEXT | non | oui | |
| created_at, updated_at | TIMESTAMP | — | — | |

### 3.4 Table `medical_documents`

| Colonne | Type | Requis | Chiffré | Notes |
|---------|------|--------|---------|-------|
| id | CHAR(36) | oui | — | UUID PK |
| appointment_id | CHAR(36) | non | — | FK appointments (nullable) |
| uploaded_by | CHAR(36) | oui | — | FK profiles |
| file_name | VARCHAR(255) | oui | non | |
| file_path | VARCHAR(500) | oui | non | |
| file_size | BIGINT | oui | non | |
| mime_type | VARCHAR(100) | oui | non | |
| encrypted | BOOLEAN | non | non | DEFAULT TRUE |
| file_dek | TEXT | non | oui | |
| document_type | ENUM | non | non | carte_vitale, carte_mutuelle, ordonnance, autres_assurances, resultats, other |
| created_at | TIMESTAMP | — | — | |

### 3.5 Chiffrement cible (Crypto.php)

- **Algorithme :** AES-256-GCM
- **Modèle :** Enveloppe KEK/DEK
  - KEK : clé maîtresse (BACKEND_KEK_HEX, 32 bytes hex)
  - DEK : clé par champ, stockée chiffrée dans `*_dek`
- **Format DEK chiffrée :** base64(iv + tag + ciphertext)
- **IV :** 12 bytes ; **Tag :** 16 bytes

---

## 4. Tables de mapping entité par entité

### 4.1 Patient (legacy) → profiles (cible, role=patient)

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | — | non | ObjectId → UUID | UNMAPPED | Générer nouvel UUID |
| name | — | non | Fusionné dans first_name + last_name | IGNORED | Déduit |
| firstName | first_name_encrypted/dek | oui | Décrypter legacy → Rechiffrer cible | NEEDS_REVIEW | |
| lastName | last_name_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| email | email_encrypted/dek | oui | Idem + email_hash | NEEDS_REVIEW | |
| email_search_hash | email_hash | partiel | Legacy HMAC ≠ cible SHA256 | NEEDS_REVIEW | Recalculer hash |
| phone | phone_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| address | address_encrypted/dek | partiel | Legacy: string. Cible: JSON (label, lat, lng) | NEEDS_REVIEW | Parsing adresse |
| addressDetails | — | — | Intégrer dans address ou champ dédié | UNMAPPED | Pas de colonne dédiée |
| floor, accessCode | — | — | — | UNMAPPED | Pas dans profiles |
| dateOfBirth | birth_date_encrypted/dek | oui | Format Date → string ISO | VALIDATED | |
| gender | gender_encrypted/dek | oui | male/female/other identiques | VALIDATED | |
| labs | — | non | Relation N-N lab/patient | UNMAPPED | Pas d’équivalent direct |
| professionalId | created_by | partiel | ObjectId → UUID profile pro | NEEDS_REVIEW | Mapping ID |
| userId | id (profile) | partiel | Si User existe, lier | NEEDS_REVIEW | |
| socialSecurityNumber | — | — | Très sensible | UNMAPPED | Pas de colonne NSS en cible |
| notes, notePatient | — | — | — | UNMAPPED | Pas dans profiles |
| expoPushToken | — | — | — | UNMAPPED | |
| notificationSettings | — | — | — | UNMAPPED | |
| createdAt, updatedAt | created_at, updated_at | oui | Conversion date | VALIDATED | |

### 4.2 Laboratory (legacy) → profiles (cible, role=lab)

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | — | non | ObjectId → UUID | UNMAPPED | |
| name | company_name_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | Ou first_name si personne |
| email | email_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| phone | phone_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| address | address_encrypted/dek | partiel | String → JSON | NEEDS_REVIEW | |
| city | city_plain | oui | En clair pour recherche | VALIDATED | |
| postalCode | — | — | Intégrer dans address | UNMAPPED | |
| location (GeoJSON) | — | — | Pas de géo dans profiles | UNMAPPED | coverage_zones ? |
| siretNumber | siret_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| responsible | — | — | — | UNMAPPED | Pas d’équivalent |
| schedule, openingHours | — | — | opening_hours JSON ? | UNMAPPED | Vérifier migrations |
| subscriptionStatus | — | — | subscriptions table | UNMAPPED | |
| stripeCustomerId | — | — | — | UNMAPPED | |
| patients | — | — | Relation inverse | IGNORED | |
| averageRating, totalReviews | — | — | reviews table | UNMAPPED | |
| homeVisitEnabled | — | — | — | UNMAPPED | |
| logo | profile_image_url | partiel | Chemin fichier | NEEDS_REVIEW | |
| createdAt, updatedAt | created_at, updated_at | oui | — | VALIDATED | |

### 4.3 Phlebotomist (legacy) → profiles (cible, role=preleveur)

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | — | non | ObjectId → UUID | UNMAPPED | |
| name | first_name + last_name | partiel | Décrypt, split si possible | NEEDS_REVIEW | |
| email | email_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| phone | phone_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| address | address_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| labId | lab_id | oui | ObjectId → UUID | NEEDS_REVIEW | Mapping Lab |
| status, availability | — | — | — | UNMAPPED | |
| interventionRadiusKm | — | — | coverage_zones ? | UNMAPPED | |
| stats | — | — | — | UNMAPPED | |
| scheduleRules | — | — | availability_settings ? | UNMAPPED | |
| defaultScheduleSettings | — | — | — | UNMAPPED | |
| currentLocation | — | — | — | UNMAPPED | |
| createdAt, updatedAt | created_at, updated_at | oui | — | VALIDATED | |

### 4.4 Professional (legacy) → profiles (cible, role=pro)

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | — | non | ObjectId → UUID | UNMAPPED | |
| type | — | — | individual vs medical_center | UNMAPPED | Pas de type en cible |
| email | email_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| phone | phone_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| address | address_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| password | — | non | Ne pas migrer | IGNORED | Nouvelle auth OTP |
| name | first_name + last_name | partiel | Split ou company_name | NEEDS_REVIEW | |
| adeliNumber | adeli_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| specialty | — | — | — | UNMAPPED | |
| centerName | company_name_encrypted/dek | oui | Si medical_center | NEEDS_REVIEW | |
| siretNumber | siret_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| responsiblePerson | — | — | — | UNMAPPED | |
| appointments, favoriteLabs | — | — | Relations | IGNORED | |
| message | — | — | — | UNMAPPED | |
| createdAt, updatedAt | created_at, updated_at | oui | — | VALIDATED | |

### 4.5 User (legacy) → profiles (cible)

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | id | non | ObjectId → UUID | UNMAPPED | |
| name | first_name + last_name | partiel | Split | NEEDS_REVIEW | |
| email | email_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| email_search_hash | email_hash | partiel | Recalcul SHA256 | NEEDS_REVIEW | |
| phone | phone_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| password | — | non | Auth OTP cible | IGNORED | |
| role | role | partiel | Mapping: lab_admin→lab, phlebotomist→preleveur, professional→pro, patient→patient, relative→? | NEEDS_REVIEW | relative sans équivalent |
| roleDetailsId | — | — | Déterminé par role | UNMAPPED | |
| roleDetailsModel | — | — | Tout dans profiles | IGNORED | |
| accountStatus | — | — | banned_until ? | UNMAPPED | |
| isEmailVerified | — | — | — | UNMAPPED | |
| is2FAEnabled | mfa_enabled | oui | — | NEEDS_REVIEW | |
| twoFactorSecret | totp_secret_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| createdAt, updatedAt | created_at, updated_at | oui | — | VALIDATED | |

### 4.6 Relative (legacy) → patient_relatives (cible)

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | id | non | ObjectId → UUID | UNMAPPED | |
| patientId | patient_id | oui | ObjectId → UUID | NEEDS_REVIEW | Mapping ID |
| firstName | first_name_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| lastName | last_name_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| name | — | — | Déduit | IGNORED | |
| relationship | relationship_type | partiel | parent→parent, enfant→child, conjoint→spouse, frere/soeur→sibling, autre→other | NEEDS_REVIEW | Mapping enum |
| email | email_encrypted/dek | oui | Décrypt → Rechiffrer | NEEDS_REVIEW | |
| phone | phone_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| address | address_encrypted/dek | oui | Idem | NEEDS_REVIEW | |
| addressDetails, floor, accessCode | — | — | — | UNMAPPED | |
| dateOfBirth | birth_date_encrypted/dek | oui | — | NEEDS_REVIEW | |
| gender | gender_encrypted/dek | oui | male/female/other | VALIDATED | |
| legalConsent1, legalConsent2 | — | — | — | UNMAPPED | |
| createdAt, updatedAt | created_at, updated_at | oui | — | VALIDATED | |

### 4.7 Appointment (legacy) → appointments (cible)

*Mapping validé sur RDV réel (68b6ee4dfdff49dcc093bcfb — Labio, prélèvement domicile).*

| Champ legacy | Champ cible | Compatible | Transformation | Statut | Notes |
|--------------|-------------|------------|----------------|--------|-------|
| _id | id | non | ObjectId → UUID (générer) | VALIDATED | Table correspondance obligatoire |
| patientId | patient_id | oui | ObjectId → UUID via mapping | VALIDATED | |
| patientModel | — | — | Patient vs Relative | IGNORED | Déduit de relative_id (null si Patient) |
| relativeId | relative_id | oui | ObjectId → UUID via mapping | VALIDATED | NULL si patientModel=Patient |
| hasPrescription | form_data.hasPrescription | oui | "avec"/"sans" → string | VALIDATED | |
| prescriptionFile | medical_documents | oui | Créer entrée document_type=ordonnance | VALIDATED | Si path/filename présents |
| carteVitaleFile | medical_documents | oui | document_type=carte_vitale | VALIDATED | Idem |
| mutuelleFile | medical_documents | oui | document_type=carte_mutuelle | VALIDATED | Idem |
| attestationFile | medical_documents | oui | document_type=autres_assurances ou other | VALIDATED | Idem |
| analysisResults | medical_documents | oui | document_type=resultats | VALIDATED | Idem |
| location | — | — | domicile/laboratoire | IGNORED | Déduit de type |
| labId | assigned_lab_id | oui | ObjectId → UUID via mapping | VALIDATED | |
| phlebotomistId | assigned_to | oui | ObjectId → UUID (preleveur) | VALIDATED | Pour blood_test à domicile |
| professionalId | form_data.professionalId | oui | ObjectId → UUID, stocké dans form_data | VALIDATED | Pas de colonne cible |
| status | status | oui | Mapping strict (voir encadré) | VALIDATED | planned → ajouter à l’ENUM cible |
| reference | form_data.reference | oui | RDV-XXXXXX stocké dans form_data | VALIDATED | |
| dateTime | scheduled_at | oui | ISO → DATETIME 'Y-m-d H:i:s' | VALIDATED | |
| address | address_encrypted + form_data.legacy_address | oui | Chiffrer string complète + JSON legacy | VALIDATED | Voir structure legacy_address |
| addressDetails, floor, accessCode | form_data.legacy_address | oui | Dans legacy_address | VALIDATED | |
| coordinates | location_lat, location_lng | oui | lat, lng → DECIMAL | VALIDATED | |
| type | type, form_type | oui | laboratory→blood_test, homeVisit→nursing | VALIDATED | |
| labQueue | form_data.labQueue | oui | Tableau complet dans form_data | VALIDATED | |
| refusedByLabs | form_data.refusedByLabs | oui | [ObjectId] → form_data | VALIDATED | |
| deletedByLabs | form_data.deletedByLabs | oui | Idem | VALIDATED | |
| relativeInfo | form_data.relativeInfo | oui | Objet complet | VALIDATED | |
| mainPatientInfo | form_data.mainPatientInfo | oui | Objet complet | VALIDATED | |
| createdBy | created_by, created_by_role | oui | userId → UUID, role mapping | VALIDATED | Si absent : bookedBy → patient |
| bookedBy | created_by (fallback) | oui | Si createdBy absent | VALIDATED | |
| notes | form_data.notes | oui | String dans form_data | VALIDATED | |
| availability, timeSlot, desiredDate | form_data | oui | Stocker dans form_data | VALIDATED | |
| scheduledExpirationAt, failureReason, expiredAt | form_data | oui | Idem | VALIDATED | |
| contactEmail, contactPhone | form_data | oui | Idem | VALIDATED | |
| isForRelative, isRelative | form_data | oui | Booléens | VALIDATED | |
| createdAt, updatedAt | created_at, updated_at | oui | ISO → TIMESTAMP | VALIDATED | |

#### Mapping statuts (strict)

| Legacy | Cible |
|-------|-------|
| pending | pending |
| confirmed | confirmed |
| planned | planned *(à ajouter à l’ENUM cible)* |
| completed | completed |
| cancelled | canceled |
| expired | expired |
| refused | refused |

#### Structure form_data.legacy_address

```json
{
  "full": "2 Bd des Alisiers, Marseille, France",
  "addressDetails": "Bat le Renoir 4",
  "floor": "5eme etage",
  "accessCode": ""
}
```

#### Exemple mapping JSON (RDV 68b6ee4dfdff49dcc093bcfb)

```json
{
  "appointments": {
    "id": "uuid-genere",
    "type": "nursing",
    "form_type": "nursing",
    "status": "completed",
    "patient_id": "uuid-patient-68b6ee35fdff49dcc093bcee",
    "relative_id": null,
    "assigned_to": "uuid-phleb-68931b5cf01354735dea5ecb",
    "assigned_nurse_id": null,
    "assigned_lab_id": "uuid-lab-689233af3b78f462d126e06a",
    "created_by": "uuid-patient-68b6ee35fdff49dcc093bcee",
    "created_by_role": "patient",
    "category_id": null,
    "location_lat": 43.2586289,
    "location_lng": 5.4162098,
    "address_encrypted": "[chiffré]",
    "address_dek": "[chiffré]",
    "form_data_encrypted": "[JSON chiffré]",
    "form_data_dek": "[chiffré]",
    "scheduled_at": "2025-09-03 06:00:00",
    "started_at": null,
    "completed_at": null,
    "duration_minutes": null
  },
  "form_data": {
    "legacy_address": {
      "full": "2 Bd des Alisiers, Marseille, France",
      "addressDetails": "Bat le Renoir 4",
      "floor": "5eme etage",
      "accessCode": ""
    },
    "reference": "41U5CT",
    "notes": "",
    "hasPrescription": "avec",
    "labQueue": [{"labId":"689233af3b78f462d126e06a","labName":"[chiffré]","notifiedAt":"2025-09-02T13:17:02.301Z","expiresAt":"2025-09-02T14:47:02.301Z","status":"pending"}],
    "refusedByLabs": [],
    "deletedByLabs": [],
    "availability": "specificSlot",
    "timeSlot": "06:00",
    "desiredDate": "2025-09-03T00:00:00.000Z",
    "isForRelative": false,
    "isRelative": false
  },
  "medical_documents": [
    {"document_type": "resultats", "file_path": "...", "file_name": "WEB2281455_RESU_1.pdf", "appointment_id": "uuid-rdv"}
  ]
}
```

#### Analyse RDV réel (68b6ee4dfdff49dcc093bcfb)

**Transformations appliquées :**
- `type` homeVisit → `type` + `form_type` = nursing
- `status` completed → completed (inchangé)
- `dateTime` ISO → `scheduled_at` DATETIME
- `address` + addressDetails + floor → `address_encrypted` (string complète) + `form_data.legacy_address` (JSON)
- `coordinates` → `location_lat`, `location_lng`
- `phlebotomistId` → `assigned_to` (preleveur)
- `labId` → `assigned_lab_id`
- `bookedBy` = patientId → `created_by` (fallback, createdBy absent)

**Champs déplacés dans form_data :** reference, notes, hasPrescription, labQueue, refusedByLabs, deletedByLabs, availability, timeSlot, desiredDate, isForRelative, isRelative.

**Fichiers → medical_documents :** analysisResults (path complet) → resultats. prescriptionFile, carteVitaleFile, mutuelleFile, attestationFile : métadonnées minimales (uploadDate seul) — créer entrées si path disponible en base.

**Problèmes détectés :** Aucun. Cohérence patientModel=Patient et relativeId absent. `planned` absent de l’ENUM cible → migration SQL requise avant import.

---

## 5. Analyse chiffrement et HDS

### 5.1 Champs sensibles par entité

| Entité | Champs legacy chiffrés | Champs cible chiffrés | Action requise |
|--------|-------------------------|------------------------|----------------|
| Patient | name, firstName, lastName, email, phone, address, addressDetails, floor, accessCode, dateOfBirth, gender, socialSecurityNumber, notes, notePatient | first_name, last_name, email, phone, address, gender, birth_date | Décrypt legacy → Rechiffrer cible. NSS, notes, addressDetails, floor, accessCode : non migrés ou manquants |
| Lab | name, email, phone, address, city, postalCode, siretNumber, responsible | email, company_name, phone, address, siret | Idem |
| Phlebotomist | name, email, phone, address | first_name, last_name, email, phone, address | Idem |
| Professional | name, email, phone, address, adeliNumber, specialty, centerName, siretNumber, responsiblePerson, message | email, first_name, last_name, phone, address, adeli, company_name, siret | Idem |
| User | name, firstName, lastName, email, phone | (via profiles) | Idem |
| Relative | name, firstName, lastName, email, phone, address, addressDetails, floor, accessCode, dateOfBirth, gender | first_name, last_name, email, phone, address, gender, birth_date | Idem |
| Appointment | address, addressDetails, floor, accessCode, relativeInfo, mainPatientInfo, notes, contactEmail, contactPhone | address, form_data, guest_email | Idem |

### 5.2 Fichiers chiffrés

| Legacy | Cible | Action |
|--------|-------|--------|
| prescriptionFile, carteVitaleFile, mutuelleFile, attestationFile, analysisResults (path vers .enc) | medical_documents (file_path, file_dek, encrypted) | Décrypter chaque .enc avec ENCRYPTION_KEY legacy, rechiffrer avec KEK/DEK cible, enregistrer dans medical_documents |
| Stockage : `uploads/encrypted/` | Stockage : à définir (config cible) | Copier/décrypter/rechiffrer, puis mettre à jour file_path |

### 5.3 Risques HDS

- **NSS (socialSecurityNumber)** : Données très sensibles, pas de colonne en cible → décision métier (ignorer ou ajouter colonne).
- **Données déchiffrées** : Ne jamais logger de données déchiffrées ; exécuter la migration dans un environnement sécurisé.
- **Clés** : `ENCRYPTION_KEY` et `HMAC_KEY` legacy doivent rester disponibles pendant la migration ; `BACKEND_KEK_HEX` cible doit être configurée.

---

## 6. Lacunes et risques détectés

### 6.1 Champs sans mapping

- **Patient :** socialSecurityNumber, notes, notePatient, addressDetails, floor, accessCode, expoPushToken, notificationSettings, labs, professionalId
- **Lab :** responsible, postalCode, location (GeoJSON), schedule, openingHours, subscriptionStatus, stripeCustomerId, patients, averageRating, totalReviews, homeVisitEnabled
- **Phlebotomist :** status, availability, interventionRadiusKm, stats, scheduleRules, defaultScheduleSettings, currentLocation
- **Professional :** type, specialty, responsiblePerson, message, appointments, favoriteLabs
- **User :** password, roleDetailsId, roleDetailsModel, accountStatus, isEmailVerified, resetPasswordToken, resetPasswordExpires
- **Relative :** addressDetails, floor, accessCode, legalConsent1, legalConsent2
- **Appointment :** reference, labQueue, refusedByLabs, deletedByLabs, failureReason, expiredAt, professionalId, createdBy.userType

### 6.2 Incompatibilités structurelles

- **ObjectId vs UUID** : Tous les IDs doivent être régénérés (UUID) et une table de correspondance legacy_id → cible_id doit être maintenue.
- **Hash email** : Legacy HMAC ≠ cible SHA256 → recalcul obligatoire de `email_hash`.
- **Adresse** : Legacy = string ; cible = JSON (label, lat, lng) → géocodage ou parsing nécessaire.
- **Rôles** : lab_admin→lab, phlebotomist→preleveur, professional→pro ; rôle `relative` sans équivalent direct en cible.
- **Statuts RDV** : `planned` absent de l’ENUM cible — migration SQL requise pour l’ajouter ; cancelled → canceled (orthographe).

### 6.3 Relations manquantes ou différentes

- **Patient ↔ Lab** : Legacy = tableau `labs` ; cible = pas de relation directe (sous-entendu via appointments).
- **Lab ↔ Phlebotomist** : Legacy = labId dans Phlebotomist ; cible = lab_id dans profiles (preleveur).
- **Professional ↔ Patient** : Legacy = professionalId dans Patient ; cible = created_by dans profiles.
- **Appointment ↔ Professional** : Legacy = professionalId ; cible = pas de assigned_pro.

### 6.4 Authentification

- **Legacy** : bcrypt + JWT.
- **Cible** : OTP par email (pas de mot de passe).
- **Conséquence** : Les mots de passe legacy ne sont pas migrables ; les utilisateurs devront se reconnecter via OTP.

### 6.5 Données potentiellement perdues

- Numéro de sécurité sociale (NSS).
- Notes patient et notes professionnelles.
- Détails d’adresse (étage, code d’accès).
- Paramètres de notification (expoPushToken, notificationSettings).
- Historique 2FA (twoFactorSecret, backup codes) si non migré.
- Référence RDV (RDV-XXXXXX).
- File d’attente lab (labQueue), refus (refusedByLabs), suppression (deletedByLabs).

---

## 7. Recommandations de migration (haut niveau)

1. **Pré-migration**
   - Créer une table de mapping `legacy_id_mapping` (legacy_collection, legacy_object_id, target_table, target_uuid).
   - Exporter un échantillon de données legacy (déjà fait : `patients-et-rdv.json`) et valider le mapping sur un sous-ensemble.
   - Vérifier que les clés legacy (ENCRYPTION_KEY, HMAC_KEY) et cible (BACKEND_KEK_HEX) sont disponibles et sécurisées.

2. **Ordre de migration**
   - 1) profiles (User, Patient, Lab, Phlebotomist, Professional) — en respectant les dépendances (lab_id, created_by).
   - 2) patient_relatives.
   - 3) care_categories (si nécessaire).
   - 4) appointments.
   - 5) medical_documents + migration des fichiers .enc.

3. **Chiffrement**
   - Implémenter un module de migration qui :
     - déchiffre avec le format legacy (iv:authTag:data),
     - rechiffre avec le schéma KEK/DEK cible,
     - écrit dans les colonnes `*_encrypted` et `*_dek`.

4. **Fichiers**
   - Pour chaque fichier .enc : décrypter, rechiffrer avec DEK, enregistrer dans medical_documents, mettre à jour file_path.

5. **Validation**
   - Contrôles d’intégrité (FK, non-null).
   - Vérification des volumes (nombre de profils, RDV, documents).
   - Tests de déchiffrement sur un échantillon.

6. **Non implémenté dans ce rapport**
   - Scripts de migration SQL/Node/PHP.
   - Modifications de schéma.
   - Exécution effective de la migration.

---

## 8. Moteur de migration — traitement RDV par RDV

Le moteur traite **un rendez-vous legacy à la fois** et produit :
1. Le mapping complet vers la structure cible (avec mapping_trace détaillé)
2. La mise à jour du rapport de migration (entrée par RDV)
3. La migration des documents médicaux (CRITIQUE)
4. La normalisation et détection de doublons
5. L'intégration dans le planning cible
6. L'assignation correcte documents → RDV → patient
7. La gestion des erreurs (STOP si critique manquant)
8. Un output JSON prêt à l'insert (appointment + documents + rapport)

#### Règles globales

- Aucun ObjectId ne doit rester dans les données cibles
- Tous les champs sensibles doivent être rechiffrés
- Aucun fichier ne doit être ignoré sans log
- Toute erreur critique → STOP
- Aucune perte de donnée critique n'est tolérée

### 8.1 Input

- Objet JSON représentant un appointment legacy
- Accès aux tables de mapping : `legacy_id_mapping` (ObjectId → UUID)
- Accès aux fichiers `.enc` sur disque : `/var/www/onl/backend/uploads/encrypted/`
- Données liées : patient, relative, lab, phlebotomist, professional

**Clés disponibles :**
- `ENCRYPTION_KEY` (legacy)
- `BACKEND_KEK_HEX` (cible)

### 8.2 Étape 1 — Mapping des IDs

| Champ legacy | Champ cible | Action |
|--------------|-------------|--------|
| patientId | patient_id | Convertir via legacy_id_mapping |
| relativeId | relative_id | Idem (NULL si patientModel=Patient) |
| labId | assigned_lab_id | Idem |
| phlebotomistId | assigned_to | Idem |
| professionalId | assigned_pro_id ou form_data | Si colonne existe → assigned_pro_id ; sinon form_data.professionalId |

**Règle :** Si un mapping n'existe pas → **ERREUR BLOQUANTE** + log dans rapport.

### 8.3 Étape 2 — Création du planning (normalisation)

| Champ legacy | Champ cible | Transformation |
|--------------|-------------|----------------|
| dateTime | scheduled_at | ISO → DATETIME 'Y-m-d H:i:s' |
| startTime, endTime | duration_minutes | Si dispo : (endTime - startTime) en minutes |
| status | status | Mapping strict ; si planned → vérifier ENUM cible |
| type | type, form_type | homeVisit→nursing, laboratory→blood_test |
| address | address_encrypted + form_data.legacy_address | Chiffrer + JSON complet |
| coordinates | location_lat, location_lng | lat, lng → DECIMAL |

**Statut `planned` :** Si absent de l'ENUM cible → ajouter dynamiquement (migration SQL) ou log erreur.

**created_by :** Utiliser `createdBy` si existe, sinon `bookedBy`, sinon **ERREUR**.

**Address :** Toujours produire `{ "label": "adresse complète", "lat": null, "lng": null }` ; stocker `legacy_address` dans form_data.

### 8.4 Étape 3 — Normalisation et doublons

Vérifier les doublons sur :
- **Phlebotomist** : email + phone (ex. "Sarah Touloum" → fusionner si même email)
- **Patient** : email_hash
- **Lab** : siret, email_hash

**Si doublon détecté :** Utiliser l'UUID existant + log `"duplicate_detected": true` dans mapping_trace.

### 8.5 Étape 4 — Mapping complet du RDV et mapping_trace

Structure de sortie : `{ "appointments": {...}, "form_data": {...}, "mapping_trace": {...} }`. Voir section 4.7 pour le détail.

**Structure obligatoire de `mapping_trace` :**

```json
{
  "legacy_id": "ObjectId du RDV legacy",
  "target_uuid": "UUID du RDV créé en cible",
  "ids_transformed": {
    "patient_id": "uuid",
    "relative_id": "uuid | null",
    "assigned_lab_id": "uuid | null",
    "assigned_to": "uuid | null",
    "professional_id_form_data": "uuid | null"
  },
  "fields_status": {
    "patientId": "mapped | ignored | error",
    "relativeId": "mapped | ignored | error",
    "labId": "mapped | ignored | error",
    "phlebotomistId": "mapped | ignored | error",
    "professionalId": "mapped | ignored | error",
    "dateTime": "mapped | ignored | error",
    "address": "mapped | ignored | error",
    "...": "mapped | ignored | error"
  },
  "duplicate_detected": false
}
```

Chaque champ legacy doit avoir un statut explicite : **mapped**, **ignored** ou **error**. Aucune ambiguïté tolérée.

### 8.6 Étape 5 — Migration des documents (CRITIQUE)

#### Règle officielle — pipeline obligatoire (HDS READY)

```
fichier .enc (AES-256-GCM legacy)
   ↓ DECRYPT (ENCRYPTION_KEY)
fichier brut (pdf, jpg, png…)
   ↓ RE-ENCRYPT (KEK/DEK cible)
fichier chiffré cible
   ↓ SAVE
medical_documents + stockage
```

#### Mapping des champs

| Champ legacy | document_type cible |
|--------------|---------------------|
| prescriptionFile | ordonnance |
| carteVitaleFile | carte_vitale |
| mutuelleFile | carte_mutuelle |
| attestationFile | autres_assurances |
| analysisResults | resultats |

#### Étapes détaillées

**1. Lire le fichier .enc**

- Chemin : `/var/www/onl/backend/uploads/encrypted/`
- Vérifier existence sur disque → sinon `"file_status": "missing"`

**2. Déchiffrer (legacy)**

- Format : `iv:authTag:encryptedData` (hex)
- **Obligatoire :** IV = 16 bytes, TAG = 16 bytes, Algo = AES-256-GCM
- Clé : `ENCRYPTION_KEY` (legacy)
- Si authTag invalide → STOP pour ce fichier

**3. Vérification critique après décrypt**

Vérifier la signature du fichier :

| Type | Signature (hex) |
|------|-----------------|
| PDF | `%PDF` |
| JPG | `FFD8` |
| PNG | `89504E47` |

Si invalide → `"file_status": "corrupted"` + STOP pour ce fichier.

**4. Rechiffrer (cible)**

- Générer un **DEK unique par fichier** (ne jamais réutiliser un DEK)
- Chiffrer le fichier avec AES-256-GCM
- Chiffrer le DEK avec KEK (`BACKEND_KEK_HEX`)

**5. Sauvegarde**

- Stockage cible : S3 ou disque
- Table `medical_documents`

**6. Insertion DB**

```json
{
  "appointment_id": "uuid",
  "uploaded_by": "patient_id",
  "file_name": "...",
  "file_path": "...",
  "file_size": 0,
  "mime_type": "...",
  "encrypted": true,
  "file_dek": "...",
  "document_type": "resultats"
}
```

#### Erreurs interdites

- Copier les `.enc` tels quels
- Ignorer un fichier sans log
- Logger des données déchiffrées
- Réutiliser un DEK
- Continuer si authTag invalide

### 8.7 Étape 6 — Assignation au patient (IMPORTANT)

Tous les documents doivent être :
- **liés au RDV** (appointment_id)
- **ET exploitables côté patient** (visible dans l'espace patient)

**Cas particulier :** Si aucun RDV mais document présent → rattacher **uniquement au patient** (patient_id, appointment_id = NULL).

### 8.8 Étape 7 — Mise à jour du rapport

Ajouter une entrée par RDV traité :

```json
{
  "appointment_legacy_id": "...",
  "appointment_uuid": "...",
  "status": "success | error",
  "issues": [],
  "duplicates": [],
  "documents_migrated": 0,
  "documents_missing": 0,
  "fields_unmapped": [],
  "notes": ""
}
```

### 8.9 Étape 8 — Gestion des erreurs (erreurs bloquantes)

**STOP si :**
- `patient_id` absent
- `lab_id` requis absent (selon type de RDV)
- Fichier critique non lisible (authTag invalide, décrypt échoué)
- Mapping ID absent pour un champ obligatoire

**Règles :**
- Ne jamais ignorer silencieusement un fichier ou un mapping
- Toute erreur bloquante doit être loggée et remonter dans `issues` du rapport

### 8.10 Output attendu

```json
{
  "appointment": {...},
  "documents": [...],
  "mapping_trace": {...},
  "report_entry": {...}
}
```

- **appointment** : prêt à être inséré
- **documents** : tableau d'entrées `medical_documents` prêtes à l'insert
- **mapping_trace** : traçabilité complète (champs en mapped/ignored/error)
- **report_entry** : entrée pour le rapport de migration (voir 8.8)

### 8.11 Contraintes

- Ne jamais exposer de données déchiffrées en clair dans les logs.
- Respect strict HDS.
- Tous les champs sensibles doivent être rechiffrés.
- Aucun ObjectId ne doit rester dans les données cibles.

### 8.12 Objectif final

- **0 perte de données critiques**
- **100% fichiers exploitables**
- **100% RDV cohérents**
- **Conformité HDS totale**

### 8.13 Table legacy_id_mapping

```sql
CREATE TABLE legacy_id_mapping (
  legacy_collection VARCHAR(50) NOT NULL,
  legacy_object_id VARCHAR(24) NOT NULL,
  target_table VARCHAR(50) NOT NULL,
  target_uuid CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_collection, legacy_object_id),
  INDEX idx_target (target_table, target_uuid)
);
```

Valeurs `legacy_collection` : patients, relatives, labs, phlebotomists, professionals, users, appointments.

---

## Annexe A — Moteur de migration (prompt version production)

Spécification condensée pour moteur IA ou script :

**Input :** Appointment legacy JSON + legacy_id_mapping + fichiers .enc + ENCRYPTION_KEY + BACKEND_KEK_HEX

**Règles :** Aucun ObjectId ; rechiffrement obligatoire ; aucun fichier ignoré sans log ; erreur critique → STOP

**Pipeline RDV :** Mapping IDs (OBLIGATOIRE) → Normalisation (dateTime, type, status, address) → created_by (createdBy/bookedBy) → Doublons (email_hash)

**Pipeline fichiers :** Vérifier existence → Déchiffrer (iv:authTag, AES-256-GCM) → Valider signature (PDF/JPG/PNG) → Rechiffrer (DEK unique + KEK) → medical_documents

**Output :** `{ appointment, documents, mapping_trace, report_entry }`

**mapping_trace :** Chaque champ en mapped/ignored/error. Aucun champ implicite.

**Erreurs bloquantes :** patient_id absent ; lab_id requis absent ; fichier critique non lisible

**Objectif :** 0 perte | 100% fichiers exploitables | 100% RDV cohérents | conformité HDS totale

---

**Fin du rapport.** En attente de validation avant toute étape d’implémentation.
