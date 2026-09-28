<?php

declare(strict_types=1);

/** Notes moyennes des assignés (liste + détail RDV). */
final class AppointmentReviewStats
{
    public function __construct(private PDO $db)
    {
    }

    /** @return array{average_rating: mixed, total_reviews: int|null} */
    public function forUserId(?string $userId): array
    {
        if ($userId === null || trim((string) $userId) === '') {
            return ['average_rating' => null, 'total_reviews' => null];
        }
        try {
            require_once __DIR__ . '/../../models/Review.php';
            $reviewModel = new Review();
            $stats = $reviewModel->getStats((string) $userId);
            $total = (int) ($stats['total_reviews'] ?? 0);
            if ($total <= 0) {
                return ['average_rating' => null, 'total_reviews' => null];
            }

            return [
                'average_rating' => $stats['average_rating'],
                'total_reviews' => $total,
            ];
        } catch (Throwable $e) {
            return ['average_rating' => null, 'total_reviews' => null];
        }
    }

    public function applyToAppointment(array &$appointment): void
    {
        $map = [
            ['assigned_nurse_id', 'assigned_nurse_average_rating', 'assigned_nurse_reviews_count'],
            ['assigned_lab_id', 'assigned_lab_average_rating', 'assigned_lab_reviews_count'],
            ['assigned_to', 'assigned_to_average_rating', 'assigned_to_reviews_count'],
        ];
        foreach ($map as [$idKey, $ratingKey, $countKey]) {
            $appointment[$ratingKey] = null;
            $appointment[$countKey] = null;
            if (empty($appointment[$idKey])) {
                continue;
            }
            $stats = $this->forUserId((string) $appointment[$idKey]);
            $appointment[$ratingKey] = $stats['average_rating'];
            $appointment[$countKey] = $stats['total_reviews'];
        }
    }

    /**
     * @param list<array<string, mixed>> $appointments
     */
    public function enrichList(array &$appointments): void
    {
        $userIds = [];
        foreach ($appointments as $apt) {
            foreach (['assigned_nurse_id', 'assigned_lab_id', 'assigned_to'] as $key) {
                if (!empty($apt[$key])) {
                    $userIds[] = (string) $apt[$key];
                }
            }
        }
        if ($userIds === []) {
            return;
        }

        require_once __DIR__ . '/../../models/Review.php';
        $statsByUser = (new Review())->getStatsByRevieweeIds($userIds);

        foreach ($appointments as &$appointment) {
            $map = [
                ['assigned_nurse_id', 'assigned_nurse_average_rating', 'assigned_nurse_reviews_count'],
                ['assigned_lab_id', 'assigned_lab_average_rating', 'assigned_lab_reviews_count'],
                ['assigned_to', 'assigned_to_average_rating', 'assigned_to_reviews_count'],
            ];
            foreach ($map as [$idKey, $ratingKey, $countKey]) {
                $appointment[$ratingKey] = null;
                $appointment[$countKey] = null;
                $uid = !empty($appointment[$idKey]) ? (string) $appointment[$idKey] : '';
                if ($uid === '' || !isset($statsByUser[$uid])) {
                    continue;
                }
                $appointment[$ratingKey] = $statsByUser[$uid]['average_rating'];
                $appointment[$countKey] = $statsByUser[$uid]['total_reviews'];
            }
        }
        unset($appointment);
    }
}
