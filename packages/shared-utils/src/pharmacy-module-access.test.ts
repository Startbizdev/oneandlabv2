/**
 * Tests unitaires pharmacy-module-access.
 * Exécution : node packages/shared-utils/scripts/test-pharmacy-module-access.mjs
 */
import type { PharmacyModuleConfig, PharmacyModuleUiFlags } from '@oneandlab/shared-types';
import {
  canOrderPharmacy,
  canReceivePharmacyOrders,
  canShowOrderTab,
  canShowReceiveTab,
  isPharmacyAccount,
  type PharmacyAccessUser,
} from './pharmacy-module-access.ts';

export function baseConfig(): PharmacyModuleConfig {
  return {
    module_enabled: true,
    ordering_enabled_for_nurse: true,
    ordering_enabled_emplois: ['Médecin généraliste', 'Médecin spécialiste', 'Sage-femme'],
    ordering_allow_custom_emploi: false,
    pharmacy_receiver_emplois: ['Pharmacien'],
  };
}

export function runPharmacyModuleAccessTests(run: (name: string, fn: () => void) => void, assert: {
  equal: (a: unknown, b: unknown, msg?: string) => void;
}): void {
  run('super_admin peut commander', () => {
    assert.equal(canOrderPharmacy({ role: 'super_admin' }, baseConfig()), true);
  });

  run('tous les comptes connectés autorisés peuvent commander', () => {
    const cfg = baseConfig();
    assert.equal(canOrderPharmacy({ role: 'nurse' }, cfg), true);
    cfg.ordering_enabled_for_nurse = false;
    assert.equal(canOrderPharmacy({ role: 'nurse' }, cfg), true);
    assert.equal(canOrderPharmacy({ role: 'patient' }, cfg), true);
    assert.equal(canOrderPharmacy({ role: 'pro', emploi: 'Pharmacien' }, cfg), true);
  });

  run('pro avec emploi autorisé peut commander', () => {
    assert.equal(
      canOrderPharmacy({ role: 'pro', emploi: 'Médecin généraliste' }, baseConfig()),
      true,
    );
  });

  run('pro emploi custom peut commander', () => {
    const cfg = { ...baseConfig(), ordering_allow_custom_emploi: true };
    assert.equal(canOrderPharmacy({ role: 'pro', emploi: 'Orthophoniste' }, cfg), true);
    assert.equal(canOrderPharmacy({ role: 'pro', emploi: 'Pharmacien' }, cfg), true);
  });

  run('module désactivé bloque commande', () => {
    const cfg = { ...baseConfig(), module_enabled: false };
    assert.equal(canOrderPharmacy({ role: 'nurse' }, cfg), false);
  });

  run('compte pharmacie détecté même en pause', () => {
    const receivers = baseConfig().pharmacy_receiver_emplois;
    assert.equal(isPharmacyAccount({ role: 'pro', emploi: 'Pharmacien' }, receivers), true);
    assert.equal(isPharmacyAccount({ role: 'pro', emploi: 'Médecin généraliste' }, receivers), false);
    assert.equal(isPharmacyAccount({ role: 'nurse', emploi: 'Pharmacien' }, receivers), false);
  });

  run('compte pharmacie selon les emplois receveurs configurés', () => {
    assert.equal(isPharmacyAccount({ role: 'pro', emploi: 'Pharmacien' }, ['Préparateur']), false);
    assert.equal(isPharmacyAccount({ role: 'pro', emploi: 'Préparateur' }, ['Préparateur']), true);
  });

  run('pharmacien peut recevoir si actif', () => {
    const user: PharmacyAccessUser = {
      role: 'pro',
      emploi: 'Pharmacien',
      pharmacy_orders_enabled: 1,
      pharmacy_orders_paused: 0,
    };
    assert.equal(canReceivePharmacyOrders(user, baseConfig()), true);
  });

  run('pharmacien en pause ne peut pas recevoir', () => {
    const user: PharmacyAccessUser = {
      role: 'pro',
      emploi: 'Pharmacien',
      pharmacy_orders_enabled: 1,
      pharmacy_orders_paused: 1,
    };
    assert.equal(canReceivePharmacyOrders(user, baseConfig()), false);
  });

  run('emploi récepteur insensible à la casse', () => {
    const user: PharmacyAccessUser = {
      role: 'pro',
      emploi: 'pharmacien',
      pharmacy_orders_enabled: 1,
      pharmacy_orders_paused: 0,
    };
    assert.equal(canReceivePharmacyOrders(user, baseConfig()), true);
  });

  run('canShowOrderTab et canShowReceiveTab', () => {
    const flags: PharmacyModuleUiFlags = {
      module_enabled: true,
      can_order: true,
      can_receive: false,
      is_pharmacy_account: false,
    };
    assert.equal(canShowOrderTab(flags), true);
    assert.equal(canShowReceiveTab(flags), false);
    flags.can_receive = true;
    assert.equal(canShowReceiveTab(flags), true);
  });
}
