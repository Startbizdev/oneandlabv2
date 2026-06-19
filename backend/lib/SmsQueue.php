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
        foreach ($items as $item) {
            if (($item['type'] ?? '') !== 'new_appointment') {
                continue;
            }
            try {
                $stmt = $db->prepare(
                    'SELECT phone_encrypted, phone_dek, first_name_encrypted, first_name_dek, role
                     FROM profiles WHERE id = ?'
                );
                $stmt->execute([$item['profile_id']]);
                $profile = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$profile || empty($profile['phone_encrypted']) || empty($profile['phone_dek'])) {
                    continue;
                }
                $phone = $crypto->decryptField($profile['phone_encrypted'], $profile['phone_dek']);
                if (empty($phone)) {
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
                $twilio->sendNewAppointmentNotification($phone, [
                    'id' => $item['appointment_id'],
                    'scheduled_at' => $item['scheduled_at'],
                    'first_name' => $firstName,
                    'role' => (string) ($item['role'] ?? $profile['role'] ?? 'nurse'),
                    'appointment_type' => (string) ($item['appointment_type'] ?? 'nursing'),
                ]);
            } catch (Exception $e) {
                error_log('SmsQueue flush: ' . $e->getMessage());
            }
        }
    }
}
