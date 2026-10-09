<?php

declare(strict_types=1);

/**
 * Chiffrement / déchiffrement address + form_data d'un RDV (liste et détail).
 */
final class AppointmentFormDataCrypto
{
    public function __construct(
        private Crypto $crypto,
        private Logger $logger,
    ) {
    }

    /**
     * Déchiffre une ligne de RDV pour l'affichage en liste (sans getById ni lookups User).
     */
    public function decryptRowForList(array $row, string $requesterId, string $requesterRole): array
    {
        $appointment = $row;
        $this->decryptSensitiveFields($appointment, $requesterId, $requesterRole);
        unset($appointment['address_encrypted'], $appointment['address_dek'], $appointment['form_data_encrypted'], $appointment['form_data_dek']);

        if (!empty($appointment['relative_id']) && !empty($appointment['relative_first_name_encrypted'] ?? null)) {
            try {
                $appointment['relative'] = [
                    'id' => $appointment['relative_id'],
                    'first_name' => $this->crypto->decryptField(
                        $appointment['relative_first_name_encrypted'] ?? null,
                        $appointment['relative_first_name_dek'] ?? null
                    ),
                    'last_name' => $this->crypto->decryptField(
                        $appointment['relative_last_name_encrypted'] ?? null,
                        $appointment['relative_last_name_dek'] ?? null
                    ),
                    'email' => null,
                    'phone' => null,
                    'relationship_type' => $appointment['relative_relationship_type'] ?? null,
                    'birth_date' => null,
                    'contact_is_parent' => false,
                    'profile_id' => $appointment['relative_profile_id'] ?? null,
                ];
                if (!empty($appointment['relative_email_encrypted']) && !empty($appointment['relative_email_dek'])) {
                    $appointment['relative']['email'] = $this->crypto->decryptField(
                        $appointment['relative_email_encrypted'],
                        $appointment['relative_email_dek']
                    );
                }
                if (!empty($appointment['relative_phone_encrypted']) && !empty($appointment['relative_phone_dek'])) {
                    $appointment['relative']['phone'] = $this->crypto->decryptField(
                        $appointment['relative_phone_encrypted'],
                        $appointment['relative_phone_dek']
                    );
                }
            } catch (Exception $e) {
                $appointment['relative'] = [
                    'id' => $appointment['relative_id'],
                    'first_name' => '',
                    'last_name' => '',
                    'profile_id' => $appointment['relative_profile_id'] ?? null,
                ];
            }
            foreach ([
                'relative_first_name_encrypted', 'relative_first_name_dek', 'relative_last_name_encrypted', 'relative_last_name_dek',
                'relative_email_encrypted', 'relative_email_dek', 'relative_phone_encrypted', 'relative_phone_dek',
                'relative_relationship_type', 'relative_birth_date_encrypted', 'relative_birth_date_dek',
            ] as $k) {
                unset($appointment[$k]);
            }
        }

        $appointment['assigned_lab_display_name'] = null;
        $appointment['assigned_nurse_display_name'] = null;
        $appointment['assigned_to_display_name'] = null;
        if ($requesterRole === 'patient') {
            unset($appointment['created_at'], $appointment['updated_at']);
        }
        return $appointment;
    }

    /**
     * Déchiffre address + form_data sans les lier dans un seul try.
     */
    public function decryptSensitiveFields(
        array &$appointment,
        string $requesterId,
        string $requesterRole
    ): void {
        $appointment['address'] = null;
        if (!is_array($appointment['form_data'] ?? null)) {
            $appointment['form_data'] = [];
        }

        $decryptedFields = [];

        if (!empty($appointment['address_encrypted']) && !empty($appointment['address_dek'])) {
            try {
                $appointment['address'] = $this->crypto->decryptField(
                    (string) $appointment['address_encrypted'],
                    (string) $appointment['address_dek']
                );
                $decryptedFields[] = 'address';
            } catch (Exception $e) {
                error_log('Appointment address decrypt ' . ($appointment['id'] ?? '') . ': ' . $e->getMessage());
                $appointment['address'] = null;
            }
        }

        if (!empty($appointment['form_data_encrypted']) && !empty($appointment['form_data_dek'])) {
            try {
                $formDataJson = $this->crypto->decryptField(
                    (string) $appointment['form_data_encrypted'],
                    (string) $appointment['form_data_dek']
                );
                $decoded = json_decode($formDataJson, true);
                $appointment['form_data'] = is_array($decoded) ? $decoded : [];
                $decryptedFields[] = 'form_data';
            } catch (Exception $e) {
                error_log('Appointment form_data decrypt ' . ($appointment['id'] ?? '') . ': ' . $e->getMessage());
                $appointment['form_data'] = [];
            }
        }

        $this->hydrateAddressFields($appointment);

        if ($decryptedFields !== []) {
            $this->logger->logDecrypt(
                $requesterId,
                $requesterRole,
                'appointment',
                (string) ($appointment['id'] ?? ''),
                array_fill_keys($decryptedFields, true)
            );
        }
    }

    public function hydrateAddressFields(array &$appointment): void
    {
        if (!is_array($appointment['form_data'] ?? null)) {
            $appointment['form_data'] = [];
        }

        $topLabel = $this->extractAddressLabel($appointment['address'] ?? null);
        $formLabel = $this->extractAddressLabel($appointment['form_data']['address'] ?? null);
        $legacyLabel = trim((string) ($appointment['form_data']['address_label'] ?? ''));

        $label = $topLabel !== '' ? $topLabel : ($formLabel !== '' ? $formLabel : $legacyLabel);
        if ($label === '') {
            return;
        }

        $appointment['address'] = $label;

        if ($legacyLabel === '') {
            $appointment['form_data']['address_label'] = $label;
        }

        $fdAddr = $appointment['form_data']['address'] ?? null;
        if ($fdAddr === null || $fdAddr === '' || (is_string($fdAddr) && trim($fdAddr) === '')) {
            $lat = isset($appointment['location_lat']) ? (float) $appointment['location_lat'] : null;
            $lng = isset($appointment['location_lng']) ? (float) $appointment['location_lng'] : null;
            $payload = ['label' => $label];
            if ($lat !== null && $lng !== null && ($lat !== 0.0 || $lng !== 0.0)) {
                $payload['lat'] = $lat;
                $payload['lng'] = $lng;
            }
            $appointment['form_data']['address'] = $payload;
            return;
        }

        if (is_string($fdAddr)) {
            $parsedLabel = $this->extractAddressLabel($fdAddr);
            if ($parsedLabel !== '') {
                $decoded = json_decode(trim($fdAddr), true);
                $appointment['form_data']['address'] = is_array($decoded) && !empty($decoded['label'])
                    ? $decoded
                    : ['label' => $parsedLabel];
            }
            return;
        }

        if (is_array($fdAddr) && empty($fdAddr['label'])) {
            $appointment['form_data']['address']['label'] = $label;
        }
    }

    public function extractAddressLabel(mixed $raw): string
    {
        if ($raw === null) {
            return '';
        }
        if (is_string($raw)) {
            $t = trim($raw);
            if ($t === '') {
                return '';
            }
            if ($t[0] === '{' || $t[0] === '[') {
                $j = json_decode($t, true);
                if (is_array($j) && !empty($j['label']) && is_string($j['label'])) {
                    return trim($j['label']);
                }
            }
            return $t;
        }
        if (is_array($raw) && !empty($raw['label']) && is_string($raw['label'])) {
            return trim($raw['label']);
        }
        return '';
    }
}
