<?php

declare(strict_types=1);

/**
 * Validations métier pour la création de rendez-vous.
 */
final class AppointmentCreationValidator
{
    public function __construct(
        private PDO $db,
    ) {
    }

    /**
     * Valide que la date du RDV respecte les paramètres du lab (délai min, samedi, dimanche).
     *
     * @param bool $skipLeadTimeValidation Si true (création depuis espace pro / personnel soignant / lab / admin), n'applique pas le délai min. du profil lab (RDV le jour J autorisé).
     * @throws Exception si la date ne respecte pas les contraintes
     */
    public function validateLabAppointmentParams(string $labId, string $scheduledAtIso, DateTime $scheduledDate, bool $skipLeadTimeValidation = false): void
    {
        try {
            $stmt = $this->db->prepare('
                SELECT min_booking_lead_time_hours,
                       COALESCE(accept_rdv_saturday, 1) as accept_rdv_saturday,
                       COALESCE(accept_rdv_sunday, 1) as accept_rdv_sunday
                FROM profiles WHERE id = ?
            ');
            $stmt->execute([$labId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Throwable $e) {
            return;
        }
        if (!$row) {
            return;
        }
        $minHours = (int) ($row['min_booking_lead_time_hours'] ?? 48);
        $acceptSaturday = (bool) ($row['accept_rdv_saturday'] ?? true);
        $acceptSunday = (bool) ($row['accept_rdv_sunday'] ?? true);

        $tzParis = new DateTimeZone('Europe/Paris');
        $now = new DateTime('now', $tzParis);
        if ($minHours > 0 && !$skipLeadTimeValidation) {
            $minAllowed = (clone $now)->modify("+{$minHours} hours");
            if ($scheduledDate < $minAllowed) {
                throw new Exception("La date du rendez-vous doit être au moins {$minHours}h à l'avance par rapport à maintenant.");
            }
        }
        $dayOfWeek = (int) $scheduledDate->format('w'); // 0 = dimanche, 6 = samedi
        if ($dayOfWeek === 0 && !$acceptSunday) {
            throw new Exception('Ce laboratoire n\'accepte pas les rendez-vous le dimanche.');
        }
        if ($dayOfWeek === 6 && !$acceptSaturday) {
            throw new Exception('Ce laboratoire n\'accepte pas les rendez-vous le samedi.');
        }
    }

    /**
     * Déduit is_minor et age_years depuis birth_date du proche (Europe/Paris).
     * N'ajoute les clés que si le calcul est fiable (date valide, pas dans le futur).
     *
     * @param array<string, mixed> $relative
     */
    public function enrichRelativeMinorFromBirthDate(array &$relative): void
    {
        $bd = $relative['birth_date'] ?? null;
        if ($bd === null || $bd === '') {
            return;
        }
        try {
            $tz = new DateTimeZone('Europe/Paris');
            $today = new DateTime('now', $tz);
            $today->setTime(0, 0, 0);
            $birthStr = is_string($bd) ? trim($bd) : '';
            if ($birthStr === '') {
                return;
            }
            $birth = null;
            if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $birthStr, $m)) {
                $birth = DateTime::createFromFormat('Y-m-d', $m[1], $tz);
            }
            if (!$birth instanceof DateTime) {
                $birth = new DateTime($birthStr, $tz);
            }
            $birth->setTime(0, 0, 0);
            if ($birth > $today) {
                return;
            }
            $age = $today->diff($birth)->y;
            if ($age < 0 || $age > 130) {
                return;
            }
            $relative['age_years'] = $age;
            $relative['is_minor'] = $age < 18;
        } catch (Throwable $e) {
            // Ne pas exposer is_minor si calcul non fiable
        }
    }
}
