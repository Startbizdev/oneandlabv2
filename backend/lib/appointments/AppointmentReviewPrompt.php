<?php

declare(strict_types=1);

/**
 * Quand proposer un avis au patient sur un RDV terminé :
 * - un seul avis par soignant : déjà noté (sur n'importe quel RDV) → on ne redemande plus ;
 * - passages en série (tournée) : seulement à partir du 3e passage terminé avec ce soignant.
 * Le RDV qui porte déjà l'avis du patient garde « reviewed_here » pour l'afficher.
 */
final class AppointmentReviewPrompt
{
    public const SERIES_MIN_COMPLETED = 3;

    /**
     * @param array<string, mixed> $appointment
     * @return array{eligible: bool, reviewed_here: bool}
     */
    public static function forPatient(PDO $db, array $appointment, string $patientId): array
    {
        $none = ['eligible' => false, 'reviewed_here' => false];
        if (($appointment['status'] ?? '') !== 'completed' || $patientId === '') {
            return $none;
        }
        $revieweeId = self::revieweeId($appointment);
        if ($revieweeId === null) {
            return $none;
        }

        $here = $db->prepare('SELECT 1 FROM reviews WHERE appointment_id = ? AND patient_id = ? LIMIT 1');
        $here->execute([(string) $appointment['id'], $patientId]);
        if ($here->fetchColumn()) {
            return ['eligible' => false, 'reviewed_here' => true];
        }

        $already = $db->prepare('SELECT 1 FROM reviews WHERE patient_id = ? AND reviewee_id = ? LIMIT 1');
        $already->execute([$patientId, $revieweeId]);
        if ($already->fetchColumn()) {
            return $none;
        }

        $seriesId = trim((string) ($appointment['passage_series_id'] ?? ''));
        if ($seriesId !== '') {
            $count = $db->prepare("
                SELECT COUNT(*) FROM appointments
                WHERE passage_series_id = ? AND status = 'completed'
                  AND (assigned_nurse_id = ? OR assigned_lab_id = ? OR assigned_to = ?)
            ");
            $count->execute([$seriesId, $revieweeId, $revieweeId, $revieweeId]);
            if ((int) $count->fetchColumn() < self::SERIES_MIN_COMPLETED) {
                return $none;
            }
        }

        return ['eligible' => true, 'reviewed_here' => false];
    }

    /** Même cible que l'app (reviewee-payload) : infirmier, sinon labo, sinon préleveur. */
    private static function revieweeId(array $appointment): ?string
    {
        $type = (string) ($appointment['type'] ?? '');
        $candidates = $type === 'blood_test'
            ? [$appointment['assigned_lab_id'] ?? null, $appointment['assigned_to'] ?? null]
            : [$appointment['assigned_nurse_id'] ?? null];
        foreach ($candidates as $id) {
            if (is_string($id) && trim($id) !== '') {
                return trim($id);
            }
        }

        return null;
    }
}
