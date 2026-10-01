<?php



declare(strict_types=1);



require_once __DIR__ . '/SmsSender.php';

require_once __DIR__ . '/../models/User.php';

require_once __DIR__ . '/RateLimit.php';

require_once __DIR__ . '/users/UserIdentityLookup.php';



/**

 * Invitation SMS d'un infirmier hors Cary pour accepter un soin via lien partage.

 */

final class NurseInviteService

{

    public const SMS_MAX_PER_CREATOR_PER_DAY = 20;

    public const SMS_MAX_PER_PHONE_PER_DAY = 5;

    private const QUOTA_WINDOW_SECONDS = 86400;

    /** Mobile français (06 / 07, ou +33 6 / 7) normalisé en 10 chiffres ; null si invalide. */
    public static function normalizeInvitePhone(mixed $raw): ?string
    {
        if (!is_string($raw)) {
            return null;
        }
        $digits = UserIdentityLookup::normalizeFrenchPatientPhoneDigits($raw);

        return $digits !== null && preg_match('/^0[67]\d{8}$/', $digits) === 1 ? $digits : null;
    }

    /**
     * Anti-abus avant l'envoi : plafond par professionnel et par numéro destinataire sur 24 h.
     * À consommer avant de créer le RDV pour ne pas laisser de RDV orphelin en cas de refus.
     */
    public static function consumeSmsQuota(string $creatorUserId, string $phoneDigits): bool
    {
        return RateLimit::allow('nurse_invite_sms_creator', $creatorUserId, self::SMS_MAX_PER_CREATOR_PER_DAY, self::QUOTA_WINDOW_SECONDS)
            && RateLimit::allow('nurse_invite_sms_phone', $phoneDigits, self::SMS_MAX_PER_PHONE_PER_DAY, self::QUOTA_WINDOW_SECONDS);
    }

    /**

     * @param array{phone?: string} $invite

     * @return array{token: string, share_path: string, sms_sent: bool, resolved_nurse_id?: string|null}

     */

    public static function inviteExternalForAppointment(

        PDO $db,

        string $appointmentId,

        array $invite,

        string $creatorUserId

    ): array {

        $phone = self::normalizeInvitePhone($invite['phone'] ?? null);



        if ($phone === null) {

            throw new InvalidArgumentException('Numéro de mobile de l\'infirmier invalide pour l\'invitation');

        }



        $resolvedNurseId = self::resolveNurseIdByPhone($db, $phone);

        if ($resolvedNurseId !== null) {

            self::assignInvitedNurseToAppointment($db, $appointmentId, $resolvedNurseId);

        }



        $token = self::ensureShareToken($db, $appointmentId);

        $baseUrl = rtrim((string) ($_ENV['FRONTEND_URL'] ?? 'https://cary.bio'), '/');

        $sharePath = "/p/rdv/{$token}";

        $url = $baseUrl . $sharePath;



        $proName = self::resolveProDisplayName($db, $creatorUserId);

        $patientName = self::resolvePatientDisplayName($db, $appointmentId);



        $message = self::buildInviteSmsBody($proName, $patientName, $url);



        $smsSent = false;

        try {

            $sms = SmsSender::tryCreate();
            if ($sms === null) {
                throw new RuntimeException('SMS non configuré');
            }

            $sms->sendSMS($phone, $message);

            $smsSent = true;

        } catch (Throwable $e) {

            error_log('NurseInviteService SMS: ' . $e->getMessage());

        }



        if (!$smsSent) {

            throw new RuntimeException('Impossible d\'envoyer le SMS d\'invitation à l\'infirmier');

        }

        require_once __DIR__ . '/admin/AdminDispatchEventLogger.php';
        $dispatchLogger = new AdminDispatchEventLogger($db);
        $dispatchLogger->log(
            $appointmentId,
            'external_nurse_invite',
            $creatorUserId,
            null,
            $resolvedNurseId,
            [
                'sms_sent' => true,
                'share_path' => $sharePath,
                'resolved_on_cary' => $resolvedNurseId !== null,
            ]
        );

        return [

            'token' => $token,

            'share_path' => $sharePath,

            'sms_sent' => true,

            'resolved_nurse_id' => $resolvedNurseId,

        ];

    }



    public static function buildInviteSmsBody(string $proName, string $patientName, string $url): string

    {

        $proLabel = $proName !== '' ? $proName : 'Un professionnel de santé Cary';

        $patientLabel = $patientName !== '' ? $patientName : 'un patient';



        return "Bonjour, {$proLabel} vous a confié un soin à domicile pour le patient {$patientLabel} sur Cary, "

            . 'la plateforme sécurisée de coordination infirmière. '

            . 'Rejoignez Cary gratuitement pour consulter le détail et accepter la prise en charge : '

            . $url;

    }



    /**

     * Infirmier déjà inscrit sur Cary : assignation directe (pas de dispatch zone).

     */

    public static function assignInvitedNurseToAppointment(PDO $db, string $appointmentId, string $nurseId): void

    {

        if ($appointmentId === '' || $nurseId === '') {

            return;

        }



        $stmt = $db->prepare('

            SELECT id, creation_batch_id, patient_id, type, status

            FROM appointments

            WHERE id = ?

            LIMIT 1

        ');

        $stmt->execute([$appointmentId]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row || ($row['type'] ?? '') !== 'nursing') {

            return;

        }



        $batchId = trim((string) ($row['creation_batch_id'] ?? ''));

        $patientId = trim((string) ($row['patient_id'] ?? ''));



        if ($batchId !== '' && $patientId !== '') {

            $upd = $db->prepare('

                UPDATE appointments

                SET assigned_nurse_id = ?, status = \'confirmed\', updated_at = NOW()

                WHERE creation_batch_id = ? AND patient_id = ? AND type = \'nursing\'

                AND (assigned_nurse_id IS NULL OR TRIM(assigned_nurse_id) = \'\')

                AND status = \'pending\'

            ');

            $upd->execute([$nurseId, $batchId, $patientId]);

        } else {

            $upd = $db->prepare('

                UPDATE appointments

                SET assigned_nurse_id = ?, status = \'confirmed\', updated_at = NOW()

                WHERE id = ?

                AND (assigned_nurse_id IS NULL OR TRIM(assigned_nurse_id) = \'\')

                AND status = \'pending\'

            ');

            $upd->execute([$nurseId, $appointmentId]);

        }



        require_once __DIR__ . '/AppointmentShareToken.php';

        AppointmentShareToken::materializeOffersForNurseFromShare($db, $nurseId, $appointmentId);

    }



    public static function resolveNurseIdByPhone(PDO $db, string $phoneRaw): ?string
    {
        $userModel = new User();
        return $userModel->findNurseIdByPhone($phoneRaw);
    }



    private static function resolveProDisplayName(PDO $db, string $creatorUserId): string

    {

        if ($creatorUserId === '') {

            return '';

        }

        try {

            $userModel = new User();

            $names = $userModel->getDisplayNamesByIds([$creatorUserId]);

            return trim((string) ($names[$creatorUserId] ?? ''));

        } catch (Throwable $e) {

            error_log('NurseInviteService pro name: ' . $e->getMessage());

            return '';

        }

    }



    private static function resolvePatientDisplayName(PDO $db, string $appointmentId): string

    {

        try {

            $stmt = $db->prepare('SELECT patient_id FROM appointments WHERE id = ? LIMIT 1');

            $stmt->execute([$appointmentId]);

            $patientId = (string) ($stmt->fetchColumn() ?: '');

            if ($patientId === '') {

                return '';

            }

            $userModel = new User();

            $names = $userModel->getDisplayNamesByIds([$patientId]);

            return trim((string) ($names[$patientId] ?? ''));

        } catch (Throwable $e) {

            error_log('NurseInviteService patient name: ' . $e->getMessage());

            return '';

        }

    }



    public static function ensureShareToken(PDO $db, string $appointmentId): string

    {

        $stmt = $db->prepare('

            SELECT token, expires_at

            FROM appointment_share_tokens

            WHERE appointment_id = ?

            ORDER BY created_at DESC

            LIMIT 1

        ');

        $stmt->execute([$appointmentId]);

        $existing = $stmt->fetch(PDO::FETCH_ASSOC);



        if (

            $existing

            && !empty($existing['token'])

            && (empty($existing['expires_at']) || strtotime((string) $existing['expires_at']) > time())

        ) {

            return (string) $existing['token'];

        }



        $token = bin2hex(random_bytes(32));

        $id = sprintf(

            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',

            random_int(0, 0xffff),

            random_int(0, 0xffff),

            random_int(0, 0xffff),

            random_int(0, 0x4000) | 0x8000,

            random_int(0, 0xffff),

            random_int(0, 0xffff),

            random_int(0, 0xffff),

            random_int(0, 0xffff)

        );

        $expiresAt = (new DateTime())->modify('+7 days')->format('Y-m-d H:i:s');

        $insert = $db->prepare('

            INSERT INTO appointment_share_tokens (id, appointment_id, token, created_at, expires_at)

            VALUES (?, ?, ?, NOW(), ?)

        ');

        $insert->execute([$id, $appointmentId, $token, $expiresAt]);



        return $token;

    }

}


