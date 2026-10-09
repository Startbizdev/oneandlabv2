<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/Crypto.php';
require_once __DIR__ . '/PharmacyModuleConfig.php';

/**
 * Catalogue pharmacies (pro Pharmacien).
 */
final class PharmacyCatalogService
{
    public function __construct(
        private PDO $db,
        private Crypto $crypto,
        private PharmacyModuleConfig $moduleConfig,
    ) {
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listPharmacies(
        ?string $postalCode = null,
        ?string $fulfillmentMode = null,
        ?string $favoriteUserId = null,
    ): array {
        $config = $this->moduleConfig->getConfig();
        $receiverEmplois = $config['pharmacy_receiver_emplois'] ?? ['Pharmacien'];
        if (!is_array($receiverEmplois) || $receiverEmplois === []) {
            $receiverEmplois = ['Pharmacien'];
        }
        $placeholders = implode(',', array_fill(0, count($receiverEmplois), '?'));
        $params = $receiverEmplois;

        $sql = "
            SELECT p.id, p.emploi, p.company_name_encrypted, p.company_name_dek,
                   p.first_name_encrypted, p.first_name_dek,
                   p.last_name_encrypted, p.last_name_dek,
                   p.address_encrypted, p.address_dek,
                   p.pharmacy_accepts_click_collect, p.pharmacy_accepts_home_delivery,
                   p.pharmacy_orders_paused, p.pharmacy_orders_enabled,
                   p.pharmacy_click_collect_days_json, p.pharmacy_home_delivery_days_json
            FROM profiles p
            WHERE p.role = 'pro'
              AND p.pharmacy_orders_enabled = 1
              AND p.pharmacy_orders_paused = 0
              AND p.emploi IN ($placeholders)
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $favoriteIds = [];
        if ($favoriteUserId !== null && $favoriteUserId !== '') {
            $favoriteIds = $this->favoritePharmacyIds($favoriteUserId);
        }

        $items = [];
        foreach ($rows as $row) {
            $item = $this->mapPharmacyRow($row);
            if ($fulfillmentMode === 'click_collect' && empty($item['accepts_click_collect'])) {
                continue;
            }
            if ($fulfillmentMode === 'home_delivery' && empty($item['accepts_home_delivery'])) {
                continue;
            }
            if ($postalCode !== null && $postalCode !== '') {
                $pc = (string) ($item['postal_code'] ?? '');
                if ($pc !== '' && !str_starts_with($pc, substr($postalCode, 0, 2))) {
                    continue;
                }
            }
            $item['is_favorite'] = in_array($item['id'], $favoriteIds, true);
            $items[] = $item;
        }

        usort($items, static function (array $a, array $b): int {
            $fa = !empty($a['is_favorite']) ? 0 : 1;
            $fb = !empty($b['is_favorite']) ? 0 : 1;
            if ($fa !== $fb) {
                return $fa <=> $fb;
            }

            return strcmp((string) ($a['display_name'] ?? ''), (string) ($b['display_name'] ?? ''));
        });

        return $items;
    }

    /**
     * Fiche visible au moment de commander ou sur une commande déjà passée.
     * Le catalogue ouvert suffit pour qui peut commander ; sinon il faut un lien (soi-même, commande, admin).
     */
    public static function mayViewPublicProfile(
        bool $catalogVisible,
        bool $isSelf,
        bool $hasOrder,
        bool $isSuperAdmin,
        bool $canOrder,
    ): bool {
        if ($isSelf || $hasOrder || $isSuperAdmin) {
            return true;
        }

        return $canOrder && $catalogVisible;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function publicProfile(string $pharmacyId): ?array
    {
        $pharmacyId = trim($pharmacyId);
        if ($pharmacyId === '') {
            return null;
        }

        $config = $this->moduleConfig->getConfig();
        $receiverEmplois = $config['pharmacy_receiver_emplois'] ?? ['Pharmacien'];
        if (!is_array($receiverEmplois) || $receiverEmplois === []) {
            $receiverEmplois = ['Pharmacien'];
        }
        $placeholders = implode(',', array_fill(0, count($receiverEmplois), '?'));
        $params = array_merge([$pharmacyId], $receiverEmplois);

        $sql = "
            SELECT p.id, p.emploi, p.role, p.profile_image_url, p.cover_image_url, p.biography,
                   p.website_url, p.opening_hours, p.social_links,
                   p.company_name_encrypted, p.company_name_dek,
                   p.first_name_encrypted, p.first_name_dek,
                   p.last_name_encrypted, p.last_name_dek,
                   p.phone_encrypted, p.phone_dek,
                   p.address_encrypted, p.address_dek,
                   p.pharmacy_accepts_click_collect, p.pharmacy_accepts_home_delivery,
                   p.pharmacy_orders_paused, p.pharmacy_orders_enabled,
                   p.pharmacy_click_collect_days_json, p.pharmacy_home_delivery_days_json
            FROM profiles p
            WHERE p.id = ?
              AND p.role = 'pro'
              AND p.emploi IN ($placeholders)
            LIMIT 1
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            return null;
        }

        $item = $this->mapPharmacyRow($row);
        $address = $item['address'];
        $formatted = '';
        if (is_array($address)) {
            $formatted = trim((string) ($address['formatted_address'] ?? $address['label'] ?? ''));
        }

        return [
            'id' => $item['id'],
            'display_name' => $item['display_name'],
            'emploi' => $item['emploi'],
            'phone' => $this->decryptOptional($row, 'phone'),
            'profile_image_url' => $this->nullableString($row['profile_image_url'] ?? null),
            'cover_image_url' => $this->nullableString($row['cover_image_url'] ?? null),
            'biography' => $this->nullableString($row['biography'] ?? null),
            'website_url' => $this->nullableString($row['website_url'] ?? null),
            'opening_hours' => $this->decodeJsonObject($row['opening_hours'] ?? null),
            'social_links' => $this->decodeJsonObject($row['social_links'] ?? null),
            'address' => $address,
            'address_label' => $formatted !== '' ? $formatted : null,
            'postal_code' => $item['postal_code'],
            'accepts_click_collect' => $item['accepts_click_collect'],
            'accepts_home_delivery' => $item['accepts_home_delivery'],
            'click_collect_days' => $item['click_collect_days'],
            'home_delivery_days' => $item['home_delivery_days'],
            'catalog_visible' => !empty($row['pharmacy_orders_enabled']) && empty($row['pharmacy_orders_paused']),
        ];
    }

    public function viewerHasPharmacyOrder(string $viewerId, string $pharmacyId): bool
    {
        if ($viewerId === '' || $pharmacyId === '') {
            return false;
        }
        $stmt = $this->db->prepare('
            SELECT 1 FROM pharmacy_orders
            WHERE pharmacy_id = ? AND (requester_id = ? OR patient_id = ?)
            LIMIT 1
        ');
        $stmt->execute([$pharmacyId, $viewerId, $viewerId]);

        return $stmt->fetchColumn() !== false;
    }

    /** @return list<string> */
    private function favoritePharmacyIds(string $userId): array
    {
        try {
            $stmt = $this->db->prepare('SELECT pharmacy_id FROM pharmacy_favorites WHERE user_id = ?');
            $stmt->execute([$userId]);

            return array_map('strval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []);
        } catch (PDOException) {
            return [];
        }
    }

    /** @param array<string, mixed> $row */
    private function mapPharmacyRow(array $row): array
    {
        $displayName = $this->decryptName($row);
        $address = $this->decryptAddress($row);

        return [
            'id' => (string) $row['id'],
            'display_name' => $displayName,
            'emploi' => (string) ($row['emploi'] ?? ''),
            'accepts_click_collect' => !empty($row['pharmacy_accepts_click_collect']),
            'accepts_home_delivery' => !empty($row['pharmacy_accepts_home_delivery']),
            'click_collect_days' => $this->decodeDays($row['pharmacy_click_collect_days_json'] ?? null),
            'home_delivery_days' => $this->decodeDays($row['pharmacy_home_delivery_days_json'] ?? null),
            'address' => $address,
            'postal_code' => is_array($address) ? (string) ($address['postal_code'] ?? '') : '',
        ];
    }

    /** @return list<int> */
    private function decodeDays(mixed $raw): array
    {
        $days = is_string($raw) ? json_decode($raw, true) : $raw;
        if (!is_array($days) || $days === []) {
            return [1, 2, 3, 4, 5, 6];
        }

        return array_values(array_filter(
            array_map('intval', $days),
            static fn (int $day): bool => $day >= 1 && $day <= 7
        ));
    }

    /** @param array<string, mixed> $row */
    private function decryptName(array $row): string
    {
        if (!empty($row['company_name_encrypted'])) {
            $name = $this->crypto->decryptField(
                (string) $row['company_name_encrypted'],
                (string) $row['company_name_dek']
            );

            return trim($name) !== '' ? trim($name) : 'Pharmacie';
        }
        $first = !empty($row['first_name_encrypted'])
            ? trim($this->crypto->decryptField((string) $row['first_name_encrypted'], (string) $row['first_name_dek']))
            : '';
        $last = !empty($row['last_name_encrypted'])
            ? trim($this->crypto->decryptField((string) $row['last_name_encrypted'], (string) $row['last_name_dek']))
            : '';
        $full = trim("$first $last");

        return $full !== '' ? $full : 'Pharmacie';
    }

    /** @param array<string, mixed> $row */
    private function decryptAddress(array $row): ?array
    {
        if (empty($row['address_encrypted'])) {
            return null;
        }
        $json = $this->crypto->decryptField(
            (string) $row['address_encrypted'],
            (string) $row['address_dek']
        );
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }

    /** @param array<string, mixed> $row */
    private function decryptOptional(array $row, string $field): ?string
    {
        $encrypted = $row[$field . '_encrypted'] ?? null;
        $dek = $row[$field . '_dek'] ?? null;
        if (!is_string($encrypted) || $encrypted === '' || !is_string($dek) || $dek === '') {
            return null;
        }
        try {
            $value = trim($this->crypto->decryptField($encrypted, $dek));
        } catch (Throwable) {
            return null;
        }

        return $value !== '' ? $value : null;
    }

    private function nullableString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    /** @return array<string, mixed>|null */
    private function decodeJsonObject(mixed $raw): ?array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (!is_string($raw) || trim($raw) === '') {
            return null;
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }
}
