<?php

declare(strict_types=1);

require_once __DIR__ . '/../Crypto.php';
require_once __DIR__ . '/../DbSchemaCache.php';

/** Lookups en masse pour listes RDV / enrichissement (évite N+1 getById). */
final class UserBatchLookup
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
    ) {
    }

    private function hasCompanyNameColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'company_name_encrypted');
    }

    private function hasEmploiColumn(): bool
    {
        return DbSchemaCache::tableHasColumn($this->db, 'profiles', 'emploi');
    }

    /**
     * @return array<string, string|null> id => display_name
     */
    public function displayNamesByIds(array $ids): array
    {
        $ids = array_unique(array_filter($ids));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = 'SELECT id, role, first_name_encrypted, first_name_dek, last_name_encrypted, last_name_dek';
        if ($this->hasCompanyNameColumn()) {
            $sql .= ', company_name_encrypted, company_name_dek';
        }
        $sql .= ' FROM profiles WHERE id IN (' . $placeholders . ')';
        $stmt = $this->db->prepare($sql);
        $stmt->execute(array_values($ids));
        $rows = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $row) {
            $name = null;
            if (in_array($row['role'] ?? '', ['lab', 'subaccount'], true) && $this->hasCompanyNameColumn()
                && !empty($row['company_name_encrypted'] ?? '') && !empty($row['company_name_dek'] ?? '')) {
                try {
                    $name = trim($this->crypto->decryptField($row['company_name_encrypted'], $row['company_name_dek']));
                } catch (Exception $e) {
                    $name = '';
                }
            }
            if (!$name || $name === '') {
                try {
                    $first = !empty($row['first_name_encrypted']) && !empty($row['first_name_dek'])
                        ? trim($this->crypto->decryptField($row['first_name_encrypted'], $row['first_name_dek'])) : '';
                    $last = !empty($row['last_name_encrypted']) && !empty($row['last_name_dek'])
                        ? trim($this->crypto->decryptField($row['last_name_encrypted'], $row['last_name_dek'])) : '';
                    $name = trim($first . ' ' . $last) ?: null;
                } catch (Exception $e) {
                    $name = null;
                }
            }
            $result[$row['id']] = $name;
        }
        return $result;
    }

    /**
     * @return array<string, string|null> id => profile_image_url
     */
    public function profileImageUrlsByIds(array $ids): array
    {
        $ids = array_unique(array_filter($ids));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            'SELECT id, profile_image_url FROM profiles WHERE id IN (' . $placeholders . ')'
        );
        $stmt->execute(array_values($ids));
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $url = isset($row['profile_image_url']) ? trim((string) $row['profile_image_url']) : '';
            $result[(string) $row['id']] = $url !== '' ? $url : null;
        }
        return $result;
    }

    /**
     * @return array<string, string|null> id => male|female|other|null
     */
    public function gendersByIds(array $ids): array
    {
        $ids = array_unique(array_filter($ids));
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            'SELECT id, gender_encrypted, gender_dek FROM profiles WHERE id IN (' . $placeholders . ')'
        );
        $stmt->execute(array_values($ids));
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $id = (string) $row['id'];
            if (!empty($row['gender_encrypted']) && !empty($row['gender_dek'])) {
                try {
                    $g = strtolower(trim($this->crypto->decryptField(
                        $row['gender_encrypted'],
                        $row['gender_dek']
                    )));
                    $result[$id] = in_array($g, ['male', 'female', 'other'], true) ? $g : null;
                } catch (Exception $e) {
                    $result[$id] = null;
                }
            } else {
                $result[$id] = null;
            }
        }
        return $result;
    }

    /**
     * @param list<string> $ids
     * @return array<string, array{phone: ?string, email: ?string, emploi: ?string, public_slug: ?string, role: ?string}>
     */
    public function contactCardsByIds(array $ids): array
    {
        $ids = array_values(array_unique(array_filter($ids)));
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = 'SELECT id, role, email_encrypted, email_dek, phone_encrypted, phone_dek, public_slug';
        if ($this->hasEmploiColumn()) {
            $sql .= ', emploi';
        }
        $sql .= ' FROM profiles WHERE id IN (' . $placeholders . ')';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($ids);
        $result = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $email = null;
            if (!empty($row['email_encrypted']) && !empty($row['email_dek'])) {
                try {
                    $email = trim((string) $this->crypto->decryptField($row['email_encrypted'], $row['email_dek']));
                } catch (Exception) {
                    $email = null;
                }
            }
            if ($email !== null && str_ends_with(strtolower($email), '@patients.internal.local')) {
                $email = null;
            }
            $phone = null;
            if (!empty($row['phone_encrypted']) && !empty($row['phone_dek'])) {
                try {
                    $phone = trim((string) $this->crypto->decryptField($row['phone_encrypted'], $row['phone_dek']));
                } catch (Exception) {
                    $phone = null;
                }
            }
            $result[(string) $row['id']] = [
                'phone' => $phone !== '' ? $phone : null,
                'email' => $email !== '' ? $email : null,
                'emploi' => isset($row['emploi']) && trim((string) $row['emploi']) !== ''
                    ? trim((string) $row['emploi'])
                    : null,
                'public_slug' => isset($row['public_slug']) && trim((string) $row['public_slug']) !== ''
                    ? trim((string) $row['public_slug'])
                    : null,
                'role' => isset($row['role']) ? (string) $row['role'] : null,
            ];
        }

        return $result;
    }
}
