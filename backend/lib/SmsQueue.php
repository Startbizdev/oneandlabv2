<?php

/**
 * File d'envoi de SMS en shutdown pour ne pas bloquer la création de RDV (dispatch).
 */

require_once __DIR__ . '/Crypto.php';
require_once __DIR__ . '/Twilio.php';

class SmsQueue
{
    private static array $queue = [];
    private static bool $shutdownRegistered = false;

    /**
     * Ajoute un SMS "nouveau RDV" à la queue (envoyé en shutdown).
     */
    public static function addNewAppointment(
        string $profileId,
        string $appointmentId,
        string $scheduledAt,
        string $role = 'nurse',
        string $appointmentType = 'nursing'
    ): void {
        self::$queue[] = [
            'type' => 'new_appointment',
            'profile_id' => $profileId,
            'appointment_id' => $appointmentId,
            'scheduled_at' => $scheduledAt,
            'role' => $role,
            'appointment_type' => $appointmentType,
        ];
        if (!self::$shutdownRegistered) {
            self::$shutdownRegistered = true;
            register_shutdown_function([self::class, 'flush']);
        }
    }

    /** @return array{category_id: ?string, category_name: ?string, form_data: ?array, appointment_type: string, scheduled_at: ?string}|null */
    private static function loadAppointmentContext(PDO $db, Crypto $crypto, string $appointmentId): ?array
    {
        $stmt = $db->prepare(
            'SELECT a.scheduled_at, a.type, a.category_id, a.form_data_encrypted, a.form_data_dek, c.name AS category_name
             FROM appointments a
             LEFT JOIN care_categories c ON a.category_id = c.id
             WHERE a.id = ?'
        );
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $formData = null;
        if (!empty($row['form_data_encrypted']) && !empty($row['form_data_dek'])) {
            try {
                $json = $crypto->decryptField($row['form_data_encrypted'], $row['form_data_dek']);
                $decoded = json_decode($json, true);
                $formData = is_array($decoded) ? $decoded : null;
            } catch (Exception $e) {
                $formData = null;
            }
        }

        return [
            'category_id' => isset($row['category_id']) ? (string) $row['category_id'] : null,
            'category_name' => isset($row['category_name']) ? (string) $row['category_name'] : null,
            'form_data' => $formData,
            'appointment_type' => (string) ($row['type'] ?? 'nursing'),
            'scheduled_at' => isset($row['scheduled_at']) ? (string) $row['scheduled_at'] : null,
        ];
    }

    /** @return array<string, array{label: string, valueLabels: array<string,string>}> */
    private static function loadCareOptionMeta(PDO $db, ?string $categoryId): array
    {
        if ($categoryId === null || trim($categoryId) === '') {
            return [];
        }
        try {
            $stmt = $db->prepare(
                'SELECT option_key, label, options FROM care_category_options WHERE care_category_id = ? ORDER BY sort_order ASC'
            );
            $stmt->execute([$categoryId]);
            $out = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $valueLabels = [];
                if (!empty($row['options'])) {
                    $decoded = json_decode((string) $row['options'], true);
                    if (is_array($decoded)) {
                        foreach ($decoded as $o) {
                            if (is_array($o) && isset($o['value'], $o['label'])) {
                                $valueLabels[(string) $o['value']] = (string) $o['label'];
                            }
                        }
                    }
                }
                $out[(string) $row['option_key']] = [
                    'label' => (string) $row['label'],
                    'valueLabels' => $valueLabels,
                ];
            }
            return $out;
        } catch (Exception $e) {
            return [];
        }
    }

    public static function flush(): void
    {
        if (empty(self::$queue)) {
            return;
        }
        $items = self::$queue;
        self::$queue = [];
        try {
            $twilio = new Twilio();
        } catch (Exception $e) {
            error_log('SmsQueue flush: Twilio non configuré — ' . $e->getMessage());
            return;
        }
        $config = require __DIR__ . '/../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
        $crypto = new Crypto();
        $appointmentCache = [];
        $optionMetaCache = [];

        foreach ($items as $item) {
            if (($item['type'] ?? '') !== 'new_appointment') {
                continue;
            }
            try {
                $profileId = (string) ($item['profile_id'] ?? '');
                $appointmentId = (string) ($item['appointment_id'] ?? '');
                if ($profileId === '' || $appointmentId === '') {
                    continue;
                }

                $stmt = $db->prepare(
                    'SELECT phone_encrypted, phone_dek, first_name_encrypted, first_name_dek, role
                     FROM profiles WHERE id = ?'
                );
                $stmt->execute([$profileId]);
                $profile = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$profile || empty($profile['phone_encrypted']) || empty($profile['phone_dek'])) {
                    error_log('SmsQueue: pas de téléphone pour le profil ' . $profileId);
                    continue;
                }
                $phone = $crypto->decryptField($profile['phone_encrypted'], $profile['phone_dek']);
                if (empty($phone)) {
                    error_log('SmsQueue: téléphone vide pour le profil ' . $profileId);
                    continue;
                }
                $firstName = '';
                if (!empty($profile['first_name_encrypted']) && !empty($profile['first_name_dek'])) {
                    try {
                        $firstName = trim((string) $crypto->decryptField(
                            $profile['first_name_encrypted'],
                            $profile['first_name_dek']
                        ));
                    } catch (Exception $e) {
                        $firstName = '';
                    }
                }

                if (!isset($appointmentCache[$appointmentId])) {
                    $appointmentCache[$appointmentId] = self::loadAppointmentContext($db, $crypto, $appointmentId);
                }
                $ctx = $appointmentCache[$appointmentId];

                $categoryId = is_array($ctx) ? ($ctx['category_id'] ?? null) : null;
                if ($categoryId !== null && !isset($optionMetaCache[$categoryId])) {
                    $optionMetaCache[$categoryId] = self::loadCareOptionMeta($db, $categoryId);
                }
                $optionMeta = ($categoryId !== null && isset($optionMetaCache[$categoryId]))
                    ? $optionMetaCache[$categoryId]
                    : [];

                $twilio->sendNewAppointmentNotification($phone, [
                    'id' => $appointmentId,
                    'scheduled_at' => (is_array($ctx) ? ($ctx['scheduled_at'] ?? null) : null) ?: $item['scheduled_at'],
                    'first_name' => $firstName,
                    'role' => (string) ($item['role'] ?? $profile['role'] ?? 'nurse'),
                    'appointment_type' => (string) (
                        $item['appointment_type']
                        ?? (is_array($ctx) ? ($ctx['appointment_type'] ?? null) : null)
                        ?? 'nursing'
                    ),
                    'category_name' => is_array($ctx) ? ($ctx['category_name'] ?? null) : null,
                    'form_data' => is_array($ctx) ? ($ctx['form_data'] ?? null) : null,
                    'option_meta' => $optionMeta,
                ]);
            } catch (Exception $e) {
                error_log('SmsQueue flush: ' . $e->getMessage());
            }
        }
    }
}
