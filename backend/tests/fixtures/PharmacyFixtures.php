<?php

declare(strict_types=1);

require_once __DIR__ . '/TestFixtures.php';
require_once __DIR__ . '/../../lib/Crypto.php';

/** Comptes pharmacie (pro Pharmacien) et QR pour les tests d'intégration. */
final class PharmacyFixtures
{
    /** @param array<string, mixed>|null $address */
    public static function pharmacy(PDO $db, ?string $companyName = null, ?array $address = null, bool $paused = false): string
    {
        $id = TestFixtures::insertProfile($db, 'pro');
        $crypto = new Crypto();
        $company = $companyName !== null ? $crypto->encryptField($companyName) : null;
        $addr = $address !== null ? $crypto->encryptField((string) json_encode($address, JSON_UNESCAPED_UNICODE)) : null;
        $db->prepare("
            UPDATE profiles SET emploi = 'Pharmacien', pharmacy_orders_enabled = 1, pharmacy_orders_paused = ?,
                pharmacy_accepts_click_collect = 1, pharmacy_accepts_home_delivery = 0,
                pharmacy_click_collect_days_json = '[1,2,3,4,5,6,7]',
                company_name_encrypted = ?, company_name_dek = ?, address_encrypted = ?, address_dek = ?
            WHERE id = ?
        ")->execute([
            $paused ? 1 : 0,
            $company['encrypted'] ?? null,
            $company['dek'] ?? null,
            $addr['encrypted'] ?? null,
            $addr['dek'] ?? null,
            $id,
        ]);

        return $id;
    }

    /** @return array{0: string, 1: string} id, token */
    public static function qrCode(PDO $db, string $ownerId, string $redirectUrl): array
    {
        $qrId = strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
        $token = substr(bin2hex(random_bytes(6)), 0, 12);
        $db->prepare(
            'INSERT INTO qr_codes (id, profile_id, user_role, token, redirect_url, is_active) VALUES (?, ?, ?, ?, ?, 1)'
        )->execute([$qrId, $ownerId, 'pro', $token, $redirectUrl]);

        return [$qrId, $token];
    }

    public static function deleteProfile(PDO $db, string $id): void
    {
        $db->prepare('DELETE FROM pharmacy_orders WHERE pharmacy_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM qr_codes WHERE profile_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM patient_professional_access WHERE professional_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
    }
}
