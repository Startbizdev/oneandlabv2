<?php

declare(strict_types=1);

/**
 * Configuration module commandes pharmacie (platform_settings).
 */
final class PharmacyModuleConfig
{
    public const SETTING_KEY = 'pharmacy_module_config';

    /** @var array<string, mixed> */
    private static array $defaults = [
        'module_enabled' => true,
        'ordering_enabled_for_nurse' => true,
        'ordering_enabled_emplois' => ['Médecin généraliste', 'Médecin spécialiste', 'Sage-femme'],
        'ordering_allow_custom_emploi' => false,
        'pharmacy_receiver_emplois' => ['Pharmacien'],
    ];

    public function __construct(private PDO $db)
    {
    }

    /** @return array<string, mixed> */
    public function getConfig(): array
    {
        $stmt = $this->db->prepare(
            'SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1'
        );
        $stmt->execute([self::SETTING_KEY]);
        $raw = $stmt->fetchColumn();
        if ($raw === false || $raw === '') {
            return self::$defaults;
        }
        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return self::$defaults;
        }

        return array_merge(self::$defaults, $decoded);
    }

    /** @param array<string, mixed> $patch */
    public function saveConfig(array $patch): array
    {
        $current = $this->getConfig();
        $merged = array_merge($current, $patch);
        $json = json_encode($merged, JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new InvalidArgumentException('Configuration invalide');
        }
        $this->db->prepare('
            INSERT INTO platform_settings (setting_key, setting_value) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ')->execute([self::SETTING_KEY, $json]);

        return $merged;
    }

    /** @param array<string, mixed> $config */
    public static function canOrder(array $user, array $config): bool
    {
        if (empty($config['module_enabled'])) {
            return false;
        }
        $role = (string) ($user['role'] ?? '');
        return in_array(
            $role,
            ['super_admin', 'admin', 'nurse', 'pro', 'preleveur', 'lab', 'subaccount', 'patient'],
            true
        );
    }

    /** Compte pharmacie (emploi receveur), même s’il est en pause. */
    public static function isPharmacyAccount(array $user, array $config): bool
    {
        if ((string) ($user['role'] ?? '') !== 'pro') {
            return false;
        }
        $emploi = trim((string) ($user['emploi'] ?? ''));
        if ($emploi === '') {
            return false;
        }
        $receivers = $config['pharmacy_receiver_emplois'] ?? ['Pharmacien'];
        if (!is_array($receivers)) {
            $receivers = ['Pharmacien'];
        }
        foreach ($receivers as $receiver) {
            if (strcasecmp(trim((string) $receiver), $emploi) === 0) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed> $config */
    public static function canReceive(array $user, array $config): bool
    {
        if (empty($config['module_enabled'])) {
            return false;
        }
        if (!self::isPharmacyAccount($user, $config)) {
            return false;
        }
        if (empty($user['pharmacy_orders_enabled'])) {
            return false;
        }
        if (!empty($user['pharmacy_orders_paused'])) {
            return false;
        }

        return true;
    }

    /** @return array<string, bool> */
    public function uiFlagsForUser(array $user): array
    {
        $config = $this->getConfig();

        return [
            'module_enabled' => !empty($config['module_enabled']),
            'can_order' => self::canOrder($user, $config),
            'can_receive' => self::canReceive($user, $config),
            'is_pharmacy_account' => self::isPharmacyAccount($user, $config),
        ];
    }
}
