<?php

declare(strict_types=1);

require_once __DIR__ . '/../LabTeamAccess.php';
require_once __DIR__ . '/../AppointmentDetailGate.php';
require_once __DIR__ . '/../AppointmentShareToken.php';
require_once __DIR__ . '/../nurse-collaboration/NurseCollaboration.php';

/** ACL GET /appointments/:id (ligne de contrôle + résolution merged_into). */
final class AppointmentDetailAccess
{
    /**
     * @return array{
     *   id: string,
     *   row: array<string, mixed>,
     *   has_merged_column: bool,
     *   has_creation_batch_column: bool
     * }|null null si RDV introuvable
     */
    public static function loadAccessContext(PDO $db, string $id): ?array
    {
        try {
            $hasMergedColumn = (bool) $db->query("
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'merged_into_appointment_id'
            ")->fetchColumn();
        } catch (Throwable $e) {
            $hasMergedColumn = false;
        }
        try {
            $hasCreationBatchColumn = (bool) $db->query("
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'appointments'
                  AND COLUMN_NAME = 'creation_batch_id'
            ")->fetchColumn();
        } catch (Throwable $e) {
            $hasCreationBatchColumn = false;
        }
        $mergedSelect = $hasMergedColumn ? ', merged_into_appointment_id' : '';
        $creationBatchSelect = $hasCreationBatchColumn ? ', creation_batch_id' : '';
        $stmt = $db->prepare("
            SELECT patient_id, relative_id, assigned_nurse_id, assigned_lab_id, assigned_to, created_by, type, status, location_lat, location_lng{$creationBatchSelect}{$mergedSelect}
            FROM appointments
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $appointmentCheck = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$appointmentCheck) {
            return null;
        }

        if ($hasMergedColumn && !empty($appointmentCheck['merged_into_appointment_id'])) {
            $id = (string) $appointmentCheck['merged_into_appointment_id'];
            $stmt->execute([$id]);
            $appointmentCheck = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$appointmentCheck) {
                return null;
            }
        }

        return [
            'id' => $id,
            'row' => $appointmentCheck,
            'has_merged_column' => $hasMergedColumn,
            'has_creation_batch_column' => $hasCreationBatchColumn,
        ];
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $appointmentCheck
     */
    public static function userHasDetailAccess(
        PDO $db,
        array $user,
        array $appointmentCheck,
        string $appointmentId,
        bool $hasCreationBatchColumn,
        ?string $shareTokenFromQuery = null
    ): bool {
        $hasAccess = (
            $appointmentCheck['patient_id'] === $user['user_id']
            || $appointmentCheck['assigned_nurse_id'] === $user['user_id']
            || $appointmentCheck['assigned_lab_id'] === $user['user_id']
            || (!empty($appointmentCheck['assigned_to']) && $appointmentCheck['assigned_to'] === $user['user_id'])
            || $appointmentCheck['created_by'] === $user['user_id']
            || $user['role'] === 'super_admin'
        );

        if ($user['role'] === 'nurse' && $appointmentCheck['type'] === 'blood_test' && $appointmentCheck['created_by'] !== $user['user_id']) {
            $hasAccess = false;
        }

        if ($user['role'] === 'preleveur' && $appointmentCheck['type'] !== 'blood_test') {
            $hasAccess = false;
        }

        if (!$hasAccess && $user['role'] === 'preleveur' && $appointmentCheck['type'] === 'blood_test') {
            $prelLabStmt = $db->prepare("SELECT lab_id FROM profiles WHERE id = ? AND role = 'preleveur' LIMIT 1");
            $prelLabStmt->execute([$user['user_id']]);
            $prelLabId = (string) ($prelLabStmt->fetch(PDO::FETCH_ASSOC)['lab_id'] ?? '');
            $assignedTo = (string) ($appointmentCheck['assigned_to'] ?? '');
            $assignedLab = (string) ($appointmentCheck['assigned_lab_id'] ?? '');
            if ($assignedTo !== '' && $assignedTo === (string) $user['user_id']) {
                $hasAccess = true;
            }
            if (
                !$hasAccess
                && $appointmentCheck['status'] === 'pending'
                && $assignedTo === ''
                && $prelLabId !== ''
                && $assignedLab === $prelLabId
            ) {
                $hasAccess = true;
            }
            if (!$hasAccess && $appointmentCheck['status'] === 'pending') {
                $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
                $offerStmt->execute([$appointmentId, $user['user_id']]);
                if ($offerStmt->fetch()) {
                    $hasAccess = true;
                }
            }
        }

        if (!$hasAccess && in_array($user['role'], ['lab', 'subaccount'], true) && $appointmentCheck['type'] === 'blood_test') {
            $teamIds = LabTeamAccess::teamMemberIds($db, $user['user_id'], $user['role']);
            if (in_array($appointmentCheck['assigned_lab_id'], $teamIds, true)) {
                $hasAccess = true;
            }
            if (!$hasAccess && !empty($appointmentCheck['assigned_to']) && in_array($appointmentCheck['assigned_to'], $teamIds, true)) {
                $hasAccess = true;
            }
            if (!$hasAccess && empty($appointmentCheck['assigned_lab_id']) && $appointmentCheck['status'] === 'pending') {
                $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
                foreach ($teamIds as $tid) {
                    $offerStmt->execute([$appointmentId, $tid]);
                    if ($offerStmt->fetch()) {
                        $hasAccess = true;
                        break;
                    }
                }
            }
        }

        if (
            !$hasAccess
            && $user['role'] === 'nurse'
            && $appointmentCheck['type'] === 'nursing'
            && $appointmentCheck['status'] === 'pending'
            && empty($appointmentCheck['assigned_nurse_id'])
        ) {
            $offerStmt = $db->prepare('SELECT 1 FROM appointment_offers WHERE appointment_id = ? AND profile_id = ? LIMIT 1');
            $offerStmt->execute([$appointmentId, $user['user_id']]);
            if ($offerStmt->fetch()) {
                $hasAccess = true;
            } else {
                $batchIdForAccess = $hasCreationBatchColumn ? ($appointmentCheck['creation_batch_id'] ?? null) : null;
                if (!empty($batchIdForAccess)) {
                    $batchOfferStmt = $db->prepare('
                        SELECT 1 FROM appointment_offers ao
                        INNER JOIN appointments a ON ao.appointment_id = a.id
                        WHERE ao.profile_id = ? AND a.creation_batch_id = ? AND a.type = \'nursing\'
                        LIMIT 1
                    ');
                    $batchOfferStmt->execute([$user['user_id'], $batchIdForAccess]);
                    if ($batchOfferStmt->fetch()) {
                        $hasAccess = true;
                    }
                }
                if (!$hasAccess) {
                    $shareTokenGet = trim((string) ($shareTokenFromQuery ?? ''));
                    if ($shareTokenGet !== '' && AppointmentShareToken::grantsNurseShareAccess($db, $shareTokenGet, $appointmentId)) {
                        $hasAccess = true;
                    }
                }
            }
        }

        if (
            $user['role'] === 'nurse'
            && ($appointmentCheck['type'] ?? '') === 'nursing'
            && !empty($appointmentCheck['assigned_nurse_id'])
            && (string) $appointmentCheck['assigned_nurse_id'] !== (string) $user['user_id']
        ) {
            $hasAccess = NurseCollaboration::isAppointmentSharedWith($db, $appointmentId, (string) $user['user_id']);
        }

        return $hasAccess;
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $appointmentCheck
     */
    public static function respondForbiddenOrExit(
        PDO $db,
        array $user,
        array $appointmentCheck
    ): void {
        AppointmentDetailGate::respondWhenForbidden(
            $db,
            $appointmentCheck,
            (string) $user['user_id'],
            (string) $user['role'],
        );
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Accès refusé à ce rendez-vous',
            'code' => 'FORBIDDEN',
        ]);
        exit;
    }

    /**
     * @param array<string, mixed> $user
     */
    public static function materializeShareOffersForNurse(
        PDO $db,
        array $user,
        string $appointmentId,
        ?string $shareToken
    ): void {
        $shareTokenMaterialize = trim((string) ($shareToken ?? ''));
        if (($user['role'] ?? '') !== 'nurse' || $shareTokenMaterialize === '') {
            return;
        }
        if (AppointmentShareToken::grantsNurseShareAccess($db, $shareTokenMaterialize, $appointmentId)) {
            AppointmentShareToken::materializeOffersForNurseFromShare($db, $user['user_id'], $appointmentId);
        }
    }
}
