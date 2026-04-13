# Comparaison des flux : Espace Pro vs Formulaire Rendez-vous

## Vue d'ensemble

| Aspect | Espace Pro | Formulaire Rendez-vous |
|--------|------------|-------------------------|
| **Page** | `/pro/appointments/new.vue` | `/rendez-vous/nouveau.vue` |
| **Composant** | `AppointmentForm` | `NursingForm` ou `LabForm` |
| **Composable** | — | `useAppointments().createAppointment()` |
| **Endpoint API** | `POST /appointments` | `POST /appointments` |
| **Auth** | Pro (Bearer) | Patient (Bearer après OTP) |

→ **Même endpoint backend** pour les deux flux.

---

## 1. Flux Pro (Espace Pro de Santé)

### Chemin
```
/pro/appointments/new.vue
  → <AppointmentForm mode="create" base-path="/pro" />
  → submit() dans AppointmentForm.vue
  → apiFetch('/appointments', { method: 'POST', body: createBody })
```

### Payload envoyé (`createBody`)
```js
{
  type: 'blood_test' | 'nursing',
  form_type: 'blood_test' | 'nursing',
  scheduled_at: '2025-02-28T09:00:00.000Z',  // ISO
  address: {
    label: '...',
    lat: 43.29,
    lng: 5.37,
    complement: '...'
  },
  form_data: {
    category_id, gender, availability, files, blood_test_type, custom_days, frequency, ...
  },
  status: 'pending',
  patient_id: 'uuid',
  category_id: 'uuid',
  guest_email: '...',  // si pas de patient_id
  assigned_lab_id: 'uuid',   // optionnel (si lab sélectionné)
  assigned_nurse_id: 'uuid'  // optionnel (si infirmier sélectionné)
}
```

### Particularités Pro
- Peut créer un patient avant le RDV (`POST /patients`) si "Nouveau patient"
- Peut assigner directement un lab (`assigned_lab_id`) ou un infirmier (`assigned_nurse_id`) → **pas de dispatch** dans ce cas
- Pas de timeout explicite sur `apiFetch`
- `created_by` = ID du pro, `created_by_role` = 'pro'

---

## 2. Flux Formulaire Rendez-vous (Patient)

### Chemin
```
/rendez-vous/nouveau.vue
  → NursingForm ou LabForm (v-model="formData", @submit="handleFormSubmit")
  → handleFormSubmit(data) → formData.value = data
  → createAppointmentDirectly() ou verifyOTPAndCreate()
  → createAppointment(appointmentPayload)
  → apiFetch('/appointments', { method: 'POST', body: appointmentData, timeout: 90000 })
```

### Payload envoyé (`appointmentPayload`)
```js
{
  type: selectedService.value,      // 'blood_test' | 'nursing'
  form_type: selectedService.value,
  patient_id: user.value?.id,
  ...formData.value,               // spread depuis NursingForm/LabForm
  assigned_nurse_id: providerId,   // si booking depuis fiche publique infirmier
  assigned_lab_id: providerId      // si booking depuis fiche publique lab
}
```

### Structure de `formData` (émis par NursingForm/LabForm)
```js
{
  address: { label, lat, lng, complement },
  scheduled_at: '2025-02-28 09:00:00',  // ou ISO selon format
  form_data: { ...form, address, scheduled_at, files, duration_days, custom_days },
  files: { carte_vitale: File, ... },
  category_id, first_name, last_name, email, phone, birth_date, gender, ...
}
```

### Particularités Formulaire
- Timeout **90 secondes** sur la requête
- Pas d’assignation directe (sauf si booking depuis fiche publique)
- `created_by` = ID du patient, `created_by_role` = 'patient'
- Peut passer par OTP si non connecté

---

## 3. Backend (identique pour les deux)

### API `POST /appointments`
1. Validation (type, address, scheduled_at, patient_id ou guest_email)
2. `$appointmentModel->create($input, $user['user_id'], $user['role'])`
3. Réponse JSON `{ success: true, data: { id } }`
4. `fastcgi_finish_request()`
5. Lancement du worker : `exec("php process-appointment-notifications.php <id> &")`
6. Si le worker n’est pas trouvé : `runPostCreateNotifications($id, $input)` en direct

### Worker `process-appointment-notifications.php`
- Lit `location_lat`, `location_lng`, `type`, `scheduled_at` en base
- Appelle `runPostCreateNotifications($id, $input)` avec un `$input` reconstruit
- `runPostCreateNotifications` → `dispatchGeographic()` + notifications

### Dispatch géographique
- Ne dépend pas de `created_by` ni `created_by_role`
- Utilise uniquement : `type`, `lat`, `lng`, `scheduled_at`
- Même logique pour Pro et Patient

---

## 4. Différences pouvant impacter le dispatch

| Élément | Pro | Formulaire |
|---------|-----|-------------|
| **Endpoint** | Identique | Identique |
| **Worker** | Identique | Identique |
| **Assignation directe** | Oui (lab/nurse) → pas de dispatch | Non (sauf fiche publique) |
| **Timeout requête** | Défaut | 90 s |
| **Structure payload** | `address` et `scheduled_at` en racine | Idem via spread de `formData` |

### Piste principale
Si le Pro assigne un lab (`assigned_lab_id`), le RDV n’est pas dispatché : il va directement au lab.  
Si le Patient ne choisit pas de lab, le RDV doit être dispatché.

Le problème de non-dispatch côté formulaire vient probablement du **worker qui ne s’exécute pas** (exec après `fastcgi_finish_request`), et non d’une différence de payload entre Pro et Formulaire.

### Vérifications utiles
1. **Pro** : créer un RDV **sans** lab assigné → le dispatch fonctionne-t-il ?
2. **Formulaire** : vérifier que `address.lat`, `address.lng` sont bien envoyés (AddressSelector)
3. **Logs** : `backend/logs/appointments.log` pour voir les payloads reçus
4. **Worker** : lancer manuellement `php scripts/process-appointment-notifications.php <id>` sur un RDV créé par le formulaire
