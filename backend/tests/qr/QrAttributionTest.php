<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentPostCreateEffects.php';

/**
 * Attribution QR d'un RDV : jamais l'identifiant envoyé par le client, uniquement le jeton utm_qr
 * d'un QR actif dont le propriétaire n'est pas banni, et seulement pour un RDV pris par le patient.
 * Une attribution ouvre l'accès au dossier (lien qr_origin) : elle doit être infalsifiable.
 */
final class QrAttributionTest extends TestCase
{
    use SkipsWithoutPdo;

    private PDO $db;
    /** @var list<string> */
    private array $profileIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
    }

    protected function tearDown(): void
    {
        foreach (array_reverse($this->profileIds) as $id) {
            $this->db->prepare('DELETE FROM qr_codes WHERE profile_id = ?')->execute([$id]);
            $this->db->prepare('DELETE FROM profiles WHERE id = ?')->execute([$id]);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testActiveQrTokenResolvesForPatient(): void
    {
        [$qrId, $token] = $this->qrCode(true, null);

        $input = ['utm_qr' => $token];
        (new AppointmentPostCreateEffects($this->db))->resolveAttributionQrFromUtm($input, 'patient');

        $this->assertSame($qrId, $input['attribution_qr_id'] ?? null);
    }

    public function testClientAttributionQrIdIsNeverTrusted(): void
    {
        [$qrId] = $this->qrCode(true, null);

        $input = ['attribution_qr_id' => $qrId];
        (new AppointmentPostCreateEffects($this->db))->resolveAttributionQrFromUtm($input, 'patient');

        $this->assertArrayNotHasKey('attribution_qr_id', $input);
    }

    public function testNoAttributionWhenAStaffMemberBooks(): void
    {
        [, $token] = $this->qrCode(true, null);

        foreach (['pro', 'nurse', 'lab', 'super_admin'] as $role) {
            $input = ['utm_qr' => $token, 'attribution_qr_id' => 'forged'];
            (new AppointmentPostCreateEffects($this->db))->resolveAttributionQrFromUtm($input, $role);
            $this->assertArrayNotHasKey('attribution_qr_id', $input, $role);
        }
    }

    public function testInactiveQrOrBannedOwnerOrUnknownTokenIsNotAttributed(): void
    {
        [, $inactiveToken] = $this->qrCode(false, null);
        [, $bannedToken] = $this->qrCode(true, '+30 days');
        [$expiredBanQrId, $expiredBanToken] = $this->qrCode(true, '-1 day');

        $service = new QrCodeService();
        $this->assertNull($service->resolveAttributionQrId($inactiveToken));
        $this->assertNull($service->resolveAttributionQrId($bannedToken));
        $this->assertNull($service->resolveAttributionQrId('zzzzzzzzzzzz'));
        $this->assertNull($service->resolveAttributionQrId(''));
        $this->assertSame($expiredBanQrId, $service->resolveAttributionQrId($expiredBanToken));
    }

    /** @return array{0: string, 1: string} */
    private function qrCode(bool $active, ?string $bannedUntil): array
    {
        $ownerId = TestFixtures::insertProfile($this->db, 'pro');
        $this->profileIds[] = $ownerId;
        if ($bannedUntil !== null) {
            $this->db->prepare('UPDATE profiles SET banned_until = ? WHERE id = ?')
                ->execute([date('Y-m-d H:i:s', strtotime($bannedUntil)), $ownerId]);
        }
        $qrId = strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
        $token = substr(bin2hex(random_bytes(6)), 0, 12);
        $this->db->prepare(
            'INSERT INTO qr_codes (id, profile_id, user_role, token, redirect_url, is_active) VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$qrId, $ownerId, 'pro', $token, 'https://cary.test/rendez-vous/nouveau', $active ? 1 : 0]);

        return [$qrId, $token];
    }
}
