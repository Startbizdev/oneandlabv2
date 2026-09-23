<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/PharmacyModuleConfig.php';

final class PharmacyModuleConfigTest extends TestCase
{
    /** @return array<string, mixed> */
    private function baseConfig(): array
    {
        return [
            'module_enabled' => true,
            'ordering_enabled_for_nurse' => true,
            'ordering_enabled_emplois' => ['Médecin généraliste', 'Médecin spécialiste', 'Sage-femme'],
            'ordering_allow_custom_emploi' => false,
            'pharmacy_receiver_emplois' => ['Pharmacien'],
        ];
    }

    public function testCanOrderSuperAdminAlways(): void
    {
        $this->assertTrue(PharmacyModuleConfig::canOrder(
            ['role' => 'super_admin'],
            $this->baseConfig()
        ));
    }

    public function testCanOrderNurseRegardlessOfLegacyFlag(): void
    {
        $config = $this->baseConfig();
        $this->assertTrue(PharmacyModuleConfig::canOrder(['role' => 'nurse'], $config));
        $config['ordering_enabled_for_nurse'] = false;
        $this->assertTrue(PharmacyModuleConfig::canOrder(['role' => 'nurse'], $config));
    }

    public function testCanOrderProWithAllowedEmploi(): void
    {
        $this->assertTrue(PharmacyModuleConfig::canOrder(
            ['role' => 'pro', 'emploi' => 'Médecin généraliste'],
            $this->baseConfig()
        ));
    }

    public function testCanOrderProWithCustomEmploiWhenAllowed(): void
    {
        $config = $this->baseConfig();
        $config['ordering_allow_custom_emploi'] = true;
        $this->assertTrue(PharmacyModuleConfig::canOrder(
            ['role' => 'pro', 'emploi' => 'Orthophoniste'],
            $config
        ));
        $this->assertTrue(PharmacyModuleConfig::canOrder(
            ['role' => 'pro', 'emploi' => 'Pharmacien'],
            $config
        ));
    }

    public function testCanOrderDeniedWhenModuleDisabled(): void
    {
        $config = $this->baseConfig();
        $config['module_enabled'] = false;
        $this->assertFalse(PharmacyModuleConfig::canOrder(['role' => 'nurse'], $config));
        $this->assertFalse(PharmacyModuleConfig::canOrder(
            ['role' => 'pro', 'emploi' => 'Médecin généraliste'],
            $config
        ));
    }

    public function testCanOrderPatientAllowed(): void
    {
        $this->assertTrue(PharmacyModuleConfig::canOrder(
            ['role' => 'patient'],
            $this->baseConfig()
        ));
    }

    public function testCanOrderProWithoutEmploiAllowed(): void
    {
        $this->assertTrue(PharmacyModuleConfig::canOrder(
            ['role' => 'pro', 'emploi' => ''],
            $this->baseConfig()
        ));
    }

    public function testIsPharmacyAccountIgnoresPauseFlag(): void
    {
        $this->assertTrue(PharmacyModuleConfig::isPharmacyAccount(
            ['role' => 'pro', 'emploi' => 'Pharmacien'],
            $this->baseConfig()
        ));
        $this->assertFalse(PharmacyModuleConfig::isPharmacyAccount(
            ['role' => 'pro', 'emploi' => 'Médecin généraliste'],
            $this->baseConfig()
        ));
        $this->assertFalse(PharmacyModuleConfig::isPharmacyAccount(
            ['role' => 'nurse', 'emploi' => 'Pharmacien'],
            $this->baseConfig()
        ));
    }

    public function testCanReceivePharmacistWhenEnabled(): void
    {
        $this->assertTrue(PharmacyModuleConfig::canReceive(
            [
                'role' => 'pro',
                'emploi' => 'Pharmacien',
                'pharmacy_orders_enabled' => 1,
                'pharmacy_orders_paused' => 0,
            ],
            $this->baseConfig()
        ));
    }

    public function testCanReceiveCaseInsensitiveEmploi(): void
    {
        $this->assertTrue(PharmacyModuleConfig::canReceive(
            [
                'role' => 'pro',
                'emploi' => 'pharmacien',
                'pharmacy_orders_enabled' => 1,
                'pharmacy_orders_paused' => 0,
            ],
            $this->baseConfig()
        ));
    }

    public function testCanReceiveDeniedWhenPausedOrDisabled(): void
    {
        $user = [
            'role' => 'pro',
            'emploi' => 'Pharmacien',
            'pharmacy_orders_enabled' => 1,
            'pharmacy_orders_paused' => 0,
        ];
        $config = $this->baseConfig();

        $user['pharmacy_orders_paused'] = 1;
        $this->assertFalse(PharmacyModuleConfig::canReceive($user, $config));

        $user['pharmacy_orders_paused'] = 0;
        $user['pharmacy_orders_enabled'] = 0;
        $this->assertFalse(PharmacyModuleConfig::canReceive($user, $config));
    }

    public function testCanReceiveNonPharmacistProDenied(): void
    {
        $this->assertFalse(PharmacyModuleConfig::canReceive(
            [
                'role' => 'pro',
                'emploi' => 'Médecin généraliste',
                'pharmacy_orders_enabled' => 1,
                'pharmacy_orders_paused' => 0,
            ],
            $this->baseConfig()
        ));
    }

    public function testUiFlagsMarkPharmacyAccountEvenWhenPaused(): void
    {
        $config = $this->baseConfig();
        $paused = [
            'role' => 'pro',
            'emploi' => 'Pharmacien',
            'pharmacy_orders_enabled' => 1,
            'pharmacy_orders_paused' => 1,
        ];
        $this->assertTrue(PharmacyModuleConfig::isPharmacyAccount($paused, $config));
        $this->assertFalse(PharmacyModuleConfig::canReceive($paused, $config));
    }

    public function testCanReceiveNurseDenied(): void
    {
        $this->assertFalse(PharmacyModuleConfig::canReceive(
            [
                'role' => 'nurse',
                'emploi' => 'Pharmacien',
                'pharmacy_orders_enabled' => 1,
                'pharmacy_orders_paused' => 0,
            ],
            $this->baseConfig()
        ));
    }
}
