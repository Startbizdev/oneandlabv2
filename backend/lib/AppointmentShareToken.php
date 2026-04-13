<?php

/**
 * Jetons de partage RDV (lien WhatsApp /p/rdv/{token}).
 */
class AppointmentShareToken
{
    public static function isValid(PDO $db, string $token, string $appointmentId): bool
    {
        if ($token === '' || strlen($token) < 32) {
            return false;
        }
        $stmt = $db->prepare(
            'SELECT 1 FROM appointment_share_tokens WHERE token = ? AND appointment_id = ? AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1'
        );
        $stmt->execute([$token, $appointmentId]);
        return $stmt->fetchColumn() !== false;
    }

    /**
     * Infirmier : accès via jeton pour le RDV ciblé OU pour tout autre RDV nursing du même lot
     * (même creation_batch_id + patient_id, les deux en pending sans assignation).
     * Utilisé pour charger les « frères » du lot dans la modal sans exiger une ligne appointment_offers par soin.
     */
    public static function grantsNurseShareAccess(PDO $db, string $token, string $requestedAppointmentId): bool
    {
        if ($token === '' || strlen($token) < 32 || $requestedAppointmentId === '') {
            return false;
        }
        if (self::isValid($db, $token, $requestedAppointmentId)) {
            return true;
        }
        $stmt = $db->prepare(
            'SELECT appointment_id FROM appointment_share_tokens WHERE token = ? AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['appointment_id'])) {
            return false;
        }
        $anchorId = (string) $row['appointment_id'];
        if ($anchorId === (string) $requestedAppointmentId) {
            return true;
        }
        $q = $db->prepare(
            'SELECT
                a.creation_batch_id AS ab, a.patient_id AS ap, a.type AS aty, a.status AS ast, a.assigned_nurse_id AS an,
                b.creation_batch_id AS bb, b.patient_id AS bp, b.type AS bty, b.status AS bst, b.assigned_nurse_id AS bn
             FROM appointments a
             INNER JOIN appointments b ON b.id = ?
             WHERE a.id = ?'
        );
        $q->execute([$requestedAppointmentId, $anchorId]);
        $j = $q->fetch(PDO::FETCH_ASSOC);
        if (!$j) {
            return false;
        }
        if (($j['aty'] ?? '') !== 'nursing' || ($j['bty'] ?? '') !== 'nursing') {
            return false;
        }
        $batch = $j['ab'] ?? null;
        if ($batch === null || $batch === '' || (string) $batch !== (string) ($j['bb'] ?? '')) {
            return false;
        }
        $pat = $j['ap'] ?? null;
        if ($pat === null || $pat === '' || (string) $pat !== (string) ($j['bp'] ?? '')) {
            return false;
        }
        if (($j['ast'] ?? '') !== 'pending' || ($j['bst'] ?? '') !== 'pending') {
            return false;
        }
        if (!empty($j['an']) || !empty($j['bn'])) {
            return false;
        }

        return true;
    }

    /**
     * Après ouverture du lien : enregistre des lignes appointment_offers pour l’infirmier connecté
     * sur tout le lot (même batch), pour que « Mes demandes » et le polling listent les même RDV.
     */
    public static function materializeOffersForNurseFromShare(PDO $db, string $nurseProfileId, string $appointmentId): void
    {
        $stmt = $db->prepare('SELECT creation_batch_id, patient_id, type, status, assigned_nurse_id FROM appointments WHERE id = ?');
        $stmt->execute([$appointmentId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || ($row['type'] ?? '') !== 'nursing' || ($row['status'] ?? '') !== 'pending') {
            return;
        }
        if (!empty($row['assigned_nurse_id'])) {
            return;
        }
        $batchId = $row['creation_batch_id'] ?? null;
        $patientId = $row['patient_id'] ?? null;
        $ids = [];
        if (!empty($batchId) && !empty($patientId)) {
            $q = $db->prepare(
                'SELECT id FROM appointments
                 WHERE creation_batch_id = ? AND patient_id = ? AND type = ? AND status = ?
                 AND (assigned_nurse_id IS NULL OR assigned_nurse_id = \'\')'
            );
            $q->execute([$batchId, $patientId, 'nursing', 'pending']);
            while ($r = $q->fetch(PDO::FETCH_ASSOC)) {
                $ids[] = (string) $r['id'];
            }
        } else {
            $ids[] = (string) $appointmentId;
        }
        if ($ids === []) {
            return;
        }
        $ins = $db->prepare('INSERT IGNORE INTO appointment_offers (appointment_id, profile_id) VALUES (?, ?)');
        foreach ($ids as $aid) {
            $ins->execute([$aid, $nurseProfileId]);
        }
    }
}
