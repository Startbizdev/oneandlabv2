<?php

/**
 * Migration des appointments
 * Legacy Appointment → appointments
 */

require_once __DIR__ . '/LegacyCrypto.php';
require_once __DIR__ . '/../../lib/Crypto.php';

class MigrateAppointments
{
    private PDO $db;
    private Crypto $crypto;
    private string $legacyKey;
    private bool $dryRun;

    private const STATUS_MAP = [
        'pending' => 'pending',
        'confirmed' => 'confirmed',
        'planned' => 'planned',
        'completed' => 'completed',
        'cancelled' => 'canceled',
        'canceled' => 'canceled',
        'expired' => 'expired',
        'refused' => 'refused',
    ];

    private const TYPE_MAP = [
        'laboratory' => 'blood_test',
        'homeVisit' => 'nursing',
    ];

    public function __construct(PDO $db, string $legacyEncryptionKey, bool $dryRun = false)
    {
        $this->db = $db;
        $this->crypto = new Crypto();
        $this->legacyKey = $legacyEncryptionKey;
        $this->dryRun = $dryRun;
    }

    private function decryptLegacy(?string $value): string
    {
        if ($value === null || $value === '') return '';
        if (LegacyCrypto::isEncrypted($value)) {
            return LegacyCrypto::decrypt($value, $this->legacyKey);
        }
        return $value;
    }

    /** Convertit availability/timeSlot legacy (fullDay, specificSlot+08:30) vers le format JSON cible */
    private function mapLegacyAvailabilityToNew(?string $availability, ?string $timeSlot): string
    {
        $av = strtolower(trim($availability ?? ''));
        $ts = $timeSlot ? trim($timeSlot) : '';
        if ($av === 'fullday' || $av === 'full_day' || strtolower($ts) === 'fullday') {
            return json_encode(['type' => 'all_day']);
        }
        if ($av === 'specificslot' && $ts !== '') {
            if (preg_match('/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/i', $ts, $m)) {
                $start = (int) $m[1];
                $end = (int) $m[3];
                return json_encode(['type' => 'custom', 'range' => [$start, $end]]);
            }
            if (preg_match('/^(\d{1,2}):(\d{2})$/i', $ts, $m)) {
                $start = (int) $m[1];
                $end = min(17, $start + 2);
                return json_encode(['type' => 'custom', 'range' => [$start, $end]]);
            }
        }
        return json_encode(['type' => 'all_day']);
    }

    private function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    private function getMappedUuid(string $collection, string $legacyId): ?string
    {
        $stmt = $this->db->prepare('SELECT target_uuid FROM legacy_id_mapping WHERE legacy_collection = ? AND legacy_object_id = ?');
        $stmt->execute([$collection, $legacyId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $row['target_uuid'] : null;
    }

    /**
     * Construit form_data et address chiffrés pour un RDV legacy (pour correctif des RDV déjà migrés).
     */
    public function buildFormDataAndAddress(
        array $apt,
        array $profMapping,
        array $patients = [],
        array $relatives = []
    ): ?array {
        $patientLegacyId = $apt['patientId'] ?? '';
        $relativeLegacyId = $apt['relativeId'] ?? '';
        $profLegacyId = $apt['professionalId'] ?? '';
        $profUuid = $profLegacyId ? ($profMapping[$profLegacyId] ?? null) : null;

        $address = $this->decryptLegacy($apt['address'] ?? '');
        $addressLabel = $address ?: 'Adresse non précisée';
        $eAddr = $this->crypto->encryptField($addressLabel);

        $formData = [
            'first_name' => '',
            'last_name' => '',
            'email' => null,
            'phone' => null,
            'birth_date' => null,
            'address_complement' => '',
            'legacy_address' => [
                'full' => $address,
                'addressDetails' => $this->decryptLegacy($apt['addressDetails'] ?? ''),
                'floor' => $this->decryptLegacy($apt['floor'] ?? ''),
                'accessCode' => $this->decryptLegacy($apt['accessCode'] ?? ''),
            ],
            'hasPrescription' => $apt['hasPrescription'] ?? 'sans',
            'reference' => $apt['reference'] ?? null,
            'professionalId' => $profUuid,
            'notes' => $this->decryptLegacy($apt['notes'] ?? ''),
            'availability' => $this->mapLegacyAvailabilityToNew($apt['availability'] ?? null, $apt['timeSlot'] ?? null),
            'desiredDate' => $apt['desiredDate'] ?? null,
            'labQueue' => $apt['labQueue'] ?? [],
            'refusedByLabs' => $apt['refusedByLabs'] ?? [],
            'deletedByLabs' => $apt['deletedByLabs'] ?? [],
            'relativeInfo' => $apt['relativeInfo'] ?? null,
            'mainPatientInfo' => $apt['mainPatientInfo'] ?? null,
            'contactEmail' => $apt['contactEmail'] ?? null,
            'contactPhone' => $apt['contactPhone'] ?? null,
            'isForRelative' => $apt['isForRelative'] ?? false,
            'isRelative' => $apt['isRelative'] ?? false,
            'prescriptionFile' => $apt['prescriptionFile'] ?? null,
            'carteVitaleFile' => $apt['carteVitaleFile'] ?? null,
            'mutuelleFile' => $apt['mutuelleFile'] ?? null,
            'attestationFile' => $apt['attestationFile'] ?? null,
            'analysisResults' => $apt['analysisResults'] ?? null,
        ];

        $subject = null;
        if ($relativeLegacyId && $relatives) {
            foreach ($relatives as $r) {
                if (($r['_id'] ?? '') === $relativeLegacyId) {
                    $subject = $r;
                    break;
                }
            }
        }
        if (!$subject && $patientLegacyId && $patients) {
            foreach ($patients as $p) {
                if (($p['_id'] ?? '') === $patientLegacyId) {
                    $subject = $p;
                    break;
                }
            }
        }
        if ($subject) {
            $formData['first_name'] = $this->decryptLegacy($subject['firstName'] ?? '');
            $formData['last_name'] = $this->decryptLegacy($subject['lastName'] ?? '');
            $formData['email'] = $this->decryptLegacy($subject['email'] ?? '') ?: null;
            $formData['phone'] = $this->decryptLegacy($subject['phone'] ?? '') ?: null;
            $dob = $subject['dateOfBirth'] ?? $subject['birth_date'] ?? null;
            if ($dob) {
                if (is_string($dob)) {
                    $ts = strtotime($dob);
                    $formData['birth_date'] = $ts ? date('Y-m-d', $ts) : null;
                } elseif ($dob instanceof DateTimeInterface) {
                    $formData['birth_date'] = $dob->format('Y-m-d');
                } else {
                    $formData['birth_date'] = null;
                }
            }
        }
        $addrParts = array_filter([
            $this->decryptLegacy($apt['addressDetails'] ?? ''),
            $this->decryptLegacy($apt['floor'] ?? ''),
            $this->decryptLegacy($apt['accessCode'] ?? ''),
        ]);
        $formData['address_complement'] = implode(', ', $addrParts);

        $eFormData = $this->crypto->encryptField(json_encode($formData));

        return [
            'address_encrypted' => $eAddr['encrypted'],
            'address_dek' => $eAddr['dek'],
            'form_data_encrypted' => $eFormData['encrypted'],
            'form_data_dek' => $eFormData['dek'],
        ];
    }

    public function migrate(
        array $apt,
        array $patientMapping,
        array $relativeMapping,
        array $labMapping,
        array $phlebMapping,
        array $profMapping,
        array $userToProfileMapping = [],
        array $patients = [],
        array $relatives = []
    ): ?array {
        $legacyId = $apt['_id'] ?? '';
        if (empty($legacyId)) return null;

        $existing = $this->getMappedUuid('appointments', $legacyId);
        if ($existing) {
            return ['uuid' => $existing, 'legacy_id' => $legacyId];
        }

        $patientLegacyId = $apt['patientId'] ?? '';
        $relativeLegacyId = $apt['relativeId'] ?? '';
        $labLegacyId = $apt['labId'] ?? '';
        $phlebLegacyId = $apt['phlebotomistId'] ?? '';
        $profLegacyId = $apt['professionalId'] ?? '';

        $patientUuid = $patientMapping[$patientLegacyId] ?? null;
        $relativeUuid = $relativeLegacyId ? ($relativeMapping[$relativeLegacyId] ?? null) : null;
        $labUuid = $labLegacyId ? ($labMapping[$labLegacyId] ?? null) : null;
        $phlebUuid = $phlebLegacyId ? ($phlebMapping[$phlebLegacyId] ?? null) : null;
        $profUuid = $profLegacyId ? ($profMapping[$profLegacyId] ?? null) : null;

        if (!$patientUuid && !$relativeUuid) {
            return null;
        }

        $createdByUuid = null;
        $createdByRole = 'patient';
        $createdBy = $apt['createdBy'] ?? null;
        $bookedBy = $apt['bookedBy'] ?? null;
        if ($createdBy && isset($createdBy['userId'])) {
            $cbUserId = $createdBy['userId'];
            if (isset($userToProfileMapping[$cbUserId])) {
                $createdByUuid = $userToProfileMapping[$cbUserId]['uuid'];
                $createdByRole = $userToProfileMapping[$cbUserId]['role'] ?? 'patient';
            } elseif (isset($patientMapping[$cbUserId])) {
                $createdByUuid = $patientMapping[$cbUserId];
                $createdByRole = 'patient';
            } elseif (isset($phlebMapping[$cbUserId])) {
                $createdByUuid = $phlebMapping[$cbUserId];
                $createdByRole = 'preleveur';
            } elseif (isset($profMapping[$cbUserId])) {
                $createdByUuid = $profMapping[$cbUserId];
                $createdByRole = (strpos($createdBy['role'] ?? '', 'nurse') !== false || strpos($createdBy['role'] ?? '', 'professional') !== false) ? 'nurse' : 'pro';
            } elseif (isset($labMapping[$cbUserId])) {
                $createdByUuid = $labMapping[$cbUserId];
                $createdByRole = 'lab';
            }
        }
        if (!$createdByUuid && $bookedBy) {
            $createdByUuid = $userToProfileMapping[$bookedBy]['uuid'] ?? $patientMapping[$bookedBy] ?? null;
            $createdByRole = 'patient';
        }
        if (!$createdByUuid) {
            $createdByUuid = $patientUuid ?? $relativeUuid;
        }

        $legacyType = $apt['type'] ?? '';
        $location = $apt['location'] ?? '';
        $hasLab = !empty($apt['labId']);
        $hasPhleb = !empty($apt['phlebotomistId']);
        if ($location === 'laboratoire' || $hasLab || $hasPhleb) {
            $type = 'blood_test';
        } else {
            $type = self::TYPE_MAP[$legacyType] ?? 'blood_test';
        }
        $status = self::STATUS_MAP[$apt['status'] ?? ''] ?? 'pending';

        $dateTime = $apt['dateTime'] ?? null;
        $scheduledAt = '1970-01-01 00:00:00';
        if ($dateTime) {
            if (is_string($dateTime)) $scheduledAt = date('Y-m-d H:i:s', strtotime($dateTime));
            elseif ($dateTime instanceof DateTimeInterface) $scheduledAt = $dateTime->format('Y-m-d H:i:s');
        }

        $address = $this->decryptLegacy($apt['address'] ?? '');
        $coords = $apt['coordinates'] ?? [];
        $lat = isset($coords['lat']) ? (float) $coords['lat'] : 0.0;
        $lng = isset($coords['lng']) ? (float) $coords['lng'] : 0.0;
        if ($lat === 0.0 && $lng === 0.0 && $address) {
            $lat = 43.3;
            $lng = 5.4;
        }

        $addressLabel = $address ?: 'Adresse non précisée';
        $eAddr = $this->crypto->encryptField($addressLabel);

        $formData = [
            'first_name' => '',
            'last_name' => '',
            'email' => null,
            'phone' => null,
            'birth_date' => null,
            'address_complement' => '',
            'legacy_address' => [
                'full' => $address,
                'addressDetails' => $this->decryptLegacy($apt['addressDetails'] ?? ''),
                'floor' => $this->decryptLegacy($apt['floor'] ?? ''),
                'accessCode' => $this->decryptLegacy($apt['accessCode'] ?? ''),
            ],
            'hasPrescription' => $apt['hasPrescription'] ?? 'sans',
            'reference' => $apt['reference'] ?? null,
            'professionalId' => $profUuid,
            'notes' => $this->decryptLegacy($apt['notes'] ?? ''),
            'availability' => $this->mapLegacyAvailabilityToNew($apt['availability'] ?? null, $apt['timeSlot'] ?? null),
            'desiredDate' => $apt['desiredDate'] ?? null,
            'labQueue' => $apt['labQueue'] ?? [],
            'refusedByLabs' => $apt['refusedByLabs'] ?? [],
            'deletedByLabs' => $apt['deletedByLabs'] ?? [],
            'relativeInfo' => $apt['relativeInfo'] ?? null,
            'mainPatientInfo' => $apt['mainPatientInfo'] ?? null,
            'contactEmail' => $apt['contactEmail'] ?? null,
            'contactPhone' => $apt['contactPhone'] ?? null,
            'isForRelative' => $apt['isForRelative'] ?? false,
            'isRelative' => $apt['isRelative'] ?? false,
            'prescriptionFile' => $apt['prescriptionFile'] ?? null,
            'carteVitaleFile' => $apt['carteVitaleFile'] ?? null,
            'mutuelleFile' => $apt['mutuelleFile'] ?? null,
            'attestationFile' => $apt['attestationFile'] ?? null,
            'analysisResults' => $apt['analysisResults'] ?? null,
        ];

        $subject = null;
        if ($relativeLegacyId && $relatives) {
            foreach ($relatives as $r) {
                if (($r['_id'] ?? '') === $relativeLegacyId) {
                    $subject = $r;
                    break;
                }
            }
        }
        if (!$subject && $patientLegacyId && $patients) {
            foreach ($patients as $p) {
                if (($p['_id'] ?? '') === $patientLegacyId) {
                    $subject = $p;
                    break;
                }
            }
        }
        if ($subject) {
            $formData['first_name'] = $this->decryptLegacy($subject['firstName'] ?? '');
            $formData['last_name'] = $this->decryptLegacy($subject['lastName'] ?? '');
            $formData['email'] = $this->decryptLegacy($subject['email'] ?? '') ?: null;
            $formData['phone'] = $this->decryptLegacy($subject['phone'] ?? '') ?: null;
            $dob = $subject['dateOfBirth'] ?? $subject['birth_date'] ?? null;
            if ($dob) {
                if (is_string($dob)) {
                    $ts = strtotime($dob);
                    $formData['birth_date'] = $ts ? date('Y-m-d', $ts) : null;
                } elseif ($dob instanceof DateTimeInterface) {
                    $formData['birth_date'] = $dob->format('Y-m-d');
                } else {
                    $formData['birth_date'] = null;
                }
            }
        }
        $addrParts = array_filter([
            $this->decryptLegacy($apt['addressDetails'] ?? ''),
            $this->decryptLegacy($apt['floor'] ?? ''),
            $this->decryptLegacy($apt['accessCode'] ?? ''),
        ]);
        $formData['address_complement'] = implode(', ', $addrParts);

        $eFormData = $this->crypto->encryptField(json_encode($formData));

        $assignedTo = $phlebUuid;
        $assignedNurseId = ($type === 'nursing' && $profUuid) ? $profUuid : null;
        if ($type === 'nursing' && $profUuid && !$assignedTo) {
            $assignedTo = $profUuid;
        }

        $durationMinutes = null;
        if (!empty($apt['startTime']) && !empty($apt['endTime'])) {
            $s = is_string($apt['startTime']) ? strtotime($apt['startTime']) : $apt['startTime'];
            $e = is_string($apt['endTime']) ? strtotime($apt['endTime']) : $apt['endTime'];
            if ($s && $e) $durationMinutes = (int) (($e - $s) / 60);
        }

        $uuid = $this->uuid();

        if (!$this->dryRun) {
            $stmt = $this->db->prepare('
                INSERT INTO appointments (id, type, form_type, status, patient_id, relative_id, assigned_to, assigned_nurse_id, assigned_lab_id,
                    created_by, created_by_role, location_lat, location_lng, address_encrypted, address_dek, form_data_encrypted, form_data_dek,
                    scheduled_at, duration_minutes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmt->execute([
                $uuid, $type, $type, $status,
                $patientUuid, $relativeUuid, $assignedTo, $assignedNurseId, $labUuid,
                $createdByUuid, $createdByRole,
                $lat, $lng,
                $eAddr['encrypted'], $eAddr['dek'],
                $eFormData['encrypted'], $eFormData['dek'],
                $scheduledAt, $durationMinutes,
            ]);

            $stmt = $this->db->prepare('INSERT INTO legacy_id_mapping (legacy_collection, legacy_object_id, target_table, target_uuid) VALUES (?, ?, ?, ?)');
            $stmt->execute(['appointments', $legacyId, 'appointments', $uuid]);
        }

        return [
            'uuid' => $uuid,
            'legacy_id' => $legacyId,
            'patient_id' => $patientUuid,
            'created_by' => $createdByUuid,
            'form_data' => $formData,
        ];
    }
}
