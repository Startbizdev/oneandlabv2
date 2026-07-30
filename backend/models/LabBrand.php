<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/Validation.php';

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
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getById(string $id): ?array
    {
        if (!Validation::uuid($id)) {
            return null;
        }
        $stmt = $this->db->prepare('SELECT * FROM lab_brands WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
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
        return $this->getById($id) ?? [];
    }

    /** @param array<string, mixed> $input */
    public function update(string $id, array $input): ?array
    {
        if ($this->getById($id) === null) {
            return null;
        }
        $payload = $this->normalizeInput($input, false);
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
