<?php

declare(strict_types=1);

require_once __DIR__ . '/../Email.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Emails optionnels pour commandes pharmacie (push via NotificationService).
 */
final class PharmacyNotificationHelper
{
    public function __construct(
        private PDO $db,
        private ?Email $email = null,
    ) {
        $this->email ??= new Email();
    }

    public function maybeSendOrderEmail(string $userId, string $subject, string $body, string $detailPath): void
    {
        try {
            $userModel = new User();
            $profile = $userModel->getById($userId);
            $to = isset($profile['email']) ? trim((string) $profile['email']) : '';
            if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
                return;
            }
            $this->email->sendPharmacyOrderEmail($to, $subject, $body, $detailPath);
        } catch (Throwable) {
            // Ne pas bloquer le flux commande
        }
    }
}
