<?php

declare(strict_types=1);

require_once __DIR__ . '/NurseCollaboration.php';
require_once __DIR__ . '/../AppTimezone.php';
require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../DatabaseTransaction.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../NotificationService.php';
require_once __DIR__ . '/../Uuid.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../users/UserBatchLookup.php';

/**
 * Binôme infirmier : le titulaire ajoute directement un confrère (sans acceptation) sur un RDV, une série
 * de passages ou une plage de sa tournée ; le titulaire ou l'invité peut retirer le binôme.
 */
final class NurseCollaborationService
{
    public const SCOPES = ['appointment', 'series', 'range'];
    public const NOTIFICATION_TYPE = 'nurse_collaboration_added';
    private const MAX_RANGE_DAYS = 92;

    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Binômes actifs dont l'infirmier est titulaire ou invité ; avec un RDV : tous ceux qui le couvrent.
     *
     * @return list<array<string, mixed>>
     */
    public function listFor(string $nurseId, ?string $appointmentId = null): array
    {
        if ($appointmentId === null) {
            $stmt = $this->db->prepare("
                SELECT * FROM nurse_collaborations
                WHERE revoked_at IS NULL AND (owner_nurse_id = ? OR co_nurse_id = ?)
                  AND (scope <> 'range' OR end_date >= ?)
                ORDER BY created_at DESC, id
            ");
            $stmt->execute([$nurseId, $nurseId, AppTimezone::format('Y-m-d')]);
        } else {
            [$nurseSql, $nurseParams] = NurseCollaboration::assignedOrSharedSql('a', $nurseId);
            $visible = $this->db->prepare("SELECT 1 FROM appointments a WHERE a.id = ? AND {$nurseSql} LIMIT 1");
            $visible->execute([$appointmentId, ...$nurseParams]);
            if ($visible->fetchColumn() === false) {
                throw HttpStatusException::notFound('Rendez-vous introuvable');
            }
            $stmt = $this->db->prepare('
                SELECT nc.* FROM nurse_collaborations nc
                INNER JOIN appointments a ON a.id = ? AND ' . NurseCollaboration::coversAppointmentSql('a', 'nc') . '
                ORDER BY nc.created_at DESC, nc.id
            ');
            $stmt->execute([$appointmentId]);
        }

        return $this->formatItems($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [], $nurseId);
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(string $ownerId, array $input): array
    {
        $coNurseId = trim((string) ($input['co_nurse_id'] ?? ''));
        if (!Validation::uuid($coNurseId)) {
            throw HttpStatusException::unprocessable('Confrère invalide');
        }
        if ($coNurseId === $ownerId) {
            throw HttpStatusException::unprocessable('Vous ne pouvez pas vous ajouter vous-même en binôme');
        }
        $coNurse = $this->db->prepare("
            SELECT 1 FROM profiles
            WHERE id = ? AND role = 'nurse' AND (banned_until IS NULL OR banned_until <= NOW())
            LIMIT 1
        ");
        $coNurse->execute([$coNurseId]);
        if ($coNurse->fetchColumn() === false) {
            throw HttpStatusException::unprocessable('Ce confrère n\'est pas un infirmier actif');
        }

        $target = $this->validateTarget($ownerId, $input);
        $id = Uuid::v4();
        DatabaseTransaction::run($this->db, function () use ($id, $ownerId, $coNurseId, $target): void {
            // Verrou par titulaire : deux ajouts simultanés identiques ne passent pas tous deux le contrôle de doublon.
            $this->db->prepare('SELECT id FROM profiles WHERE id = ? FOR UPDATE')->execute([$ownerId]);
            $duplicate = $this->db->prepare('
                SELECT 1 FROM nurse_collaborations
                WHERE revoked_at IS NULL AND owner_nurse_id = ? AND co_nurse_id = ? AND scope = ?
                  AND appointment_id <=> ? AND passage_series_id <=> ? AND start_date <=> ? AND end_date <=> ?
                LIMIT 1
            ');
            $duplicate->execute([
                $ownerId, $coNurseId, $target['scope'], $target['appointment_id'],
                $target['passage_series_id'], $target['start_date'], $target['end_date'],
            ]);
            if ($duplicate->fetchColumn() !== false) {
                throw HttpStatusException::conflict('Ce confrère est déjà ajouté en binôme sur ce périmètre', 'DUPLICATE_COLLABORATION');
            }
            $this->db->prepare('
                INSERT INTO nurse_collaborations
                    (id, owner_nurse_id, co_nurse_id, scope, appointment_id, passage_series_id, start_date, end_date, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ')->execute([
                $id, $ownerId, $coNurseId, $target['scope'], $target['appointment_id'],
                $target['passage_series_id'], $target['start_date'], $target['end_date'],
            ]);
        });

        $item = $this->loadItem($id, $ownerId);
        $this->notifyCoNurse($item);

        return $item;
    }

    public function revoke(string $nurseId, string $collaborationId): void
    {
        $stmt = $this->db->prepare('
            SELECT owner_nurse_id, co_nurse_id FROM nurse_collaborations
            WHERE id = ? AND revoked_at IS NULL
            LIMIT 1
        ');
        $stmt->execute([$collaborationId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw HttpStatusException::notFound('Binôme introuvable');
        }
        if ($nurseId !== (string) $row['owner_nurse_id'] && $nurseId !== (string) $row['co_nurse_id']) {
            throw HttpStatusException::forbidden('Seuls le titulaire et le confrère invité peuvent retirer ce binôme');
        }
        $this->db->prepare('UPDATE nurse_collaborations SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL')
            ->execute([$collaborationId]);
    }

    /**
     * @param array<string, mixed> $input
     * @return array{scope: string, appointment_id: ?string, passage_series_id: ?string, start_date: ?string, end_date: ?string}
     */
    private function validateTarget(string $ownerId, array $input): array
    {
        $scope = (string) ($input['scope'] ?? '');
        $target = ['scope' => $scope, 'appointment_id' => null, 'passage_series_id' => null, 'start_date' => null, 'end_date' => null];

        if ($scope === 'appointment') {
            $appointmentId = trim((string) ($input['appointment_id'] ?? ''));
            if ($appointmentId === '') {
                throw HttpStatusException::unprocessable('Rendez-vous requis');
            }
            $stmt = $this->db->prepare("
                SELECT 1 FROM appointments WHERE id = ? AND type = 'nursing' AND assigned_nurse_id = ? LIMIT 1
            ");
            $stmt->execute([$appointmentId, $ownerId]);
            if ($stmt->fetchColumn() === false) {
                throw HttpStatusException::unprocessable('Vous n\'êtes pas l\'infirmier titulaire de ce rendez-vous');
            }
            $target['appointment_id'] = $appointmentId;

            return $target;
        }

        if ($scope === 'series') {
            $seriesId = trim((string) ($input['passage_series_id'] ?? ''));
            if ($seriesId === '') {
                throw HttpStatusException::unprocessable('Série de passages requise');
            }
            $stmt = $this->db->prepare('SELECT 1 FROM nurse_passage_series WHERE id = ? AND nurse_id = ? LIMIT 1');
            $stmt->execute([$seriesId, $ownerId]);
            if ($stmt->fetchColumn() === false) {
                throw HttpStatusException::unprocessable('Vous n\'êtes pas l\'infirmier titulaire de cette série de passages');
            }
            $target['passage_series_id'] = $seriesId;

            return $target;
        }

        if ($scope === 'range') {
            $start = trim((string) ($input['start_date'] ?? ''));
            $end = trim((string) ($input['end_date'] ?? ''));
            if (!Validation::date($start) || !Validation::date($end)) {
                throw HttpStatusException::unprocessable('Dates invalides (AAAA-MM-JJ attendu)');
            }
            if ($start > $end) {
                throw HttpStatusException::unprocessable('La date de début doit précéder la date de fin');
            }
            $days = (new DateTimeImmutable($start))->diff(new DateTimeImmutable($end))->days + 1;
            if ($days > self::MAX_RANGE_DAYS) {
                throw HttpStatusException::unprocessable('La période ne peut pas dépasser ' . self::MAX_RANGE_DAYS . ' jours');
            }
            if ($end < AppTimezone::format('Y-m-d')) {
                throw HttpStatusException::unprocessable('La période est déjà terminée');
            }
            $target['start_date'] = $start;
            $target['end_date'] = $end;

            return $target;
        }

        throw HttpStatusException::unprocessable('Périmètre invalide (appointment, series ou range)');
    }

    /**
     * @return array<string, mixed>
     */
    private function loadItem(string $id, string $viewerId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM nurse_collaborations WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Binôme créé introuvable : ' . $id);
        }

        return $this->formatItems([$row], $viewerId)[0];
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function formatItems(array $rows, string $viewerId): array
    {
        if ($rows === []) {
            return [];
        }
        $lookup = new UserBatchLookup($this->db, new Crypto());
        $names = $lookup->displayNamesByIds([...array_column($rows, 'owner_nurse_id'), ...array_column($rows, 'co_nurse_id')]);
        $images = $lookup->profileImageUrlsByIds(array_column($rows, 'co_nurse_id'));

        return array_map(static function (array $row) use ($names, $images, $viewerId): array {
            $ownerId = (string) $row['owner_nurse_id'];
            $coNurseId = (string) $row['co_nurse_id'];

            return [
                'id' => (string) $row['id'],
                'scope' => (string) $row['scope'],
                'owner_nurse_id' => $ownerId,
                'owner_name' => (string) ($names[$ownerId] ?? ''),
                'co_nurse_id' => $coNurseId,
                'co_nurse_name' => (string) ($names[$coNurseId] ?? ''),
                'co_nurse_profile_image_url' => $images[$coNurseId] ?? null,
                'appointment_id' => $row['appointment_id'] !== null ? (string) $row['appointment_id'] : null,
                'passage_series_id' => $row['passage_series_id'] !== null ? (string) $row['passage_series_id'] : null,
                'start_date' => $row['start_date'] !== null ? (string) $row['start_date'] : null,
                'end_date' => $row['end_date'] !== null ? (string) $row['end_date'] : null,
                'created_at' => (string) $row['created_at'],
                'can_remove' => $viewerId === $ownerId || $viewerId === $coNurseId,
            ];
        }, $rows);
    }

    /**
     * @param array<string, mixed> $item
     */
    private function notifyCoNurse(array $item): void
    {
        $owner = $item['owner_name'] !== '' ? $item['owner_name'] : 'Un confrère';
        $message = match ($item['scope']) {
            'appointment' => "{$owner} vous a ajouté·e en binôme sur un rendez-vous.",
            'series' => "{$owner} vous a ajouté·e en binôme sur une série de passages.",
            default => sprintf(
                '%s vous confie sa tournée du %s au %s.',
                $owner,
                (new DateTimeImmutable((string) $item['start_date']))->format('d/m/Y'),
                (new DateTimeImmutable((string) $item['end_date']))->format('d/m/Y'),
            ),
        };
        $data = array_filter([
            'collaboration_id' => $item['id'],
            'scope' => $item['scope'],
            'appointment_id' => $item['appointment_id'],
            'passage_series_id' => $item['passage_series_id'],
            'start_date' => $item['start_date'],
        ], static fn (mixed $value): bool => $value !== null);
        try {
            (new NotificationService())->createNotification(
                (string) $item['co_nurse_id'],
                self::NOTIFICATION_TYPE,
                'Binôme infirmier',
                $message,
                $data,
            );
        } catch (Throwable $e) {
            error_log('[nurse-collaboration] notification ' . $item['id'] . ' : ' . $e->getMessage());
        }
    }
}
