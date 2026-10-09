<?php

declare(strict_types=1);

require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../LabTeamAccess.php';
require_once __DIR__ . '/../NurseInviteService.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../PatientLinkedNurses.php';
require_once __DIR__ . '/../RelativeProfile.php';
require_once __DIR__ . '/../../models/User.php';

final class AppointmentCreateInputDenied extends HttpStatusException
{
}

/**
 * Champs serveur d'une création de RDV : statut, assignations et patient ne sont jamais repris
 * tels quels du client. Seul le super_admin (assistant admin) les fixe librement.
 */
final class AppointmentCreateInputPolicy
{
    private const ASSIGNMENT_FIELDS = ['assigned_to', 'assigned_lab_id', 'assigned_nurse_id', 'assigned_pro_id'];

    /** Labo et préleveur : jamais choisis par un pro / infirmier, le RDV passe par les offres. */
    private const LAB_ASSIGNMENT_FIELDS = ['assigned_lab_id' => true, 'assigned_to' => true];

    /**
     * @param array<string, mixed> $user  session (user_id, role)
     * @param array<string, mixed> $input corps de création
     * @return array<string, mixed>
     */
    public static function apply(PDO $db, array $user, array $input): array
    {
        $role = (string) ($user['role'] ?? '');
        $userId = (string) ($user['user_id'] ?? '');
        $input = self::applyDispatchFlags($db, $role, $userId, $input);
        if ($role === 'super_admin') {
            return self::normalizeSubject($db, $input);
        }
        if ($userId === '') {
            throw new AppointmentCreateInputDenied('Session invalide.', 403, 'FORBIDDEN');
        }

        $requested = [];
        foreach (self::ASSIGNMENT_FIELDS as $field) {
            $value = trim((string) ($input[$field] ?? ''));
            if ($value !== '') {
                if (!Validation::uuid($value)) {
                    throw new AppointmentCreateInputDenied($field . ' invalide', 400, 'VALIDATION_ERROR');
                }
                $requested[$field] = $value;
            }
            unset($input[$field]);
        }
        unset($input['status']);

        $input = self::normalizeSubject($db, self::applyPatient($db, $role, $userId, $input));
        if ($requested === [] || $role === 'preleveur') {
            return $input;
        }

        $type = (string) ($input['type'] ?? '');

        return match ($role) {
            'patient' => self::patientAssignments($db, $type, $requested, $input),
            'pro', 'nurse' => self::staffAssignments($db, $role, $userId, $type, self::dossierId($db, $input), $requested, $input),
            'lab', 'subaccount' => self::labAssignments($db, $role, $userId, $type, $requested, $input),
            default => throw self::assignmentForbidden(),
        };
    }

    /**
     * attribution_qr_id : jamais repris du client (déduit côté serveur du jeton utm_qr).
     * external_nurse_invite : réservé au pro qui confie un soin infirmier à un infirmier hors Cary.
     * skip_zone_dispatch : réservé à l'admin et à ce soin confié par SMS (ce RDV ou un RDV du même lot
     * déjà invité). Hors de ces cas, les champs sont ignorés et le RDV part en dispatch.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function applyDispatchFlags(PDO $db, string $role, string $userId, array $input): array
    {
        unset($input['attribution_qr_id']);
        $input = self::applyExternalNurseInvite($role, $input);
        if (empty($input['skip_zone_dispatch'])) {
            unset($input['skip_zone_dispatch']);

            return $input;
        }
        if (self::canSkipZoneDispatch($db, $role, $userId, $input)) {
            $input['skip_zone_dispatch'] = true;
        } else {
            unset($input['skip_zone_dispatch']);
        }

        return $input;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function applyExternalNurseInvite(string $role, array $input): array
    {
        $invite = $input['external_nurse_invite'] ?? null;
        unset($input['external_nurse_invite']);
        if (empty($invite) || $role !== 'pro' || ($input['type'] ?? '') !== 'nursing') {
            return $input;
        }
        $phone = NurseInviteService::normalizeInvitePhone(is_array($invite) ? ($invite['phone'] ?? null) : null);
        if ($phone === null) {
            throw new AppointmentCreateInputDenied(
                'Numéro de mobile de l\'infirmier invalide (06 ou 07, ou +33 6 / +33 7).',
                400,
                'VALIDATION_ERROR'
            );
        }
        $input['external_nurse_invite'] = ['phone' => $phone];

        return $input;
    }

    /** @param array<string, mixed> $input */
    private static function canSkipZoneDispatch(PDO $db, string $role, string $userId, array $input): bool
    {
        if ($role === 'super_admin') {
            return true;
        }
        if ($role !== 'pro' || ($input['type'] ?? '') !== 'nursing') {
            return false;
        }
        if (isset($input['external_nurse_invite'])) {
            return true;
        }
        $batchId = trim((string) ($input['creation_batch_id'] ?? ''));
        if (!Validation::uuid($batchId) || !DbSchemaCache::tableHasColumn($db, 'appointments', 'dispatch_mode')) {
            return false;
        }
        $stmt = $db->prepare("
            SELECT 1 FROM appointments
            WHERE creation_batch_id = ? AND created_by = ? AND type = 'nursing' AND dispatch_mode = 'external_invite'
            LIMIT 1
        ");
        $stmt->execute([$batchId, $userId]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * Patient : pour lui-même ou le dossier d'un de ses proches (ses proches passent aussi par relative_id).
     * Professionnel : uniquement un patient dont il a déjà le dossier.
     *
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function applyPatient(PDO $db, string $role, string $userId, array $input): array
    {
        $patientId = trim((string) ($input['patient_id'] ?? ''));
        if ($role === 'patient') {
            if ($patientId !== '' && $patientId !== $userId && !RelativeProfile::isOwner($db, $userId, $patientId)) {
                throw self::patientAccessDenied();
            }
            if ($patientId === '') {
                $input['patient_id'] = $userId;
            }

            return $input;
        }
        if ($patientId === '') {
            return $input;
        }
        if (!Validation::uuid($patientId)) {
            throw new AppointmentCreateInputDenied('patient_id invalide', 400, 'VALIDATION_ERROR');
        }
        if (!PatientDossierAccess::canAccess($db, new User($db), ['user_id' => $userId, 'role' => $role], $patientId)) {
            throw self::patientAccessDenied();
        }

        return $input;
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function normalizeSubject(PDO $db, array $input): array
    {
        try {
            return RelativeProfile::normalizeSubject($db, $input);
        } catch (InvalidArgumentException $e) {
            throw new AppointmentCreateInputDenied($e->getMessage(), 400, 'VALIDATION_ERROR');
        }
    }

    /**
     * Dossier soigné par le RDV normalisé : celui du proche s'il existe, sinon le titulaire.
     *
     * @param array<string, mixed> $input
     */
    private static function dossierId(PDO $db, array $input): string
    {
        $patientId = trim((string) ($input['patient_id'] ?? ''));
        $relativeId = trim((string) ($input['relative_id'] ?? ''));

        return $relativeId !== '' ? (RelativeProfile::profileIdForRelative($db, $relativeId) ?? $patientId) : $patientId;
    }

    /**
     * Réservation sur la fiche publique ou le QR d'un professionnel : la cible doit avoir le bon rôle et être active.
     *
     * @param array<string, string> $requested
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function patientAssignments(PDO $db, string $type, array $requested, array $input): array
    {
        foreach ($requested as $field => $targetId) {
            $allowed = match ($field) {
                'assigned_nurse_id' => $type === 'nursing' && self::isActiveProfile($db, $targetId, ['nurse']),
                'assigned_lab_id' => $type === 'blood_test' && self::isActiveProfile($db, $targetId, ['lab', 'subaccount']),
                'assigned_pro_id' => self::isActiveProfile($db, $targetId, ['pro']),
                default => false,
            };
            if (!$allowed) {
                throw self::assignmentForbidden();
            }
            $input[$field] = $targetId;
        }

        return $input;
    }

    /**
     * Pro / infirmier. Une reprogrammation (nouveau RDV) repart en attente : le labo et le préleveur
     * du RDV source envoyés par les clients ne sont pas conservés, le RDV repasse par le dispatch.
     *
     * @param array<string, string> $requested
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function staffAssignments(
        PDO $db,
        string $role,
        string $userId,
        string $type,
        string $patientId,
        array $requested,
        array $input,
    ): array {
        foreach (array_diff_key($requested, self::LAB_ASSIGNMENT_FIELDS) as $field => $targetId) {
            $allowed = match ($field) {
                'assigned_pro_id' => $role === 'pro' && $targetId === $userId,
                'assigned_nurse_id' => $type === 'nursing' && (
                    $role === 'nurse'
                        ? $targetId === $userId
                        : $patientId !== '' && PatientLinkedNurses::isLinked($db, $patientId, $targetId)
                ),
                default => false,
            };
            if (!$allowed) {
                throw self::assignmentForbidden();
            }
            $input[$field] = $targetId;
        }

        return $input;
    }

    /**
     * @param array<string, string> $requested
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    private static function labAssignments(PDO $db, string $role, string $userId, string $type, array $requested, array $input): array
    {
        foreach ($requested as $field => $targetId) {
            $allowed = match ($field) {
                'assigned_lab_id' => $type === 'blood_test'
                    && self::isActiveProfile($db, $targetId, ['lab', 'subaccount'])
                    && in_array($targetId, LabTeamAccess::teamMemberIds($db, $userId, $role), true),
                'assigned_to' => $type === 'blood_test' && LabTeamAccess::isPreleveurOfTeam($db, $userId, $role, $targetId),
                default => false,
            };
            if (!$allowed) {
                throw self::assignmentForbidden();
            }
            $input[$field] = $targetId;
        }

        return $input;
    }

    /** @param list<string> $roles */
    private static function isActiveProfile(PDO $db, string $profileId, array $roles): bool
    {
        $placeholders = implode(',', array_fill(0, count($roles), '?'));
        $stmt = $db->prepare(
            "SELECT 1 FROM profiles WHERE id = ? AND role IN ($placeholders)
             AND (banned_until IS NULL OR banned_until <= NOW()) LIMIT 1"
        );
        $stmt->execute(array_merge([$profileId], $roles));

        return (bool) $stmt->fetchColumn();
    }

    private static function patientAccessDenied(): AppointmentCreateInputDenied
    {
        return new AppointmentCreateInputDenied(
            'Vous ne pouvez pas créer de rendez-vous pour ce patient.',
            403,
            'PATIENT_ACCESS_DENIED'
        );
    }

    private static function assignmentForbidden(): AppointmentCreateInputDenied
    {
        return new AppointmentCreateInputDenied(
            'Ce professionnel ne peut pas être attribué à ce rendez-vous.',
            403,
            'ASSIGNMENT_FORBIDDEN'
        );
    }
}
