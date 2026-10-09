<?php

declare(strict_types=1);

require_once __DIR__ . '/../RelativeProfile.php';
require_once __DIR__ . '/../nurse-collaboration/NurseCollaboration.php';

/**
 * Équipe soignante d'un dossier : infirmiers et médecins qui y ont accès selon les mêmes règles que
 * MedicalDocumentAccess::userHasProfileDocumentAccess (PPA, créateur du patient, RDV assigné, créé ou partagé en binôme).
 * Dossier d'un proche : seuls ses propres RDV comptent (pas ceux du titulaire).
 */
final class PatientCareTeam
{
    public const ROLES = ['nurse', 'pro'];

    /**
     * @return list<array{id: string, role: string}>
     */
    public static function members(PDO $db, string $patientId): array
    {
        [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($db, 'a', $patientId);
        $coveredSql = NurseCollaboration::coversAppointmentSql('a', 'nc');
        $stmt = $db->prepare("
            SELECT p.id, p.role
            FROM profiles p
            WHERE p.role IN ('nurse', 'pro')
              AND p.id IN (
                  SELECT professional_id FROM patient_professional_access WHERE patient_id = ?
                  UNION SELECT created_by FROM profiles WHERE id = ? AND created_by IS NOT NULL
                  UNION SELECT a.assigned_nurse_id FROM appointments a WHERE $subjectSql AND a.assigned_nurse_id IS NOT NULL
                  UNION SELECT a.created_by FROM appointments a WHERE $subjectSql AND a.created_by IS NOT NULL
                  UNION SELECT nc.co_nurse_id FROM appointments a
                      INNER JOIN nurse_collaborations nc ON $coveredSql
                      WHERE $subjectSql
              )
            ORDER BY p.id
        ");
        $stmt->execute([$patientId, $patientId, ...$subjectParams, ...$subjectParams, ...$subjectParams]);

        $members = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $members[] = ['id' => (string) $row['id'], 'role' => (string) $row['role']];
        }

        return $members;
    }
}
