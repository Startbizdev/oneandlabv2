<?php

declare(strict_types=1);

require_once __DIR__ . '/../../models/User.php';
require_once __DIR__ . '/PharmacyModuleConfig.php';
require_once __DIR__ . '/../RelativeProfile.php';

/**
 * ACL commandes pharmacie.
 */
final class PharmacyOrderAccess
{
    /** @var list<string> */
    public const PRESCRIPTION_ATTACHABLE_STATUSES = ['en_attente', 'complement_demande', 'acceptee', 'en_cours'];

    public static function canAccess(array $user, array $order, ?PharmacyModuleConfig $configService = null): bool
    {
        $role = (string) ($user['role'] ?? '');
        $uid = (string) ($user['user_id'] ?? '');

        if ($role === 'super_admin') {
            return true;
        }

        if ((string) ($order['requester_id'] ?? '') === $uid) {
            return true;
        }

        if ((string) ($order['pharmacy_id'] ?? '') === $uid) {
            return true;
        }
        if ($role === 'patient' && (string) ($order['patient_id'] ?? '') === $uid) {
            return true;
        }

        if ($role === 'pro' || $role === 'nurse') {
            $userModel = new User();
            if ($userModel->hasProfessionalAccessToPatient($uid, (string) ($order['patient_id'] ?? ''))) {
                return (string) ($order['requester_id'] ?? '') === $uid;
            }
        }

        return false;
    }

    public static function canView(array $user, array $order): bool
    {
        $role = (string) ($user['role'] ?? '');
        $uid = (string) ($user['user_id'] ?? '');

        if ($role === 'super_admin') {
            return true;
        }
        if ((string) ($order['requester_id'] ?? '') === $uid) {
            return true;
        }
        if ((string) ($order['pharmacy_id'] ?? '') === $uid) {
            return true;
        }
        if ($role === 'patient' && (string) ($order['patient_id'] ?? '') === $uid) {
            return true;
        }

        return false;
    }

    public static function canPostMessage(array $user, array $order): bool
    {
        if (!self::canView($user, $order)) {
            return false;
        }
        $status = (string) ($order['status'] ?? '');

        return !in_array($status, ['annulee', 'refusee', 'terminee'], true);
    }

    /** Demandeur ou patient de la commande, tant qu'elle n'est ni terminée, ni refusée, ni annulée. */
    public static function canAttachPrescriptions(array $user, array $order): bool
    {
        return self::isRequesterOrPatient($user, $order)
            && in_array((string) ($order['status'] ?? ''), self::PRESCRIPTION_ATTACHABLE_STATUSES, true);
    }

    public static function isRequesterOrPatient(array $user, array $order): bool
    {
        $uid = (string) ($user['user_id'] ?? '');
        if ($uid === '') {
            return false;
        }

        return (string) ($order['requester_id'] ?? '') === $uid
            || (($user['role'] ?? '') === 'patient' && (string) ($order['patient_id'] ?? '') === $uid);
    }

    /**
     * Pharmacie destinataire d'une commande (ni refusée, ni annulée) : lecture des documents de profil du patient
     * (carte Vitale, mutuelle, ordonnances) sans avoir à les redemander. Accepte l'id du dossier d'un proche.
     *
     * @return array{patient_id: string, relative_id: ?string}|null
     */
    public static function profileDocumentsReadTarget(PDO $db, array $user, string $targetId, ?string $relativeId): ?array
    {
        $pharmacyId = (string) ($user['user_id'] ?? '');
        if (($user['role'] ?? '') !== 'pro' || $pharmacyId === '' || $targetId === '') {
            return null;
        }
        $patientId = $targetId;
        $relative = RelativeProfile::resolve($db, $targetId);
        if ($relative !== null) {
            if ($relativeId !== null && $relativeId !== $relative['relative_id']) {
                return null;
            }
            $patientId = $relative['owner_id'];
            $relativeId = $relative['relative_id'];
        }
        $stmt = $db->prepare(
            "SELECT 1 FROM pharmacy_orders
             WHERE pharmacy_id = ? AND patient_id = ? AND relative_id <=> ?
               AND status NOT IN ('refusee', 'annulee')
             LIMIT 1"
        );
        $stmt->execute([$pharmacyId, $patientId, $relativeId]);

        return $stmt->fetchColumn() ? ['patient_id' => $patientId, 'relative_id' => $relativeId] : null;
    }

    public static function canTransitionPharmacy(array $user, array $order): bool
    {
        if ((string) ($user['role'] ?? '') === 'super_admin') {
            return true;
        }

        return (string) ($order['pharmacy_id'] ?? '') === (string) ($user['user_id'] ?? '');
    }

    public static function canTransitionRequester(array $user, array $order): bool
    {
        if ((string) ($user['role'] ?? '') === 'super_admin') {
            return true;
        }

        return (string) ($order['requester_id'] ?? '') === (string) ($user['user_id'] ?? '');
    }
}
