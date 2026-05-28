<?php

declare(strict_types=1);

require_once __DIR__ . '/CarePhotoGallery.php';
require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/../models/User.php';

/**
 * Recherche hub patient staff (nurse / pro) — liste unifiée patients, documents, échanges.
 */
final class StaffPatientHubSearch
{
    private const DOCUMENT_TYPE_LABELS = [
        'carte_vitale' => 'Carte Vitale',
        'carte_mutuelle' => 'Carte mutuelle',
        'ordonnance' => 'Ordonnance',
        'resultats' => 'Résultats',
        'autres_assurances' => 'Autre prescription',
        'care_photo' => 'Photo de soin',
        'cancellation_photo' => 'Photo annulation',
        'other' => 'Autre',
    ];

    private PDO $db;
    private User $userModel;

    public function __construct(PDO $db, ?User $userModel = null)
    {
        $this->db = $db;
        $this->userModel = $userModel ?? new User();
    }

    /**
     * @return array{items: list<array<string, mixed>>}
     */
    public function search(array $user, string $query, int $limit = 50): array
    {
        $role = (string) ($user['role'] ?? '');
        if (!in_array($role, ['nurse', 'pro'], true)) {
            return ['items' => []];
        }

        $limit = max(1, min(80, $limit));
        $q = $this->normalizeText($query);
        $patients = $this->loadScopedPatients($user);
        $patientMap = [];
        foreach ($patients as $p) {
            $patientMap[(string) $p['id']] = $p;
        }
        $patientIds = array_keys($patientMap);
        if ($patientIds === []) {
            return ['items' => []];
        }

        $matchedPatientIds = [];
        $items = [];
        $recentOnly = ($q === '');

        if ($recentOnly) {
            foreach ($patients as $p) {
                $items[] = $this->patientItem($p);
            }
        } else {
            foreach ($patients as $p) {
                if (!$this->patientMatchesQuery($p, $q)) {
                    continue;
                }
                $matchedPatientIds[] = (string) $p['id'];
                $items[] = $this->patientItem($p);
            }
        }

        $docItems = $recentOnly
            ? []
            : $this->loadDocumentItems($patientIds, $patientMap, $q, $matchedPatientIds, false);
        $exchangeItems = $recentOnly
            ? []
            : $this->loadExchangeItems($user, $patientIds, $patientMap, $q, $matchedPatientIds, false);

        $items = array_merge($items, $docItems, $exchangeItems);

        return ['items' => $this->dedupeAndSort($items, $limit)];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadScopedPatients(array $user): array
    {
        $filters = ['role' => 'patient'];
        $role = (string) ($user['role'] ?? '');
        if (in_array($role, ['pro', 'nurse', 'subaccount'], true)) {
            $filters['created_by'] = $user['user_id'];
        } elseif ($role === 'lab') {
            $filters['for_lab_owner_id'] = $user['user_id'];
        }

        $all = [];
        $page = 1;
        $maxPages = 15;
        do {
            $result = $this->userModel->getAll(
                $filters,
                $page,
                100,
                (string) ($user['user_id'] ?? ''),
                $role
            );
            $all = array_merge($all, $result['data'] ?? []);
            $pages = (int) ($result['pages'] ?? 1);
            $page++;
        } while ($page <= $pages && $page <= $maxPages);

        return $all;
    }

    /**
     * @param list<string> $patientIds
     * @param array<string, array<string, mixed>> $patientMap
     * @param list<string> $matchedPatientIds
     * @return list<array<string, mixed>>
     */
    private function loadDocumentItems(
        array $patientIds,
        array $patientMap,
        string $q,
        array $matchedPatientIds,
        bool $recentOnly = false
    ): array {
        if ($patientIds === []) {
            return [];
        }

        $items = [];
        $placeholders = implode(',', array_fill(0, count($patientIds), '?'));

        // Documents profil patient
        $stmt = $this->db->prepare("
            SELECT
                pd.id AS patient_document_id,
                pd.patient_id,
                pd.document_type,
                pd.updated_at,
                md.id AS medical_document_id,
                md.file_name,
                md.appointment_id,
                md.created_at AS uploaded_at
            FROM patient_documents pd
            LEFT JOIN medical_documents md ON pd.medical_document_id = md.id
            WHERE pd.patient_id IN ($placeholders)
        ");
        $stmt->execute($patientIds);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $mapped = $this->mapDocumentRow($row, $patientMap, 'profile', null, $q, $matchedPatientIds, $recentOnly);
            if ($mapped) {
                $items[] = $mapped;
            }
        }

        // Documents proches
        $relTable = $this->db->query("SHOW TABLES LIKE 'patient_relative_documents'")->rowCount() > 0;
        if ($relTable) {
            $relStmt = $this->db->prepare("
                SELECT
                    prd.id AS patient_document_id,
                    prd.patient_id,
                    prd.relative_id,
                    prd.document_type,
                    prd.updated_at,
                    md.id AS medical_document_id,
                    md.file_name,
                    md.created_at AS uploaded_at,
                    pr.first_name_encrypted,
                    pr.first_name_dek,
                    pr.last_name_encrypted,
                    pr.last_name_dek
                FROM patient_relative_documents prd
                LEFT JOIN medical_documents md ON prd.medical_document_id = md.id
                LEFT JOIN patient_relatives pr ON pr.id = prd.relative_id
                WHERE prd.patient_id IN ($placeholders)
            ");
            $relStmt->execute($patientIds);
            foreach ($relStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $relativeName = $this->decryptRelativeName($row);
                $mapped = $this->mapDocumentRow($row, $patientMap, 'relative', $relativeName, $q, $matchedPatientIds, $recentOnly);
                if ($mapped) {
                    $items[] = $mapped;
                }
            }
        }

        // Documents RDV (hors care_photo — traitées comme échanges si commentées)
        $aptStmt = $this->db->prepare("
            SELECT
                md.id AS medical_document_id,
                md.appointment_id,
                md.document_type,
                md.file_name,
                md.created_at AS uploaded_at,
                a.patient_id
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            WHERE a.patient_id IN ($placeholders)
              AND md.document_type IS NOT NULL
              AND md.document_type <> 'care_photo'
        ");
        $aptStmt->execute($patientIds);
        foreach ($aptStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $mapped = $this->mapDocumentRow($row, $patientMap, 'appointment', null, $q, $matchedPatientIds, $recentOnly);
            if ($mapped) {
                $items[] = $mapped;
            }
        }

        // Photos de soin sans fil commentaire = document
        $photoStmt = $this->db->prepare("
            SELECT
                md.id AS medical_document_id,
                md.appointment_id,
                md.document_type,
                md.file_name,
                md.created_at AS uploaded_at,
                a.patient_id,
                (SELECT COUNT(*) FROM appointment_care_photo_comments c WHERE c.medical_document_id = md.id) AS comment_count
            FROM medical_documents md
            INNER JOIN appointments a ON a.id = md.appointment_id
            WHERE a.patient_id IN ($placeholders)
              AND md.document_type = 'care_photo'
        ");
        $photoStmt->execute($patientIds);
        foreach ($photoStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if ((int) ($row['comment_count'] ?? 0) > 0) {
                continue;
            }
            $mapped = $this->mapDocumentRow($row, $patientMap, 'appointment', null, $q, $matchedPatientIds, $recentOnly);
            if ($mapped) {
                $items[] = $mapped;
            }
        }

        if ($recentOnly) {
            usort($items, static fn ($a, $b) => strcmp((string) ($b['sort_at'] ?? ''), (string) ($a['sort_at'] ?? '')));

            return array_slice($items, 0, 15);
        }

        return $items;
    }

    /**
     * @param list<string> $patientIds
     * @param array<string, array<string, mixed>> $patientMap
     * @param list<string> $matchedPatientIds
     * @return list<array<string, mixed>>
     */
    private function loadExchangeItems(
        array $user,
        array $patientIds,
        array $patientMap,
        string $q,
        array $matchedPatientIds,
        bool $recentOnly = false
    ): array {
        if ($patientIds === []) {
            return [];
        }

        $uid = (string) ($user['user_id'] ?? '');
        $role = (string) ($user['role'] ?? '');
        $placeholders = implode(',', array_fill(0, count($patientIds), '?'));

        $sql = "
            SELECT
                md.id AS medical_document_id,
                md.appointment_id,
                a.patient_id,
                a.assigned_nurse_id,
                a.created_by,
                MAX(c.created_at) AS last_at,
                (
                    SELECT c2.body
                    FROM appointment_care_photo_comments c2
                    WHERE c2.medical_document_id = md.id
                    ORDER BY c2.created_at DESC
                    LIMIT 1
                ) AS last_body
            FROM appointment_care_photo_comments c
            INNER JOIN medical_documents md ON md.id = c.medical_document_id
            INNER JOIN appointments a ON a.id = md.appointment_id
            WHERE a.patient_id IN ($placeholders)
              AND a.type = 'nursing'
              AND a.created_by_role = 'pro'
        ";

        if ($role === 'nurse') {
            $sql .= ' AND a.assigned_nurse_id = ?';
        } elseif ($role === 'pro') {
            if ($this->hasPatientProfessionalAccessTable()) {
                $sql .= ' AND (a.created_by = ? OR EXISTS (
                    SELECT 1 FROM patient_professional_access ppa
                    WHERE ppa.patient_id = a.patient_id AND ppa.professional_id = ?
                ))';
            } else {
                $sql .= ' AND a.created_by = ?';
            }
        }

        $sql .= '
            GROUP BY md.id, md.appointment_id, a.patient_id, a.assigned_nurse_id, a.created_by
            ORDER BY last_at DESC
            LIMIT 120
        ';

        $params = $patientIds;
        if ($role === 'nurse') {
            $params[] = $uid;
        } elseif ($role === 'pro') {
            $params[] = $uid;
            if ($this->hasPatientProfessionalAccessTable()) {
                $params[] = $uid;
            }
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counterpartIds = [];
        foreach ($rows as $row) {
            if ($role === 'nurse') {
                $counterpartIds[] = (string) ($row['created_by'] ?? '');
            } else {
                $counterpartIds[] = (string) ($row['assigned_nurse_id'] ?? '');
            }
        }
        $names = $this->userModel->getDisplayNamesByIds($counterpartIds);

        $items = [];
        foreach ($rows as $row) {
            $pid = (string) ($row['patient_id'] ?? '');
            $patient = $patientMap[$pid] ?? null;
            if (!$patient) {
                continue;
            }

            $include = $recentOnly || in_array($pid, $matchedPatientIds, true);
            if (!$include && $q !== '') {
                $label = $this->documentTypeLabel((string) ($row['document_type'] ?? 'care_photo'));
                $haystack = $this->normalizeText(
                    $this->patientDisplayName($patient)
                    . ' '
                    . ($row['last_body'] ?? '')
                    . ' '
                    . $label
                );
                if (str_contains($haystack, $q)) {
                    $include = true;
                }
            }
            if (!$include) {
                continue;
            }

            $counterpartId = $role === 'nurse'
                ? (string) ($row['created_by'] ?? '')
                : (string) ($row['assigned_nurse_id'] ?? '');
            $counterpartName = $names[$counterpartId] ?? ($role === 'nurse' ? 'Professionnel' : 'Infirmier');

            $items[] = [
                'kind' => 'exchange',
                'id' => 'exchange:' . ($row['medical_document_id'] ?? ''),
                'medical_document_id' => (string) ($row['medical_document_id'] ?? ''),
                'appointment_id' => (string) ($row['appointment_id'] ?? ''),
                'patient_id' => $pid,
                'patient_name' => $this->patientDisplayName($patient),
                'patient_profile_image_url' => $patient['profile_image_url'] ?? null,
                'counterpart_name' => $counterpartName,
                'last_message' => $this->truncate((string) ($row['last_body'] ?? ''), 120),
                'sort_at' => (string) ($row['last_at'] ?? ''),
                'subtitle' => $counterpartName,
            ];
        }

        if ($recentOnly) {
            return array_slice($items, 0, 12);
        }

        return $items;
    }

    /**
     * @param array<string, mixed> $row
     * @param array<string, array<string, mixed>> $patientMap
     * @param list<string> $matchedPatientIds
     * @return array<string, mixed>|null
     */
    private function mapDocumentRow(
        array $row,
        array $patientMap,
        string $source,
        ?string $relativeName,
        string $q,
        array $matchedPatientIds,
        bool $recentOnly = false
    ): ?array {
        $pid = (string) ($row['patient_id'] ?? '');
        $patient = $patientMap[$pid] ?? null;
        if (!$patient) {
            return null;
        }

        $docType = (string) ($row['document_type'] ?? 'other');
        $typeLabel = $this->documentTypeLabel($docType);
        $fileName = (string) ($row['file_name'] ?? '');
        $title = $typeLabel !== '' ? $typeLabel : ($fileName !== '' ? $fileName : 'Document');

        $include = $recentOnly || in_array($pid, $matchedPatientIds, true);
        if (!$include && $q !== '') {
            $haystack = $this->normalizeText(
                $this->patientDisplayName($patient)
                . ' '
                . $title
                . ' '
                . $fileName
                . ' '
                . ($relativeName ?? '')
            );
            if (str_contains($haystack, $q)) {
                $include = true;
            }
        }
        if (!$include) {
            return null;
        }

        $sortAt = (string) ($row['uploaded_at'] ?? $row['updated_at'] ?? '');
        $patientName = $this->patientDisplayName($patient);
        $subtitle = $patientName;
        if ($relativeName) {
            $subtitle = $patientName . ' · ' . $relativeName;
        } elseif ($source === 'appointment' && !empty($row['appointment_id'])) {
            $subtitle = $patientName . ' · RDV';
        }

        return [
            'kind' => 'document',
            'id' => 'document:' . ($row['medical_document_id'] ?? $row['patient_document_id'] ?? ''),
            'medical_document_id' => isset($row['medical_document_id']) ? (string) $row['medical_document_id'] : null,
            'patient_document_id' => isset($row['patient_document_id']) ? (string) $row['patient_document_id'] : null,
            'patient_id' => $pid,
            'patient_name' => $patientName,
            'patient_profile_image_url' => $patient['profile_image_url'] ?? null,
            'document_type' => $docType,
            'title' => $title,
            'file_name' => $fileName !== '' ? $fileName : null,
            'source' => $source,
            'appointment_id' => ($source === 'appointment' && !empty($row['appointment_id']))
                ? (string) $row['appointment_id']
                : null,
            'relative_id' => isset($row['relative_id']) ? (string) $row['relative_id'] : null,
            'relative_name' => $relativeName,
            'sort_at' => $sortAt,
            'subtitle' => $subtitle,
        ];
    }

    /**
     * @param array<string, mixed> $patient
     * @return array<string, mixed>
     */
    private function patientItem(array $patient): array
    {
        $updated = (string) ($patient['updated_at'] ?? $patient['created_at'] ?? '');

        return [
            'kind' => 'patient',
            'id' => 'patient:' . ($patient['id'] ?? ''),
            'patient_id' => (string) ($patient['id'] ?? ''),
            'first_name' => (string) ($patient['first_name'] ?? ''),
            'last_name' => (string) ($patient['last_name'] ?? ''),
            'email' => (string) ($patient['email'] ?? ''),
            'phone' => $patient['phone'] ?? null,
            'birth_date' => $patient['birth_date'] ?? null,
            'gender' => $patient['gender'] ?? null,
            'profile_image_url' => $patient['profile_image_url'] ?? null,
            'created_by' => $patient['created_by'] ?? null,
            'sort_at' => $updated,
            'subtitle' => $this->patientListSubtitle($patient),
        ];
    }

    /**
     * @param list<array<string, mixed>> $items
     * @return list<array<string, mixed>>
     */
    private function dedupeAndSort(array $items, int $limit): array
    {
        $byId = [];
        $docSlots = [];

        foreach ($items as $item) {
            $id = (string) ($item['id'] ?? '');
            if ($id === '') {
                continue;
            }

            if (($item['kind'] ?? '') === 'document') {
                $slotKey = (string) ($item['patient_id'] ?? '') . ':' . (string) ($item['document_type'] ?? '');
                if (isset($docSlots[$slotKey])) {
                    $existingId = $docSlots[$slotKey];
                    $existing = $byId[$existingId] ?? null;
                    if ($existing !== null && !$this->preferDocumentItem($item, $existing)) {
                        continue;
                    }
                    unset($byId[$existingId]);
                }
                $docSlots[$slotKey] = $id;
            } elseif (isset($byId[$id])) {
                continue;
            }

            $byId[$id] = $item;
        }

        $unique = array_values($byId);

        usort($unique, static function (array $a, array $b): int {
            $ta = strtotime((string) ($a['sort_at'] ?? '')) ?: 0;
            $tb = strtotime((string) ($b['sort_at'] ?? '')) ?: 0;
            return $tb <=> $ta;
        });

        $out = [];
        foreach (array_slice($unique, 0, $limit) as $item) {
            $item['activity_at'] = $item['sort_at'] ?? null;
            unset($item['sort_at']);
            $out[] = $item;
        }

        return $out;
    }

    /**
     * @param array<string, mixed> $candidate
     * @param array<string, mixed> $existing
     */
    private function preferDocumentItem(array $candidate, array $existing): bool
    {
        $docType = (string) ($candidate['document_type'] ?? '');
        if (in_array($docType, ['carte_vitale', 'carte_mutuelle'], true)) {
            $cProfile = ($candidate['source'] ?? '') === 'profile';
            $eProfile = ($existing['source'] ?? '') === 'profile';
            if ($cProfile !== $eProfile) {
                return $cProfile;
            }
        }

        $cMed = trim((string) ($candidate['medical_document_id'] ?? '')) !== '';
        $eMed = trim((string) ($existing['medical_document_id'] ?? '')) !== '';
        if ($cMed !== $eMed) {
            return $cMed;
        }

        $cApt = ($candidate['source'] ?? '') === 'appointment';
        $eApt = ($existing['source'] ?? '') === 'appointment';
        if ($cApt !== $eApt) {
            return $cApt;
        }

        $tc = strtotime((string) ($candidate['sort_at'] ?? '')) ?: 0;
        $te = strtotime((string) ($existing['sort_at'] ?? '')) ?: 0;

        return $tc >= $te;
    }

    /**
     * @param array<string, mixed> $patient
     */
    private function patientMatchesQuery(array $patient, string $q): bool
    {
        if ($q === '') {
            return true;
        }
        $full = trim(((string) ($patient['first_name'] ?? '')) . ' ' . ((string) ($patient['last_name'] ?? '')));
        $fields = [
            (string) ($patient['first_name'] ?? ''),
            (string) ($patient['last_name'] ?? ''),
            $full,
            (string) ($patient['email'] ?? ''),
            (string) ($patient['phone'] ?? ''),
        ];
        foreach ($fields as $field) {
            if ($field !== '' && str_contains($this->normalizeText($field), $q)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $patient
     */
    private function patientDisplayName(array $patient): string
    {
        $name = trim(((string) ($patient['first_name'] ?? '')) . ' ' . ((string) ($patient['last_name'] ?? '')));

        return $name !== '' ? $name : 'Patient';
    }

    /**
     * @param array<string, mixed> $patient
     */
    private function patientListSubtitle(array $patient): string
    {
        $email = trim((string) ($patient['email'] ?? ''));
        if ($email !== '' && !str_ends_with($email, '@patients.internal.local')) {
            return $email;
        }
        $phone = trim((string) ($patient['phone'] ?? ''));

        return $phone;
    }

    private function documentTypeLabel(string $type): string
    {
        return self::DOCUMENT_TYPE_LABELS[$type] ?? str_replace('_', ' ', $type);
    }

    private function normalizeText(string $value): string
    {
        $value = trim(mb_strtolower($value));

        return $value;
    }

    private function truncate(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) {
            return $value;
        }

        return rtrim(mb_substr($value, 0, $max - 1)) . '…';
    }

    private function hasPatientProfessionalAccessTable(): bool
    {
        try {
            return $this->db->query("SHOW TABLES LIKE 'patient_professional_access'")->rowCount() > 0;
        } catch (Throwable $e) {
            return false;
        }
    }

    /**
     * @param array<string, mixed> $row
     */
    private function decryptRelativeName(array $row): ?string
    {
        try {
            $crypto = new Crypto();
            $first = !empty($row['first_name_encrypted']) && !empty($row['first_name_dek'])
                ? trim($crypto->decryptField($row['first_name_encrypted'], $row['first_name_dek'])) : '';
            $last = !empty($row['last_name_encrypted']) && !empty($row['last_name_dek'])
                ? trim($crypto->decryptField($row['last_name_encrypted'], $row['last_name_dek'])) : '';
            $name = trim($first . ' ' . $last);

            return $name !== '' ? $name : null;
        } catch (Throwable $e) {
            return null;
        }
    }
}
