<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/Validation.php';
require_once __DIR__ . '/../lib/DbSchemaCache.php';

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
        foreach ($rows as &$row) {
            $row['lab_ids'] = $labIdsByBrand[(string) $row['id']] ?? [];
        }
        unset($row);
        return $rows;
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
        $payload = $this->normalizeInput($input);
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
        if ($this->getById($id) === null) {
            return null;
        }
        $payload = $this->normalizeInput($input, false);
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
    private function normalizeInput(array $input, bool $requireName = true): array
    {
        $name = trim((string) ($input['name'] ?? ''));
        if ($requireName && $name === '') {
            throw new InvalidArgumentException('Le nom de la marque est requis.');
        }
        $slug = trim((string) ($input['slug'] ?? ''));
        if ($slug === '') {
            $slug = self::slugify($name);
        }
        if ($slug === '') {
            throw new InvalidArgumentException('Le slug est requis.');
        }
        $logoUrl = trim((string) ($input['logo_url'] ?? ''));
        $websiteUrl = trim((string) ($input['website_url'] ?? ''));
        return [
            'name' => $name,
            'slug' => $slug,
            'logo_url' => $logoUrl !== '' ? $logoUrl : null,
            'website_url' => $websiteUrl !== '' ? $websiteUrl : null,
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'is_active' => !empty($input['is_active']) ? 1 : 0,
        ];
    }

    public static function slugify(string $name): string
    {
        $s = strtolower(trim($name));
        $s = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s) ?: $s;
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        return trim($s, '-');
    }
}
