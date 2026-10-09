<?php

declare(strict_types=1);

require_once __DIR__ . '/../nurse-collaboration/NurseCollaboration.php';

/** Règles PATCH partiel sur GET/PUT /appointments/:id (créneau, reprogrammation infirmier). */
final class AppointmentDetailPatchRules
{
    public static function isScheduleOnlyPatch(array $input): bool
    {
        if (isset($input['address']) || isset($input['status']) || isset($input['category_id'])) {
            return false;
        }
        foreach (array_keys($input) as $key) {
            if (!in_array($key, ['form_data', 'scheduled_at'], true)) {
                return false;
            }
        }

        return isset($input['form_data']) || isset($input['scheduled_at']);
    }

    /** Reprise RDV par l’infirmier assigné (date, créneau, adresse, type de soin) — sans recréer ni annuler. */
    public static function isNurseReschedulePatch(array $input): bool
    {
        if (isset($input['status']) || isset($input['assigned_nurse_id']) || isset($input['assigned_lab_id'])) {
            return false;
        }
        $allowed = ['form_data', 'scheduled_at', 'address', 'category_id'];
        foreach (array_keys($input) as $key) {
            if (!in_array($key, $allowed, true)) {
                return false;
            }
        }

        return isset($input['form_data']) || isset($input['scheduled_at']) || isset($input['address']);
    }

    public static function patientOwnsPending(PDO $db, string $appointmentId, string $patientId): bool
    {
        $stmt = $db->prepare("
            SELECT id FROM appointments
            WHERE id = ? AND patient_id = ? AND status = 'pending'
            LIMIT 1
        ");
        $stmt->execute([$appointmentId, $patientId]);

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /** RDV soins assigné à l'infirmier ou partagé avec lui en binôme. */
    public static function nurseCanManageNursing(PDO $db, string $appointmentId, string $nurseId): bool
    {
        [$nurseSql, $nurseParams] = NurseCollaboration::assignedOrSharedSql('a', $nurseId);
        $stmt = $db->prepare("
            SELECT a.id FROM appointments a
            WHERE a.id = ? AND a.type = 'nursing' AND {$nurseSql}
              AND a.status IN ('confirmed', 'inProgress', 'planned', 'completed')
            LIMIT 1
        ");
        $stmt->execute([$appointmentId, ...$nurseParams]);

        return (bool) $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * completed / inProgress : assigné, invité en binôme, créateur pro, ou lab équipe.
     *
     * @param array<string, mixed> $user
     * @param array<string, mixed> $aptPerm
     */
    public static function canStaffSetCompletedOrInProgressWithDb(PDO $db, array $user, array $aptPerm): bool
    {
        if (($user['role'] ?? '') === 'super_admin') {
            return true;
        }
        $userId = (string) ($user['user_id'] ?? '');
        $isAssigned = ($aptPerm['assigned_nurse_id'] ?? null) === $userId
            || ($aptPerm['assigned_lab_id'] ?? null) === $userId
            || ($aptPerm['assigned_to'] ?? null) === $userId;
        $isProCreator = ($user['role'] ?? '') === 'pro' && ($aptPerm['created_by'] ?? null) === $userId;
        if ($isAssigned || $isProCreator) {
            return true;
        }
        if (($user['role'] ?? '') === 'nurse') {
            return NurseCollaboration::isAppointmentSharedWith($db, (string) ($aptPerm['id'] ?? ''), $userId);
        }
        if (in_array($user['role'] ?? '', ['lab', 'subaccount'], true)) {
            require_once __DIR__ . '/../LabTeamAccess.php';
            $teamIds = LabTeamAccess::teamMemberIds($db, $userId, (string) $user['role']);

            return in_array($aptPerm['assigned_lab_id'] ?? null, $teamIds, true)
                || in_array($aptPerm['assigned_to'] ?? null, $teamIds, true);
        }

        return false;
    }
}
