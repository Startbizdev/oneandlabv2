<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/Validation.php';
require_once __DIR__ . '/../lib/DbSchemaCache.php';
require_once __DIR__ . '/../lib/CoverageZoneMatcher.php';

class LabBrand
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        if ($db !== null) {
            $this->db = $db;
            return;
        }
        $config = require __DIR__ . '/../config/database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );
        $this->db = new PDO($dsn, $config['username'], $config['password'], $config['options'] ?? []);
    }

    /** @return list<array<string, mixed>> */
    public function listPublic(): array
    {
        $stmt = $this->db->query('
            SELECT id, name, slug, logo_url, website_url, sort_order
            FROM lab_brands
            WHERE is_active = 1
            ORDER BY sort_order ASC, name ASC
        ');
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /** @return list<array<string, mixed>> */
    public function listAll(): array
    {
        $stmt = $this->db->query('
            SELECT id, name, slug, logo_url, website_url, sort_order, is_active, created_at, updated_at
            FROM lab_brands
            ORDER BY sort_order ASC, name ASC
        ');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $labIdsByBrand = $this->labIdsByBrand();
        $appointmentCounts = $this->appointmentCountsByBrand();
        foreach ($rows as &$row) {
            $row['lab_ids'] = $labIdsByBrand[(string) $row['id']] ?? [];
            $row['appointment_count'] = $appointmentCounts[(string) $row['id']] ?? 0;
        }
        unset($row);
        return $rows;
    }

    /**
     * Comptes labo et leur capacité à recevoir un RDV réseau : zone prise de sang utilisable et RDV acceptés.
     *
     * @return list<array{id: string, has_active_zone: bool, is_accepting_appointments: bool}>
     */
    public function listLabReachability(): array
    {
        $stmt = $this->db->query("
            SELECT p.id, p.is_accepting_appointments,
                EXISTS (
                    SELECT 1 FROM coverage_zones cz
                    WHERE cz.owner_id = p.id AND " . CoverageZoneMatcher::usableLabZoneSql('cz', 'p') . "
                ) AS has_active_zone
            FROM profiles p
            WHERE p.role = 'lab'
        ");
        return array_map(static fn (array $row): array => [
            'id' => (string) $row['id'],
            'has_active_zone' => (bool) $row['has_active_zone'],
            'is_accepting_appointments' => !empty($row['is_accepting_appointments']),
        ], $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
    }

    /**
     * Ordre d'affichage : la liste doit contenir exactement toutes les marques.
     *
     * @param mixed $brandIds
     */
    public function reorder(mixed $brandIds): void
    {
        if (!is_array($brandIds) || $brandIds === []) {
            throw new InvalidArgumentException('Liste des marques requise.');
        }
        $ids = array_values(array_map(static fn ($id): string => trim((string) $id), $brandIds));
        $existing = array_map('strval', $this->db->query('SELECT id FROM lab_brands')->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $sortedIds = $ids;
        sort($sortedIds);
        sort($existing);
        if ($sortedIds !== $existing) {
            throw new InvalidArgumentException('La liste doit contenir chaque marque une seule fois. Rechargez la page.');
        }
        $this->inTransaction(function () use ($ids): void {
            $stmt = $this->db->prepare('UPDATE lab_brands SET sort_order = ?, updated_at = NOW() WHERE id = ?');
            foreach ($ids as $index => $id) {
                $stmt->execute([$index + 1, $id]);
            }
        });
    }

    /** @return array<string, int> */
    private function appointmentCountsByBrand(): array
    {
        if (!DbSchemaCache::tableHasColumn($this->db, 'appointments', 'preferred_lab_brand_id')) {
            return [];
        }
        $stmt = $this->db->query('
            SELECT preferred_lab_brand_id, COUNT(*) AS n FROM appointments
            WHERE preferred_lab_brand_id IS NOT NULL
            GROUP BY preferred_lab_brand_id
        ');
        $counts = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $counts[(string) $row['preferred_lab_brand_id']] = (int) $row['n'];
        }
        return $counts;
    }

    public function getById(string $id): ?array
    {
        if (!Validation::uuid($id)) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT * FROM lab_brands WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $row['lab_ids'] = $this->listLabIds($id);
        return $row;
    }

    /** @return list<string> */
    public function listLabIds(string $brandId): array
    {
        if (!$this->hasLabLinksTable()) {
            return [];
        }
        $stmt = $this->db->prepare('SELECT lab_profile_id FROM lab_brand_labs WHERE brand_id = ? ORDER BY created_at ASC, lab_profile_id ASC');
        $stmt->execute([$brandId]);
        return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    /** @return array<string, list<string>> */
    private function labIdsByBrand(): array
    {
        if (!$this->hasLabLinksTable()) {
            return [];
        }
        $map = [];
        $stmt = $this->db->query('SELECT brand_id, lab_profile_id FROM lab_brand_labs ORDER BY created_at ASC, lab_profile_id ASC');
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $link) {
            $map[(string) $link['brand_id']][] = (string) $link['lab_profile_id'];
        }
        return $map;
    }

    /**
     * Remplace les comptes labo qui reçoivent les RDV de la marque (profils role = lab uniquement).
     *
     * @param mixed $labIds
     */
    private function replaceLabIds(string $brandId, mixed $labIds): void
    {
        if (!is_array($labIds)) {
            throw new InvalidArgumentException('lab_ids doit être une liste.');
        }
        $ids = [];
        foreach ($labIds as $labId) {
            $labId = trim((string) $labId);
            if (!Validation::uuid($labId)) {
                throw new InvalidArgumentException('Identifiant de laboratoire invalide.');
            }
            $ids[$labId] = true;
        }
        $ids = array_keys($ids);
        if (!$this->hasLabLinksTable()) {
            throw new RuntimeException('Table lab_brand_labs absente (migration 116 non appliquée).');
        }
        if ($ids !== []) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $check = $this->db->prepare("SELECT COUNT(*) FROM profiles WHERE role = 'lab' AND id IN ($placeholders)");
            $check->execute($ids);
            if ((int) $check->fetchColumn() !== count($ids)) {
                throw new InvalidArgumentException('Chaque compte assigné doit être un laboratoire existant.');
            }
        }
        $del = $this->db->prepare('DELETE FROM lab_brand_labs WHERE brand_id = ?');
        $del->execute([$brandId]);
        if ($ids !== []) {
            $ins = $this->db->prepare('INSERT INTO lab_brand_labs (brand_id, lab_profile_id) VALUES (?, ?)');
            foreach ($ids as $labId) {
                $ins->execute([$brandId, $labId]);
            }
        }
    }

    private function hasLabLinksTable(): bool
    {
        return DbSchemaCache::tableExists($this->db, 'lab_brand_labs');
    }

    /**
     * @template T
     * @param callable(): T $fn
     * @return T
     */
    private function inTransaction(callable $fn): mixed
    {
        if ($this->db->inTransaction()) {
            return $fn();
        }
        $this->db->beginTransaction();
        try {
            $result = $fn();
            $this->db->commit();
            return $result;
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function getActiveById(string $id): ?array
    {
        $row = $this->getById($id);
        if ($row === null || empty($row['is_active'])) {
            return null;
        }
        return $row;
    }

    /** @param array<string, mixed> $input */
    public function create(array $input): array
    {
        $payload = $this->normalizeInput($input, null);
        $bytes = random_bytes(16);
        $bytes[6] = chr(ord($bytes[6]) & 0x0f | 0x40);
        $bytes[8] = chr(ord($bytes[8]) & 0x3f | 0x80);
        $id = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
        $this->inTransaction(function () use ($id, $payload, $input): void {
            $stmt = $this->db->prepare('
                INSERT INTO lab_brands (id, name, slug, logo_url, website_url, sort_order, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ');
            $stmt->execute([
                $id,
                $payload['name'],
                $payload['slug'],
                $payload['logo_url'],
                $payload['website_url'],
                $payload['sort_order'],
                $payload['is_active'],
            ]);
            if (array_key_exists('lab_ids', $input)) {
                $this->replaceLabIds($id, $input['lab_ids']);
            }
        });
        return $this->getById($id) ?? [];
    }

    /** @param array<string, mixed> $input */
    public function update(string $id, array $input): ?array
    {
        $existing = $this->getById($id);
        if ($existing === null) {
            return null;
        }
        $fields = ['name', 'slug', 'logo_url', 'website_url', 'sort_order', 'is_active'];
        $payload = $this->normalizeInput(array_merge(array_intersect_key($existing, array_flip($fields)), $input), $id);
        $this->inTransaction(function () use ($id, $payload, $input): void {
            $stmt = $this->db->prepare('
                UPDATE lab_brands
                SET name = ?, slug = ?, logo_url = ?, website_url = ?, sort_order = ?, is_active = ?, updated_at = NOW()
                WHERE id = ?
            ');
            $stmt->execute([
                $payload['name'],
                $payload['slug'],
                $payload['logo_url'],
                $payload['website_url'],
                $payload['sort_order'],
                $payload['is_active'],
                $id,
            ]);
            if (array_key_exists('lab_ids', $input)) {
                $this->replaceLabIds($id, $input['lab_ids']);
            }
        });
        return $this->getById($id);
    }

    public function delete(string $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM lab_brands WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->rowCount() > 0;
    }

    /** @param array<string, mixed> $input */
    private function normalizeInput(array $input, ?string $currentId): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Le nom de la marque est requis.');
        }
        $slug = self::slugify(trim((string) ($input['slug'] ?? '')) ?: $name);
        if ($slug === '') {
            throw new InvalidArgumentException('Le nom doit contenir au moins une lettre ou un chiffre.');
        }
        $duplicate = $this->db->prepare('SELECT name FROM lab_brands WHERE slug = ? AND id <> ? LIMIT 1');
        $duplicate->execute([$slug, $currentId ?? '']);
        $duplicateName = $duplicate->fetchColumn();
        if ($duplicateName !== false) {
            throw new InvalidArgumentException("La marque « {$duplicateName} » porte déjà ce nom.");
        }
        return [
            'name' => $name,
            'slug' => $slug,
            'logo_url' => self::optionalHttpUrl($input['logo_url'] ?? null, 'L’adresse du logo'),
            'website_url' => self::optionalHttpUrl($input['website_url'] ?? null, 'L’adresse du site web'),
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'is_active' => !empty($input['is_active']) ? 1 : 0,
        ];
    }

    private static function optionalHttpUrl(mixed $value, string $label): ?string
    {
        $url = trim((string) ($value ?? ''));
        if ($url === '') {
            return null;
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        if (filter_var($url, FILTER_VALIDATE_URL) === false || !in_array($scheme, ['http', 'https'], true)) {
            throw new InvalidArgumentException("{$label} doit commencer par https:// (ou http://).");
        }
        return $url;
    }

    public static function slugify(string $name): string
    {
        $s = strtolower(trim($name));
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        return trim($s, '-');
    }
}
