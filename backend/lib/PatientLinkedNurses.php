<?php

declare(strict_types=1);

require_once __DIR__ . '/../models/User.php';

/**
 * Infirmiers Cary déjà liés à un patient (accès pro + historique RDV).
 */
final class PatientLinkedNurses
{
    /** Même périmètre que listForPatient : lien d'accès ou soin déjà assigné à cet infirmier. */
    public static function isLinked(PDO $db, string $patientId, string $nurseId): bool
    {
        $stmt = $db->prepare("
            SELECT 1 FROM profiles p
            WHERE p.id = ? AND p.role = 'nurse'
              AND (
                EXISTS (SELECT 1 FROM patient_professional_access ppa WHERE ppa.patient_id = ? AND ppa.professional_id = p.id)
                OR EXISTS (
                    SELECT 1 FROM appointments a
                    WHERE a.patient_id = ? AND a.type = 'nursing' AND a.assigned_nurse_id = p.id
                )
              )
            LIMIT 1
        ");
        $stmt->execute([$nurseId, $patientId, $patientId]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * @return list<array{id: string, display_name: string, phone: string|null, source: string, last_at: string|null}>
     */
    public static function listForPatient(PDO $db, string $patientId): array
    {
        $sql = "
            SELECT
                p.id,
                MAX(GREATEST(
                    COALESCE(ppa.created_at, '1970-01-01'),
                    COALESCE(a.last_at, '1970-01-01')
                )) AS linked_at,
                CASE
                    WHEN MAX(ppa.professional_id) IS NOT NULL AND MAX(a.nurse_id) IS NOT NULL THEN 'access_and_care'
                    WHEN MAX(ppa.professional_id) IS NOT NULL THEN 'access'
                    ELSE 'care_history'
                END AS source
            FROM profiles p
            LEFT JOIN patient_professional_access ppa
                ON ppa.professional_id = p.id AND ppa.patient_id = ?
            LEFT JOIN (
                SELECT assigned_nurse_id AS nurse_id, MAX(COALESCE(scheduled_at, created_at)) AS last_at
                FROM appointments
                WHERE patient_id = ?
                  AND type = 'nursing'
                  AND assigned_nurse_id IS NOT NULL
                GROUP BY assigned_nurse_id
            ) a ON a.nurse_id = p.id
            WHERE p.role = 'nurse'
              AND (ppa.professional_id IS NOT NULL OR a.nurse_id IS NOT NULL)
            GROUP BY p.id
            ORDER BY linked_at DESC
            LIMIT 50
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute([$patientId, $patientId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if ($rows === []) {
            return [];
        }

        $ids = array_map(static fn(array $r): string => (string) $r['id'], $rows);
        $userModel = new User();
        $names = $userModel->getDisplayNamesByIds($ids);

        $phoneById = [];
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $phoneStmt = $db->prepare("SELECT id, phone_encrypted, phone_dek FROM profiles WHERE id IN ($ph)");
        $phoneStmt->execute($ids);
        require_once __DIR__ . '/Crypto.php';
        $crypto = new Crypto();
        while ($prow = $phoneStmt->fetch(PDO::FETCH_ASSOC)) {
            $pid = (string) ($prow['id'] ?? '');
            $phone = null;
            try {
                if (!empty($prow['phone_encrypted']) && !empty($prow['phone_dek'])) {
                    $dec = $crypto->decryptField($prow['phone_encrypted'], $prow['phone_dek']);
                    $phone = is_string($dec) && trim($dec) !== '' ? trim($dec) : null;
                }
            } catch (Throwable $e) {
                $phone = null;
            }
            $phoneById[$pid] = $phone;
        }

        $out = [];
        foreach ($rows as $row) {
            $id = (string) ($row['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $out[] = [
                'id' => $id,
                'display_name' => $names[$id] ?? 'Infirmier(ère)',
                'phone' => $phoneById[$id] ?? null,
                'source' => (string) ($row['source'] ?? 'care_history'),
                'last_at' => $row['linked_at'] ?? null,
            ];
        }

        return $out;
    }
}
