<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/PatientCareTeam.php';
require_once __DIR__ . '/../HttpStatusException.php';
require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../Logger.php';
require_once __DIR__ . '/../AppTimezone.php';
require_once __DIR__ . '/../DbSchemaCache.php';
require_once __DIR__ . '/../Validation.php';
require_once __DIR__ . '/../pharmacy/PharmacyModuleConfig.php';
require_once __DIR__ . '/../PatientDossierAccess.php';
require_once __DIR__ . '/../RelativeProfile.php';
require_once __DIR__ . '/../../models/User.php';

/**
 * Transmissions ciblées : fil daté par patient, partagé par l'équipe soignante (infirmiers, médecins du dossier).
 * Le patient n'y a pas accès. Texte chiffré, modifiable par son auteur pendant 24 h.
 */
final class PatientTransmissionService
{
    public const TYPE_TEAM = 'patient_transmission';
    public const TYPE_FOR_DOCTOR = 'patient_transmission_for_doctor';

    private const WRITE_ROLES = ['nurse', 'pro'];
    private const READ_ROLES = ['nurse', 'pro', 'super_admin'];
    private const MAX_BODY_LENGTH = 4000;
    private const MAX_CARE_ITEMS = 30;
    private const DEFAULT_PAGE_DAYS = 14;
    private const INSTANT_COLUMNS = 'UNIX_TIMESTAMP(t.created_at) AS created_at_unix, UNIX_TIMESTAMP(t.edited_at) AS edited_at_unix';
    private const MAX_PAGE_DAYS = 60;
    private const CARE_ITEM_KINDS = ['nursing_item', 'category'];
    private const PASSAGE_STATUSES = ['confirmed', 'inProgress', 'planned', 'completed'];

    private PDO $db;

    private Crypto $crypto;

    private User $users;

    /** @var callable(string, string, string, string, ?array): mixed */
    private $notify;

    /**
     * @param callable(string, string, string, string, ?array): mixed $notify même signature que NotificationService::createNotification
     */
    public function __construct(callable $notify, ?PDO $db = null, ?Crypto $crypto = null)
    {
        $this->notify = $notify;
        $this->db = $db ?? health_db();
        $this->crypto = $crypto ?? new Crypto();
        $this->users = new User($this->db);
    }

    /**
     * Fil paginé par jour : `before` (Y-m-d exclu) renvoie les jours plus anciens.
     *
     * @return array{items: list<array<string, mixed>>, next_before: ?string}
     */
    public function list(array $viewer, string $patientId, ?string $before = null, int $days = self::DEFAULT_PAGE_DAYS): array
    {
        $this->assertAccess($viewer, $patientId, self::READ_ROLES);
        $days = max(1, min($days, self::MAX_PAGE_DAYS));
        if ($before !== null && AppTimezone::parseDateYmd($before) === null) {
            throw new InvalidArgumentException('Date de pagination invalide');
        }

        $sql = 'SELECT DISTINCT occurred_on FROM patient_transmissions WHERE patient_id = ?';
        $params = [$patientId];
        if ($before !== null) {
            $sql .= ' AND occurred_on < ?';
            $params[] = $before;
        }
        $stmt = $this->db->prepare($sql . ' ORDER BY occurred_on DESC LIMIT ' . ($days + 1));
        $stmt->execute($params);
        $dayList = $stmt->fetchAll(PDO::FETCH_COLUMN);
        if ($dayList === []) {
            return ['items' => [], 'next_before' => null];
        }
        $hasMore = count($dayList) > $days;
        $dayList = array_slice($dayList, 0, $days);
        $newest = (string) $dayList[0];
        $oldest = (string) $dayList[count($dayList) - 1];

        $rowsStmt = $this->db->prepare('
            SELECT t.*, ' . self::INSTANT_COLUMNS . ', (t.author_id = ? AND t.created_at >= NOW() - INTERVAL 24 HOUR) AS can_edit
            FROM patient_transmissions t
            WHERE t.patient_id = ? AND t.occurred_on BETWEEN ? AND ?
            ORDER BY t.occurred_on DESC, t.created_at DESC, t.id DESC
        ');
        $rowsStmt->execute([(string) ($viewer['user_id'] ?? ''), $patientId, $oldest, $newest]);
        $rows = $rowsStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $this->mapRows($viewer, $rows),
            'next_before' => $hasMore ? $oldest : null,
        ];
    }

    /**
     * Soins proposés à la saisie : ceux des passages du patient ce jour-là, sinon le catalogue des soins infirmiers.
     *
     * @return array{date: string, passage_items: list<array<string, mixed>>, categories: list<array<string, string>>}
     */
    public function careItemsForDate(array $viewer, string $patientId, string $date): array
    {
        $this->assertAccess($viewer, $patientId, self::WRITE_ROLES);
        $day = AppTimezone::parseDateYmd($date);
        if ($day === null) {
            throw new InvalidArgumentException('Date invalide');
        }

        $hasDoneAt = DbSchemaCache::tableHasColumn($this->db, 'appointment_nursing_items', 'done_at');
        $statuses = implode(',', array_fill(0, count(self::PASSAGE_STATUSES), '?'));
        [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($this->db, 'a', $patientId);
        $stmt = $this->db->prepare('
            SELECT ani.id, ani.appointment_id, ani.category_id, ani.label, ani.care_options,
                   cc.name AS category_name' . ($hasDoneAt ? ', ani.done_at' : '') . '
            FROM appointment_nursing_items ani
            INNER JOIN appointments a ON a.id = ani.appointment_id
            LEFT JOIN care_categories cc ON cc.id = ani.category_id
            WHERE ' . $subjectSql . '
              AND a.scheduled_at >= ? AND a.scheduled_at < ?
              AND a.status IN (' . $statuses . ')
            ORDER BY a.scheduled_at ASC, ani.sort_order ASC, ani.id ASC
        ');
        $stmt->execute(array_merge(
            $subjectParams,
            [$day->format('Y-m-d 00:00:00'), $day->modify('+1 day')->format('Y-m-d 00:00:00')],
            self::PASSAGE_STATUSES,
        ));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $labels = $this->nursingItemLabels($rows);
        $passageItems = [];
        foreach ($rows as $row) {
            $passageItems[] = [
                'kind' => 'nursing_item',
                'id' => (string) $row['id'],
                'label' => $labels[(string) $row['id']],
                'appointment_id' => (string) $row['appointment_id'],
                'done' => $hasDoneAt && !empty($row['done_at']),
            ];
        }

        $categories = [];
        $catStmt = $this->db->query("SELECT id, name FROM care_categories WHERE type = 'nursing' AND is_active = 1 ORDER BY name ASC");
        foreach ($catStmt->fetchAll(PDO::FETCH_ASSOC) as $cat) {
            $categories[] = ['kind' => 'category', 'id' => (string) $cat['id'], 'label' => (string) $cat['name']];
        }

        return ['date' => $day->format('Y-m-d'), 'passage_items' => $passageItems, 'categories' => $categories];
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function create(array $viewer, string $patientId, array $input): array
    {
        $this->assertAccess($viewer, $patientId, self::WRITE_ROLES);
        $payload = $this->normalizeInput($patientId, $input);
        $encrypted = $this->crypto->encryptField($payload['body']);
        $id = health_uuid();
        $authorId = (string) $viewer['user_id'];

        $this->db->prepare('
            INSERT INTO patient_transmissions (
                id, patient_id, author_id, author_role, occurred_on, body_encrypted, body_dek,
                care_item_ids, appointment_id, for_doctor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ')->execute([
            $id,
            $patientId,
            $authorId,
            (string) $viewer['role'],
            $payload['occurred_on'],
            $encrypted['encrypted'],
            $encrypted['dek'],
            json_encode($payload['care_items'], JSON_UNESCAPED_UNICODE),
            $payload['appointment_id'],
            $payload['for_doctor'] ? 1 : 0,
        ]);

        $transmission = $this->fetchOne($viewer, $patientId, $id);
        $this->notifyTeam($patientId, $authorId, $transmission, $payload['for_doctor']);

        return $transmission;
    }

    /**
     * @param array<string, mixed> $input champs absents = inchangés
     * @return array<string, mixed>
     */
    public function update(array $viewer, string $patientId, string $transmissionId, array $input): array
    {
        $this->assertAccess($viewer, $patientId, self::WRITE_ROLES);
        $stmt = $this->db->prepare('
            SELECT t.*, (t.created_at >= NOW() - INTERVAL 24 HOUR) AS within_window
            FROM patient_transmissions t
            WHERE t.id = ? AND t.patient_id = ?
            LIMIT 1
        ');
        $stmt->execute([$transmissionId, $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            throw HttpStatusException::notFound('Transmission introuvable');
        }
        $authorId = (string) $viewer['user_id'];
        if ((string) ($row['author_id'] ?? '') !== $authorId) {
            throw HttpStatusException::forbidden('Seul l\'auteur peut modifier cette transmission');
        }
        if ((int) $row['within_window'] !== 1) {
            throw HttpStatusException::conflict('Une transmission n\'est plus modifiable après 24 h', 'TRANSMISSION_LOCKED');
        }

        $current = [
            'body' => $this->crypto->decryptField((string) $row['body_encrypted'], (string) $row['body_dek']),
            'occurred_on' => (string) $row['occurred_on'],
            'care_items' => $this->decodeCareItems($row['care_item_ids'] ?? null),
            'appointment_id' => $row['appointment_id'],
            'for_doctor' => (int) $row['for_doctor'] === 1,
        ];
        $payload = $this->normalizeInput($patientId, array_merge($current, $input));
        $encrypted = $this->crypto->encryptField($payload['body']);

        $this->db->prepare('
            UPDATE patient_transmissions
            SET occurred_on = ?, body_encrypted = ?, body_dek = ?, care_item_ids = ?, appointment_id = ?,
                for_doctor = ?, edited_at = CURRENT_TIMESTAMP
            WHERE id = ? AND patient_id = ?
        ')->execute([
            $payload['occurred_on'],
            $encrypted['encrypted'],
            $encrypted['dek'],
            json_encode($payload['care_items'], JSON_UNESCAPED_UNICODE),
            $payload['appointment_id'],
            $payload['for_doctor'] ? 1 : 0,
            $transmissionId,
            $patientId,
        ]);

        $transmission = $this->fetchOne($viewer, $patientId, $transmissionId);
        if ($payload['for_doctor'] && !$current['for_doctor']) {
            $this->notifyDoctors($patientId, $authorId, $transmission);
        }

        return $transmission;
    }

    private function assertAccess(array $viewer, string $patientId, array $roles): void
    {
        if (!in_array((string) ($viewer['role'] ?? ''), $roles, true)) {
            throw HttpStatusException::forbidden('Transmissions réservées à l\'équipe soignante');
        }
        if ($this->viewerIsPharmacy($viewer)) {
            throw HttpStatusException::forbidden('Les transmissions ne concernent pas la pharmacie');
        }
        if (!PatientDossierAccess::canAccess($this->db, $this->users, $viewer, $patientId)) {
            throw HttpStatusException::forbidden('Accès au dossier refusé');
        }
    }

    /** @param array<string, mixed> $viewer */
    private function viewerIsPharmacy(array $viewer): bool
    {
        if ((string) ($viewer['role'] ?? '') !== 'pro') {
            return false;
        }
        $emploi = trim((string) ($viewer['emploi'] ?? ''));
        $viewerId = (string) ($viewer['user_id'] ?? $viewer['id'] ?? '');
        if ($emploi === '' && $viewerId !== '') {
            $stmt = $this->db->prepare('SELECT emploi FROM profiles WHERE id = ? LIMIT 1');
            $stmt->execute([$viewerId]);
            $emploi = trim((string) $stmt->fetchColumn());
        }
        $config = (new PharmacyModuleConfig($this->db))->getConfig();

        return PharmacyModuleConfig::isPharmacyAccount(['role' => 'pro', 'emploi' => $emploi], $config);
    }

    /**
     * @param array<string, mixed> $input
     * @return array{body: string, occurred_on: string, care_items: list<array{kind: string, id: string, label: string}>, appointment_id: ?string, for_doctor: bool}
     */
    private function normalizeInput(string $patientId, array $input): array
    {
        $body = trim((string) ($input['body'] ?? ''));
        if ($body === '') {
            throw new InvalidArgumentException('Le texte de la transmission est requis');
        }
        if (mb_strlen($body) > self::MAX_BODY_LENGTH) {
            throw new InvalidArgumentException('Transmission trop longue');
        }

        $occurredRaw = trim((string) ($input['occurred_on'] ?? ''));
        $occurred = $occurredRaw === '' ? AppTimezone::now()->setTime(0, 0) : AppTimezone::parseDateYmd($occurredRaw);
        if ($occurred === null) {
            throw new InvalidArgumentException('Date invalide');
        }
        if ($occurred->format('Y-m-d') > AppTimezone::now()->format('Y-m-d')) {
            throw new InvalidArgumentException('La date ne peut pas être dans le futur');
        }

        $appointmentId = isset($input['appointment_id']) ? trim((string) $input['appointment_id']) : '';
        if ($appointmentId !== '') {
            if (!Validation::uuid($appointmentId)) {
                throw new InvalidArgumentException('Rendez-vous invalide pour ce patient');
            }
            [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($this->db, 'a', $patientId);
            $check = $this->db->prepare("SELECT 1 FROM appointments a WHERE a.id = ? AND $subjectSql LIMIT 1");
            $check->execute([$appointmentId, ...$subjectParams]);
            if (!$check->fetchColumn()) {
                throw new InvalidArgumentException('Rendez-vous invalide pour ce patient');
            }
        }

        return [
            'body' => $body,
            'occurred_on' => $occurred->format('Y-m-d'),
            'care_items' => $this->resolveCareItems($patientId, $input['care_items'] ?? []),
            'appointment_id' => $appointmentId !== '' ? $appointmentId : null,
            'for_doctor' => filter_var($input['for_doctor'] ?? false, FILTER_VALIDATE_BOOLEAN),
        ];
    }

    /**
     * Valide les soins cochés (soin d'un passage de ce patient, ou soin infirmier du catalogue) et fige leur libellé.
     *
     * @return list<array{kind: string, id: string, label: string}>
     */
    private function resolveCareItems(string $patientId, mixed $raw): array
    {
        if (!is_array($raw)) {
            throw new InvalidArgumentException('Soins invalides');
        }
        if (count($raw) > self::MAX_CARE_ITEMS) {
            throw new InvalidArgumentException('Trop de soins cochés');
        }
        $refs = ['nursing_item' => [], 'category' => []];
        foreach ($raw as $item) {
            $kind = is_array($item) ? (string) ($item['kind'] ?? '') : '';
            $id = is_array($item) ? trim((string) ($item['id'] ?? '')) : '';
            if (!in_array($kind, self::CARE_ITEM_KINDS, true) || !Validation::uuid($id)) {
                throw new InvalidArgumentException('Soin invalide');
            }
            $refs[$kind][$id] = true;
        }

        $labels = [];
        if ($refs['nursing_item'] !== []) {
            $ids = array_keys($refs['nursing_item']);
            [$subjectSql, $subjectParams] = RelativeProfile::appointmentSubjectSql($this->db, 'a', $patientId);
            $stmt = $this->db->prepare('
                SELECT ani.id, ani.category_id, ani.label, ani.care_options, cc.name AS category_name
                FROM appointment_nursing_items ani
                INNER JOIN appointments a ON a.id = ani.appointment_id
                LEFT JOIN care_categories cc ON cc.id = ani.category_id
                WHERE ' . $subjectSql . ' AND ani.id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')
            ');
            $stmt->execute(array_merge($subjectParams, $ids));
            foreach ($this->nursingItemLabels($stmt->fetchAll(PDO::FETCH_ASSOC)) as $id => $label) {
                $labels['nursing_item'][$id] = $label;
            }
        }
        if ($refs['category'] !== []) {
            $ids = array_keys($refs['category']);
            $stmt = $this->db->prepare("
                SELECT id, name FROM care_categories
                WHERE type = 'nursing' AND id IN (" . implode(',', array_fill(0, count($ids), '?')) . ')
            ');
            $stmt->execute($ids);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $cat) {
                $labels['category'][(string) $cat['id']] = (string) $cat['name'];
            }
        }

        $items = [];
        foreach ($refs as $kind => $ids) {
            foreach (array_keys($ids) as $id) {
                if (!isset($labels[$kind][$id])) {
                    throw new InvalidArgumentException('Soin inconnu pour ce patient');
                }
                $items[] = ['kind' => $kind, 'id' => (string) $id, 'label' => $labels[$kind][$id]];
            }
        }

        return $items;
    }

    /**
     * Libellé d'un soin de passage : nom du soin, puis libellés des options choisies (ex. Injection (Intramusculaire)).
     *
     * @param list<array<string, mixed>> $rows
     * @return array<string, string>
     */
    private function nursingItemLabels(array $rows): array
    {
        $categoryIds = array_values(array_unique(array_filter(array_map(
            static fn (array $row): string => (string) ($row['category_id'] ?? ''),
            $rows,
        ))));
        $valueLabels = [];
        if ($categoryIds !== []) {
            $stmt = $this->db->prepare('
                SELECT care_category_id, option_key, options FROM care_category_options
                WHERE care_category_id IN (' . implode(',', array_fill(0, count($categoryIds), '?')) . ')
            ');
            $stmt->execute($categoryIds);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $opt) {
                $decoded = json_decode((string) ($opt['options'] ?? ''), true);
                foreach (is_array($decoded) ? $decoded : [] as $o) {
                    if (is_array($o) && isset($o['value'], $o['label'])) {
                        $valueLabels[(string) $opt['care_category_id']][(string) $opt['option_key']][(string) $o['value']] = (string) $o['label'];
                    }
                }
            }
        }

        $labels = [];
        foreach ($rows as $row) {
            $categoryId = (string) ($row['category_id'] ?? '');
            $base = trim((string) ($row['category_name'] ?? '')) ?: trim((string) ($row['label'] ?? '')) ?: 'Soin';
            $options = json_decode((string) ($row['care_options'] ?? ''), true);
            $values = [];
            foreach (is_array($options) ? $options : [] as $key => $value) {
                foreach (is_array($value) ? $value : [$value] as $single) {
                    if (!is_scalar($single) || (string) $single === '') {
                        continue;
                    }
                    $values[] = $valueLabels[$categoryId][(string) $key][(string) $single] ?? (string) $single;
                }
            }
            $values = array_values(array_unique($values));
            $labels[(string) $row['id']] = $values === [] ? $base : $base . ' (' . implode(', ', $values) . ')';
        }

        return $labels;
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchOne(array $viewer, string $patientId, string $id): array
    {
        $stmt = $this->db->prepare('
            SELECT t.*, ' . self::INSTANT_COLUMNS . ', (t.author_id = ? AND t.created_at >= NOW() - INTERVAL 24 HOUR) AS can_edit
            FROM patient_transmissions t
            WHERE t.id = ? AND t.patient_id = ?
            LIMIT 1
        ');
        $stmt->execute([(string) ($viewer['user_id'] ?? ''), $id, $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            throw new RuntimeException('Transmission introuvable après enregistrement');
        }

        return $this->mapRows($viewer, [$row])[0];
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<array<string, mixed>>
     */
    private function mapRows(array $viewer, array $rows): array
    {
        if ($rows === []) {
            return [];
        }
        $names = $this->users->getDisplayNamesByIds(array_map(
            static fn (array $row): string => (string) ($row['author_id'] ?? ''),
            $rows,
        ));

        $items = [];
        $audit = [];
        foreach ($rows as $row) {
            $id = (string) $row['id'];
            $authorId = $row['author_id'] !== null ? (string) $row['author_id'] : null;
            $items[] = [
                'id' => $id,
                'patient_id' => (string) $row['patient_id'],
                'occurred_on' => (string) $row['occurred_on'],
                'body' => $this->crypto->decryptField((string) $row['body_encrypted'], (string) $row['body_dek']),
                'care_items' => $this->decodeCareItems($row['care_item_ids'] ?? null),
                'appointment_id' => $row['appointment_id'] !== null ? (string) $row['appointment_id'] : null,
                'for_doctor' => (int) $row['for_doctor'] === 1,
                'author' => [
                    'id' => $authorId,
                    'name' => $authorId !== null ? ($names[$authorId] ?? null) : null,
                    'role' => (string) $row['author_role'],
                ],
                'created_at' => AppTimezone::iso8601FromUnix($row['created_at_unix']),
                'edited_at' => $row['edited_at_unix'] !== null ? AppTimezone::iso8601FromUnix($row['edited_at_unix']) : null,
                'can_edit' => (int) ($row['can_edit'] ?? 0) === 1,
            ];
            $audit[$id] = ['body'];
        }
        (new Logger($this->db))->logDecryptBatch(
            (string) ($viewer['user_id'] ?? ''),
            (string) ($viewer['role'] ?? ''),
            'patient_transmission',
            $audit,
        );

        return $items;
    }

    /**
     * @return list<array{kind: string, id: string, label: string}>
     */
    private function decodeCareItems(mixed $raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        if (!is_array($decoded)) {
            return [];
        }
        $items = [];
        foreach ($decoded as $item) {
            if (is_array($item) && isset($item['kind'], $item['id'], $item['label'])) {
                $items[] = ['kind' => (string) $item['kind'], 'id' => (string) $item['id'], 'label' => (string) $item['label']];
            }
        }

        return $items;
    }

    /** @param array<string, mixed> $transmission */
    private function notifyTeam(string $patientId, string $authorId, array $transmission, bool $forDoctor): void
    {
        [$authorName, $patientName] = $this->notificationNames($authorId, $patientId);
        foreach (PatientCareTeam::members($this->db, $patientId) as $member) {
            if ($member['id'] === $authorId) {
                continue;
            }
            if ($forDoctor && $member['role'] === 'pro') {
                $this->sendDoctorNotification($member['id'], $authorName, $patientName, $transmission);
                continue;
            }
            $this->send(
                $member['id'],
                self::TYPE_TEAM,
                'Nouvelle transmission',
                sprintf('%s a ajouté une transmission pour %s.', $authorName, $patientName),
                $transmission,
            );
        }
    }

    /** @param array<string, mixed> $transmission */
    private function notifyDoctors(string $patientId, string $authorId, array $transmission): void
    {
        [$authorName, $patientName] = $this->notificationNames($authorId, $patientId);
        foreach (PatientCareTeam::members($this->db, $patientId) as $member) {
            if ($member['role'] === 'pro' && $member['id'] !== $authorId) {
                $this->sendDoctorNotification($member['id'], $authorName, $patientName, $transmission);
            }
        }
    }

    /** @param array<string, mixed> $transmission */
    private function sendDoctorNotification(string $recipientId, string $authorName, string $patientName, array $transmission): void
    {
        $this->send(
            $recipientId,
            self::TYPE_FOR_DOCTOR,
            'Transmission pour le médecin',
            sprintf('%s vous adresse une transmission concernant %s.', $authorName, $patientName),
            $transmission,
        );
    }

    /** @return array{0: string, 1: string} */
    private function notificationNames(string $authorId, string $patientId): array
    {
        $names = $this->users->getDisplayNamesByIds([$authorId, $patientId]);

        return [$names[$authorId] ?? 'Un soignant', $names[$patientId] ?? 'votre patient'];
    }

    /** @param array<string, mixed> $transmission */
    private function send(string $recipientId, string $type, string $title, string $message, array $transmission): void
    {
        $transmissionId = (string) $transmission['id'];
        try {
            ($this->notify)($recipientId, $type, $title, $message, [
                'patient_id' => (string) $transmission['patient_id'],
                'transmission_id' => $transmissionId,
                'occurred_on' => (string) $transmission['occurred_on'],
            ]);
        } catch (Throwable $e) {
            error_log("PatientTransmissionService $type transmission $transmissionId → $recipientId : " . $e->getMessage());
        }
    }
}
