<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/../../models/PatientRelative.php';
require_once __DIR__ . '/../PatientDossierDocuments.php';
require_once __DIR__ . '/../Uuid.php';

/**
 * Enrichit un brouillon IA avec les données réelles du compte (adresse, docs, créneaux wizard).
 */
final class AiDraftPayloadEnricher
{
    private PDO $db;
    private User $userModel;

    public function __construct(?PDO $db = null, ?User $userModel = null)
    {
        $this->db = $db ?? ai_db();
        $this->userModel = $userModel ?? new User();
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function enrich(array $payload, array $user): array
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');
        $patientId = (string) ($payload['patient_id'] ?? $userId);

        if ($role === 'patient') {
            $payload['patient_id'] = $userId;
            $payload['patient_mode'] = $payload['patient_mode'] ?? 'self';
        }

        $payload = $this->resolveCategory($payload);
        $payload = $this->resolveProfileAddress($payload, $user, $patientId, $role);
        $payload = $this->resolveProfileIdentity($payload, $user, $patientId, $role);
        $payload = $this->normalizeAvailability($payload);
        $payload = $this->normalizeSelectedServices($payload);
        $payload = $this->normalizeCareOptions($payload);
        $payload = $this->prefillProfileDocuments($payload, $patientId, $userId, $role);

        return $payload;
    }

    /**
     * Prépare le payload stocké pour buildRecap (résolution category_name depuis l’id).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function prepareRecapPayload(array $payload): array
    {
        if (!empty($payload['category_id']) && empty($payload['category_name'])) {
            $payload['category_name'] = $this->categoryNameById((string) $payload['category_id']);
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function resolveCategory(array $payload): array
    {
        if (!empty($payload['category_id'])) {
            $payload['category_name'] = $this->categoryNameById((string) $payload['category_id']) ?? ($payload['category_name'] ?? null);

            return $payload;
        }

        $name = trim((string) ($payload['category_name'] ?? ''));
        $type = (string) ($payload['type'] ?? 'nursing');
        if ($name === '') {
            return $payload;
        }

        $stmt = $this->db->prepare('
            SELECT id, name FROM care_categories
            WHERE is_active = 1 AND type = ? AND name LIKE ?
            ORDER BY CHAR_LENGTH(name) DESC, name ASC LIMIT 1
        ');
        $stmt->execute([$type, '%' . $name . '%']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $normalized = preg_replace('/[\s\-_]+/u', '', mb_strtolower($name)) ?? '';
            if ($normalized !== '') {
                $all = $this->db->prepare('SELECT id, name FROM care_categories WHERE is_active = 1 AND type = ?');
                $all->execute([$type]);
                while ($candidate = $all->fetch(PDO::FETCH_ASSOC)) {
                    $catNorm = preg_replace('/[\s\-_]+/u', '', mb_strtolower((string) ($candidate['name'] ?? ''))) ?? '';
                    if ($catNorm !== '' && (str_contains($normalized, $catNorm) || str_contains($catNorm, $normalized))) {
                        $row = $candidate;
                        break;
                    }
                }
            }
        }
        if ($row) {
            $payload['category_id'] = (string) $row['id'];
            $payload['category_name'] = (string) $row['name'];
        }

        return $payload;
    }

    /**
     * Préremplit form_data (prénom, nom, contact) comme le wizard mobile.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function resolveProfileIdentity(array $payload, array $user, string $patientId, string $role): array
    {
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $relativeId = trim((string) ($payload['relative_id'] ?? ''));

        if ($relativeId !== '') {
            $payload['form_data'] = $this->mergeRelativeIdentity($formData, $relativeId, $patientId);

            return $payload;
        }

        $patientMode = (string) ($payload['patient_mode'] ?? 'self');
        $identityPatientId = $patientId;
        if (
            in_array($role, ['pro', 'nurse'], true)
            && $patientMode === 'existing'
            && !empty($payload['patient_id'])
        ) {
            $identityPatientId = (string) $payload['patient_id'];
        }

        if ($role === 'patient' || $patientMode === 'self' || $patientMode === 'existing') {
            $payload['form_data'] = $this->mergeUserProfileIdentity(
                $formData,
                $identityPatientId,
                (string) ($user['user_id'] ?? ''),
                $role,
            );
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $formData
     * @return array<string, mixed>
     */
    private function mergeRelativeIdentity(array $formData, string $relativeId, string $patientId): array
    {
        try {
            $relative = (new PatientRelative())->getById($relativeId, $patientId);
        } catch (Throwable $e) {
            return $formData;
        }
        if (!$relative) {
            return $formData;
        }

        $this->fillIdentityField($formData, 'first_name', $relative['first_name'] ?? null);
        $this->fillIdentityField($formData, 'last_name', $relative['last_name'] ?? null);
        $this->fillIdentityField($formData, 'phone', $relative['phone'] ?? null);
        $this->fillIdentityField($formData, 'email', $relative['email'] ?? null);
        $this->fillIdentityField($formData, 'gender', $relative['gender'] ?? null);
        $this->fillIdentityField($formData, 'birth_date', $relative['birth_date'] ?? null);
        $this->fillIdentityField($formData, 'beneficiary_first_name', $relative['first_name'] ?? null);
        $this->fillIdentityField($formData, 'beneficiary_last_name', $relative['last_name'] ?? null);

        return $formData;
    }

    /**
     * @param array<string, mixed> $formData
     * @return array<string, mixed>
     */
    private function mergeUserProfileIdentity(
        array $formData,
        string $patientId,
        string $requesterId,
        string $role,
    ): array {
        if ($patientId === '') {
            return $formData;
        }

        try {
            $profile = $this->userModel->getById($patientId, $requesterId, $role, 'mobile');
        } catch (Throwable $e) {
            return $formData;
        }
        if (!$profile) {
            return $formData;
        }

        $this->fillIdentityField($formData, 'first_name', $profile['first_name'] ?? null);
        $this->fillIdentityField($formData, 'last_name', $profile['last_name'] ?? null);
        $this->fillIdentityField($formData, 'phone', $profile['phone'] ?? null);
        $this->fillIdentityField($formData, 'email', $profile['email'] ?? null);
        $this->fillIdentityField($formData, 'gender', $profile['gender'] ?? null);
        $this->fillIdentityField($formData, 'birth_date', $profile['birth_date'] ?? null);

        return $formData;
    }

    /**
     * @param array<string, mixed> $formData
     */
    private function fillIdentityField(array &$formData, string $key, mixed $value): void
    {
        if ($value === null || trim((string) $value) === '') {
            return;
        }
        if (!isset($formData[$key]) || trim((string) $formData[$key]) === '') {
            $formData[$key] = $value;
        }
    }

    /**
     * Aligne care_options sur formDataByService (wizard mobile).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeCareOptions(array $payload): array
    {
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $sharedCare = is_array($formData['care_options'] ?? null) ? $formData['care_options'] : [];
        $formDataByService = is_array($payload['formDataByService'] ?? null) ? $payload['formDataByService'] : [];
        $services = is_array($payload['selected_services'] ?? null) ? $payload['selected_services'] : [];

        foreach ($services as $svc) {
            if (!is_array($svc)) {
                continue;
            }
            $sid = (string) ($svc['id'] ?? '');
            if ($sid === '') {
                continue;
            }
            $svcForm = is_array($formDataByService[$sid] ?? null) ? $formDataByService[$sid] : [];
            $svcCare = is_array($svcForm['care_options'] ?? null) ? $svcForm['care_options'] : [];
            if ($svcCare === [] && $sharedCare !== []) {
                $svcForm['care_options'] = $sharedCare;
            } elseif ($svcCare !== []) {
                $svcForm['care_options'] = $svcCare;
            }
            if ($svcForm !== []) {
                $formDataByService[$sid] = array_merge($formDataByService[$sid] ?? [], $svcForm);
            }
        }

        if ($sharedCare !== []) {
            $formData['care_options'] = $sharedCare;
            $payload['form_data'] = $formData;
        }
        if ($formDataByService !== []) {
            $payload['formDataByService'] = $formDataByService;
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $payload
     * @return list<string>
     */
    public function formatCareOptionLines(array $payload): array
    {
        $services = is_array($payload['selected_services'] ?? null) ? $payload['selected_services'] : [];
        $formDataByService = is_array($payload['formDataByService'] ?? null) ? $payload['formDataByService'] : [];
        $lines = [];

        if ($services !== []) {
            foreach ($services as $svc) {
                if (!is_array($svc)) {
                    continue;
                }
                $catId = trim((string) ($svc['category_id'] ?? ''));
                $svcName = trim((string) ($svc['name'] ?? $svc['category_name'] ?? ''));
                $sid = (string) ($svc['id'] ?? '');
                $svcForm = is_array($formDataByService[$sid] ?? null) ? $formDataByService[$sid] : [];
                $careOpts = is_array($svcForm['care_options'] ?? null) ? $svcForm['care_options'] : [];
                if ($careOpts === [] && count($services) === 1) {
                    $careOpts = $this->extractCareOptions($payload);
                }
                if ($catId === '' || $careOpts === []) {
                    continue;
                }
                $svcLines = $this->formatCareOptionLinesForCategory($catId, $careOpts);
                foreach ($svcLines as $line) {
                    $lines[] = count($services) > 1 && $svcName !== ''
                        ? $svcName . ' — ' . $line
                        : $line;
                }
            }

            return $lines;
        }

        $catId = trim((string) ($payload['category_id'] ?? ''));
        if ($catId === '') {
            return [];
        }

        return $this->formatCareOptionLinesForCategory($catId, $this->extractCareOptions($payload));
    }

    /**
     * @param array<string, mixed> $careOptions
     * @return list<string>
     */
    private function formatCareOptionLinesForCategory(string $catId, array $careOptions): array
    {
        if ($catId === '' || $careOptions === []) {
            return [];
        }

        try {
            $stmt = $this->db->prepare('
                SELECT option_key, label, field_type, options
                FROM care_category_options
                WHERE care_category_id = ?
                ORDER BY sort_order, id
            ');
            $stmt->execute([$catId]);
            $lines = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $key = (string) ($row['option_key'] ?? '');
                if ($key === '' || !array_key_exists($key, $careOptions)) {
                    continue;
                }
                $raw = $careOptions[$key];
                if ($raw === '' || $raw === null) {
                    continue;
                }
                $label = (string) ($row['label'] ?? $key);
                $display = (string) $raw;
                if (($row['field_type'] ?? '') === 'select') {
                    $choices = is_string($row['options'] ?? null)
                        ? json_decode((string) $row['options'], true)
                        : ($row['options'] ?? null);
                    if (is_array($choices)) {
                        foreach ($choices as $choice) {
                            if (!is_array($choice)) {
                                continue;
                            }
                            if ((string) ($choice['value'] ?? '') === (string) $raw) {
                                $display = (string) ($choice['label'] ?? $display);
                                break;
                            }
                        }
                    }
                }
                $lines[] = $label . ' : ' . $display;
            }

            return $lines;
        } catch (Throwable $e) {
            return [];
        }
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function extractCareOptions(array $payload): array
    {
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $care = is_array($formData['care_options'] ?? null) ? $formData['care_options'] : [];
        if ($care !== []) {
            return $care;
        }
        $formDataByService = is_array($payload['formDataByService'] ?? null) ? $payload['formDataByService'] : [];
        foreach ($payload['selected_services'] ?? [] as $svc) {
            if (!is_array($svc)) {
                continue;
            }
            $sid = (string) ($svc['id'] ?? '');
            $svcForm = is_array($formDataByService[$sid] ?? null) ? $formDataByService[$sid] : [];
            $svcCare = is_array($svcForm['care_options'] ?? null) ? $svcForm['care_options'] : [];
            if ($svcCare !== []) {
                return $svcCare;
            }
        }

        return [];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function resolveProfileAddress(array $payload, array $user, string $patientId, string $role): array
    {
        $address = $payload['address'] ?? null;
        if (!$this->shouldUseProfileAddress($address, $payload)) {
            return $payload;
        }

        try {
            $profile = $this->userModel->getById(
                $patientId,
                (string) $user['user_id'],
                $role,
                'mobile',
            );
        } catch (Throwable $e) {
            return $payload;
        }

        $profileAddress = is_array($profile['address'] ?? null) ? $profile['address'] : null;
        if (!$profileAddress || trim((string) ($profileAddress['label'] ?? '')) === '') {
            return $payload;
        }

        $lat = $profileAddress['lat'] ?? null;
        $lng = $profileAddress['lng'] ?? null;
        if (!is_numeric($lat) || !is_numeric($lng) || ((float) $lat === 0.0 && (float) $lng === 0.0)) {
            return $payload;
        }

        $payload['address'] = [
            'label' => (string) $profileAddress['label'],
            'lat' => (float) $lat,
            'lng' => (float) $lng,
            'complement' => $profileAddress['complement'] ?? null,
            'city' => $profileAddress['city'] ?? null,
            'postal_code' => $profileAddress['postal_code'] ?? null,
        ];
        $payload['use_profile_address'] = true;

        return $payload;
    }

    /**
     * @param array<string, mixed>|null $address
     * @param array<string, mixed> $payload
     */
    private function shouldUseProfileAddress(?array $address, array $payload): bool
    {
        if (!empty($payload['use_profile_address'])) {
            return true;
        }

        if (!is_array($address)) {
            return true;
        }

        $label = mb_strtolower(trim((string) ($address['label'] ?? '')));
        $placeholders = [
            'adresse du compte',
            'mon compte',
            'même adresse',
            'meme adresse',
            'adresse enregistrée',
            'adresse enregistree',
            'adresse du profil',
            'mon adresse',
        ];
        foreach ($placeholders as $needle) {
            if ($label !== '' && str_contains($label, $needle)) {
                return true;
            }
        }

        $lat = $address['lat'] ?? null;
        $lng = $address['lng'] ?? null;

        return !is_numeric($lat) || !is_numeric($lng)
            || trim((string) ($address['label'] ?? '')) === ''
            || ((float) $lat === 0.0 && (float) $lng === 0.0);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeAvailability(array $payload): array
    {
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $availabilityRaw = $formData['availability'] ?? $payload['availability'] ?? null;
        $availability = $this->parseAvailability($availabilityRaw);

        if ($availability === null) {
            $availability = $this->inferAvailabilityFromScheduledAt($payload['scheduled_at'] ?? null);
        }

        if ($availability !== null) {
            $formData['availability'] = json_encode($availability, JSON_UNESCAPED_UNICODE);
        }

        $scheduledAt = $payload['scheduled_at'] ?? $formData['scheduled_at'] ?? null;
        if ($scheduledAt !== null && $availability !== null) {
            $enriched = $this->enrichScheduledAt((string) $scheduledAt, $availability);
            if ($enriched !== null) {
                $payload['scheduled_at'] = $enriched;
                $formData['scheduled_at'] = $enriched;
            }
        }

        $payload['form_data'] = $formData;

        return $payload;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function parseAvailability(mixed $raw): ?array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function inferAvailabilityFromScheduledAt(mixed $scheduledAt): ?array
    {
        if ($scheduledAt === null || trim((string) $scheduledAt) === '') {
            return null;
        }
        $raw = trim((string) $scheduledAt);
        if (!preg_match('/(\d{1,2}):(\d{2})/', $raw, $m)) {
            return ['type' => 'all_day'];
        }
        $hour = (int) $m[1];
        if ($hour < 0 || $hour > 23) {
            return ['type' => 'all_day'];
        }
        $end = min(23, $hour + 1);

        return ['type' => 'custom', 'range' => [$hour, $end]];
    }

    /**
     * @param array<string, mixed> $availability
     */
    private function enrichScheduledAt(string $scheduledAt, array $availability): ?string
    {
        $raw = trim($scheduledAt);
        if ($raw === '') {
            return null;
        }
        if (str_contains($raw, 'T') || (str_contains($raw, ' ') && strlen($raw) > 10)) {
            return $raw;
        }

        $dateOnly = substr($raw, 0, 10);
        $h = 9;
        $min = 0;
        $type = (string) ($availability['type'] ?? '');

        if ($type === 'all_day') {
            $h = 0;
            $min = 0;
        } elseif ($type === 'custom' && is_array($availability['range'] ?? null) && count($availability['range']) === 2) {
            $h = (int) floor((float) $availability['range'][0]);
            $min = 0;
        } elseif ($type === 'urgent') {
            if (!empty($availability['asap'])) {
                $h = 6;
                $min = 0;
            } else {
                $h = (int) floor((float) ($availability['hour'] ?? 9));
                $min = (int) ($availability['minute'] ?? 0);
            }
        }

        return sprintf('%s %02d:%02d:00', $dateOnly, max(0, min(23, $h)), max(0, min(59, $min)));
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function prefillProfileDocuments(array $payload, string $patientId, string $userId, string $role): array
    {
        if ($role !== 'patient' && $patientId !== $userId) {
            return $payload;
        }

        $relativeId = isset($payload['relative_id']) ? (string) $payload['relative_id'] : '';
        $docs = $relativeId !== ''
            ? PatientDossierDocuments::listForRelative($this->db, $patientId, $relativeId)
            : PatientDossierDocuments::listForPatient($this->db, $patientId);

        if ($docs === []) {
            return $payload;
        }

        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $files = is_array($formData['files'] ?? null) ? $formData['files'] : [];
        if (!is_array($payload['files'] ?? null)) {
            $payload['files'] = [];
        }

        foreach ($docs as $doc) {
            $type = (string) ($doc['document_type'] ?? '');
            $medId = (string) ($doc['medical_document_id'] ?? '');
            if ($type === '' || $medId === '') {
                continue;
            }
            $ref = [
                'medical_document_id' => $medId,
                'isNew' => false,
                'field' => $type,
            ];
            if (!isset($files[$type])) {
                $files[$type] = $ref;
            }
            if (!isset($payload['files'][$type])) {
                $payload['files'][$type] = $ref;
            }
        }

        $formData['files'] = $files;
        $payload['form_data'] = $formData;

        return $payload;
    }

    /**
     * Panier multi-soins aligné wizard (selected_services + formDataByService).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function normalizeSelectedServices(array $payload): array
    {
        $services = $payload['selected_services'] ?? null;
        if (!is_array($services) || $services === []) {
            if (!empty($payload['category_id']) || !empty($payload['category_name'])) {
                $sid = (string) ($payload['service_id'] ?? Uuid::v4());
                $payload['service_id'] = $sid;
                $name = trim((string) ($payload['category_name'] ?? ''));
                if ($name === '' && !empty($payload['category_id'])) {
                    $name = $this->categoryNameById((string) $payload['category_id']) ?? '';
                }
                $payload['selected_services'] = [[
                    'id' => $sid,
                    'type' => (string) ($payload['type'] ?? 'nursing'),
                    'category_id' => $payload['category_id'] ?? null,
                    'category_name' => $name,
                    'name' => $name,
                ]];
            }

            return $payload;
        }

        $normalized = [];
        foreach ($services as $svc) {
            if (!is_array($svc)) {
                continue;
            }
            $id = (string) ($svc['id'] ?? Uuid::v4());
            $catId = $svc['category_id'] ?? null;
            $name = trim((string) ($svc['name'] ?? $svc['category_name'] ?? ''));
            if ($name === '' && $catId) {
                $name = $this->categoryNameById((string) $catId) ?? '';
            }
            $normalized[] = [
                'id' => $id,
                'type' => (string) ($svc['type'] ?? 'nursing'),
                'category_id' => $catId,
                'category_name' => $name,
                'name' => $name,
            ];
        }
        $payload['selected_services'] = $normalized;

        $formDataByService = is_array($payload['formDataByService'] ?? null) ? $payload['formDataByService'] : [];
        $sharedForm = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        foreach ($normalized as $svc) {
            $sid = (string) $svc['id'];
            if (!isset($formDataByService[$sid]) || !is_array($formDataByService[$sid])) {
                $formDataByService[$sid] = [
                    'scheduled_at' => $payload['scheduled_at'] ?? ($sharedForm['scheduled_at'] ?? null),
                    'availability' => $sharedForm['availability'] ?? null,
                    'files' => $payload['files'] ?? ($sharedForm['files'] ?? []),
                    'care_options' => is_array($sharedForm['care_options'] ?? null) ? $sharedForm['care_options'] : [],
                ];
            }
        }
        $payload['formDataByService'] = $formDataByService;

        if (count($normalized) === 1) {
            $first = $normalized[0];
            $payload['type'] = $first['type'];
            $payload['category_id'] = $first['category_id'];
            $payload['category_name'] = $first['name'];
        }

        return $payload;
    }

    private function categoryNameById(string $id): ?string
    {
        $stmt = $this->db->prepare('SELECT name FROM care_categories WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? (string) ($row['name'] ?? '') : null;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public static function buildRecap(array $payload): array
    {
        $address = $payload['address'] ?? null;
        $label = is_array($address) ? ($address['label'] ?? null) : null;
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $availabilityRaw = $formData['availability'] ?? $payload['availability'] ?? null;
        $availability = is_string($availabilityRaw)
            ? json_decode($availabilityRaw, true)
            : (is_array($availabilityRaw) ? $availabilityRaw : null);

        $scheduledAt = $payload['scheduled_at'] ?? $formData['scheduled_at'] ?? null;
        $dateLabel = self::formatDateFr($scheduledAt);
        $slotLabel = self::formatAvailabilityFr(is_array($availability) ? $availability : null, $scheduledAt);

        $files = is_array($payload['files'] ?? null) ? $payload['files'] : [];
        $profileDocs = [];
        $attachedDocs = [];
        $profileTypes = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];
        foreach (['carte_vitale', 'carte_mutuelle', 'ordonnance', 'autres_assurances'] as $key) {
            if (isset($files[$key])) {
                if (in_array($key, $profileTypes, true)) {
                    $profileDocs[] = $key;
                }
                $attachedDocs[] = $key;
            }
        }

        $documentEntries = self::buildDocumentEntries($payload);

        $services = [];
        foreach ($payload['selected_services'] ?? [] as $svc) {
            if (!is_array($svc)) {
                continue;
            }
            $services[] = [
                'name' => $svc['name'] ?? null,
                'type' => $svc['type'] ?? null,
                'category_name' => $svc['category_name'] ?? null,
            ];
        }
        if ($services === [] && !empty($payload['category_name'])) {
            $services[] = [
                'name' => $payload['category_name'],
                'type' => $payload['type'] ?? null,
                'category_name' => $payload['category_name'],
            ];
        }

        $beneficiaryName = trim(
            (string) ($formData['first_name'] ?? '') . ' ' . (string) ($formData['last_name'] ?? ''),
        );
        if ($beneficiaryName === '') {
            $beneficiaryName = trim(
                (string) ($formData['beneficiary_first_name'] ?? '')
                . ' '
                . (string) ($formData['beneficiary_last_name'] ?? ''),
            );
        }

        return [
            'type' => $payload['type'] ?? null,
            'category_id' => $payload['category_id'] ?? null,
            'category_name' => $payload['category_name'] ?? null,
            'scheduled_at' => $scheduledAt,
            'date_label' => $dateLabel,
            'slot_label' => $slotLabel,
            'address_label' => $label,
            'beneficiary_name' => $beneficiaryName !== '' ? $beneficiaryName : null,
            'patient_mode' => $payload['patient_mode'] ?? null,
            'profile_documents' => $profileDocs,
            'attached_documents' => $attachedDocs,
            'document_entries' => $documentEntries,
            'missing_documents' => self::missingDocumentsForType((string) ($payload['type'] ?? '')),
            'ordonnance_status' => $payload['ordonnance_status'] ?? null,
            'booking_step' => $payload['booking_step'] ?? null,
            'services' => $services,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return list<array{type: string, label: string, source: string, medical_document_id: string, file_name: ?string}>
     */
    private static function buildDocumentEntries(array $payload): array
    {
        $files = is_array($payload['files'] ?? null) ? $payload['files'] : [];
        $formData = is_array($payload['form_data'] ?? null) ? $payload['form_data'] : [];
        $formFiles = is_array($formData['files'] ?? null) ? $formData['files'] : [];
        $merged = array_merge($formFiles, $files);

        $labels = [
            'carte_vitale' => 'Carte Vitale',
            'carte_mutuelle' => 'Carte mutuelle',
            'autres_assurances' => 'Autres assurances',
            'ordonnance' => 'Ordonnance',
        ];
        $profileTypes = ['carte_vitale', 'carte_mutuelle', 'autres_assurances'];
        $order = ['carte_vitale', 'carte_mutuelle', 'autres_assurances', 'ordonnance'];
        $entries = [];

        foreach ($order as $key) {
            if (!isset($merged[$key]) || !is_array($merged[$key])) {
                continue;
            }
            $ref = $merged[$key];
            $medId = trim((string) ($ref['medical_document_id'] ?? ''));
            if ($medId === '') {
                continue;
            }
            $entries[] = [
                'type' => $key,
                'label' => $labels[$key] ?? $key,
                'source' => in_array($key, $profileTypes, true) ? 'profile' : 'appointment',
                'medical_document_id' => $medId,
                'file_name' => isset($ref['file_name']) ? (string) $ref['file_name'] : null,
            ];
        }

        return $entries;
    }

    private static function formatDateFr(mixed $scheduledAt): ?string
    {
        if ($scheduledAt === null || trim((string) $scheduledAt) === '') {
            return null;
        }
        try {
            $raw = trim((string) $scheduledAt);
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
                $paris = new DateTimeImmutable($raw, new DateTimeZone('Europe/Paris'));
            } else {
                $dt = new DateTimeImmutable($raw, new DateTimeZone('UTC'));
                $paris = $dt->setTimezone(new DateTimeZone('Europe/Paris'));
            }
            $days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
            $months = [
                1 => 'janvier', 2 => 'février', 3 => 'mars', 4 => 'avril',
                5 => 'mai', 6 => 'juin', 7 => 'juillet', 8 => 'août',
                9 => 'septembre', 10 => 'octobre', 11 => 'novembre', 12 => 'décembre',
            ];
            $dow = $days[(int) $paris->format('w')];
            $month = $months[(int) $paris->format('n')] ?? $paris->format('m');

            return ucfirst($dow) . ' ' . $paris->format('j') . ' ' . $month . ' ' . $paris->format('Y');
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * @param array<string, mixed>|null $availability
     */
    private static function formatAvailabilityFr(?array $availability, mixed $scheduledAt): ?string
    {
        if (is_array($availability)) {
            $type = (string) ($availability['type'] ?? '');
            if ($type === 'all_day') {
                return 'Toute la journée';
            }
            if ($type === 'custom' && is_array($availability['range'] ?? null) && count($availability['range']) === 2) {
                $start = (int) floor((float) $availability['range'][0]);
                $end = (int) floor((float) $availability['range'][1]);

                return sprintf('%dh00 - %dh00', $start, $end);
            }
            if ($type === 'urgent') {
                return !empty($availability['asap']) ? 'Dès que possible (VIP)' : 'Créneau VIP';
            }
        }

        if ($scheduledAt === null) {
            return null;
        }

        try {
            $dt = new DateTimeImmutable((string) $scheduledAt, new DateTimeZone('UTC'));
            $paris = $dt->setTimezone(new DateTimeZone('Europe/Paris'));

            return $paris->format('H') . 'h' . $paris->format('i');
        } catch (Throwable $e) {
            return null;
        }
    }

    /**
     * @return list<string>
     */
    private static function missingDocumentsForType(string $type): array
    {
        if (in_array($type, ['blood_test', 'nursing'], true)) {
            return ['ordonnance'];
        }

        return [];
    }
}
