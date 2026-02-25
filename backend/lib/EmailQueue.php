<?php

/**
 * File d'envoi d'emails en asynchrone (shutdown) pour ne pas bloquer les boutons.
 * Tous les envois passent par la queue sauf OTP (réponse immédiate souhaitée).
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Email.php';
require_once __DIR__ . '/../models/User.php';

class EmailQueue
{
    private static array $queue = [];
    private static bool $shutdownRegistered = false;

    /**
     * Ajoute un email à la queue (envoyé après la réponse HTTP).
     * @param string $type review_invitation | appointment_created | appointment_confirmation | appointment_canceled_patient | new_appointment_pro | assigned_to_preleveur | welcome | incident_warning | suspension | ban
     * @param string|null $toEmail Adresse email du destinataire
     * @param array $payload Données pour le template (selon le type)
     * @param string|null $toProfileId Si pas d'email, on récupère l'email du profil (ex. préleveur, lab)
     */
    public static function add(string $type, ?string $toEmail, array $payload, ?string $toProfileId = null): void
    {
        self::$queue[] = [
            'type' => $type,
            'to_email' => $toEmail,
            'to_profile_id' => $toProfileId,
            'payload' => $payload,
        ];
        if (!self::$shutdownRegistered) {
            self::$shutdownRegistered = true;
            register_shutdown_function([self::class, 'flush']);
        }
    }

    /**
     * Envoie tous les emails en attente (appelé en shutdown).
     * Tout le traitement est encapsulé dans un try/catch pour éviter qu'une exception
     * (DB, User, Email, SMTP) ne fasse planter le processus PHP et donc le serveur.
     */
    public static function flush(): void
    {
        if (empty(self::$queue)) {
            return;
        }
        $items = self::$queue;
        self::$queue = [];

        try {
            $userModel = new User();
            $email = new Email();
        } catch (Throwable $e) {
            error_log('EmailQueue flush (init): ' . $e->getMessage());
            return;
        }

        foreach ($items as $item) {
            $to = $item['to_email'];
            if (empty($to) && !empty($item['to_profile_id'])) {
                try {
                    $profile = $userModel->getById($item['to_profile_id'], 'system', 'system');
                    $to = $profile['email'] ?? null;
                } catch (Throwable $e) {
                    error_log('EmailQueue flush (getById ' . ($item['to_profile_id'] ?? '') . '): ' . $e->getMessage());
                    continue;
                }
            }
            if (empty($to)) {
                continue;
            }
            try {
                self::sendOne($email, $item['type'], $to, $item['payload']);
            } catch (Throwable $e) {
                error_log('EmailQueue flush (send): ' . $e->getMessage());
            }
        }
    }

    private static function sendOne(Email $email, string $type, string $to, array $p): void
    {
        switch ($type) {
            case 'review_invitation':
                $email->sendReviewInvitation($to, $p['appointment_id'], $p);
                break;
            case 'appointment_created':
                $email->sendAppointmentCreated($to, $p);
                break;
            case 'appointment_confirmation':
                $email->sendAppointmentConfirmation($to, $p);
                break;
            case 'appointment_canceled_patient':
                $email->sendAppointmentCanceledToPatient($to, $p);
                break;
            case 'new_appointment_pro':
                $email->sendNewAppointmentToPro($to, $p);
                break;
            case 'assigned_to_preleveur':
                $email->sendAppointmentAssignedToPreleveur($to, $p);
                break;
            case 'welcome':
                $email->sendWelcome($to, $p);
                break;
            case 'incident_warning':
                $email->sendIncidentWarning($to, (int)($p['count'] ?? 0), (string)($p['reason'] ?? ''));
                break;
            case 'suspension':
                $email->sendSuspensionEmail($to, (int)($p['days'] ?? 0), (string)($p['reason'] ?? ''));
                break;
            case 'ban':
                $email->sendBanEmail($to, (string)($p['reason'] ?? ''));
                break;
            default:
                break;
        }
    }
}
