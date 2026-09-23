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
}
