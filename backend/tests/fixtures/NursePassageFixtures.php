<?php

declare(strict_types=1);

require_once __DIR__ . '/TestFixtures.php';

/** Infirmier, patient suivi (adresse chiffrée + accès) et soin jetables pour les tests de passages. */
final class NursePassageFixtures
{
    /** @return array{nurse: string, patient: string, category: string} */
    public static function create(PDO $db): array
    {
        $nurseId = TestFixtures::insertProfile($db, 'nurse');
        $patientId = TestFixtures::insertProfile($db, 'patient');
        $address = (new Crypto())->encryptField(json_encode(
            ['label' => '27 Rue d\'Aubagne, 13001 Marseille', 'lat' => 43.2938, 'lng' => 5.3815],
            JSON_THROW_ON_ERROR,
        ));
        $db->prepare('UPDATE profiles SET address_encrypted = ?, address_dek = ? WHERE id = ?')
            ->execute([$address['encrypted'], $address['dek'], $patientId]);
        $db->prepare(
            "INSERT INTO patient_professional_access (id, patient_id, professional_id, source, appointment_id, created_at)
             VALUES (?, ?, ?, 'manual_link', NULL, NOW())"
        )->execute([self::uuid(), $patientId, $nurseId]);
        $categoryId = self::uuid();
        $db->prepare("INSERT INTO care_categories (id, name, type) VALUES (?, 'Injection QA', 'nursing')")
            ->execute([$categoryId]);

        return ['nurse' => $nurseId, 'patient' => $patientId, 'category' => $categoryId];
    }

    /** @param array{nurse: string, patient: string, category: string} $ids */
    public static function cleanup(PDO $db, array $ids): void
    {
        $db->prepare('DELETE FROM appointments WHERE assigned_nurse_id = ?')->execute([$ids['nurse']]);
        $db->prepare('DELETE FROM nurse_tour_plans WHERE nurse_id = ?')->execute([$ids['nurse']]);
        $db->prepare('DELETE FROM nurse_passage_series WHERE nurse_id = ?')->execute([$ids['nurse']]);
        $db->prepare('DELETE FROM appointment_creation_requests WHERE actor_id = ?')->execute([$ids['nurse']]);
        $db->prepare('DELETE FROM patient_professional_access WHERE professional_id = ?')->execute([$ids['nurse']]);
        $db->prepare('DELETE FROM profiles WHERE id IN (?, ?)')->execute([$ids['nurse'], $ids['patient']]);
        $db->prepare('DELETE FROM care_categories WHERE id = ?')->execute([$ids['category']]);
    }

    public static function uuid(): string
    {
        return strtolower(sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xffffffff), random_int(0, 0xffffffffffff)));
    }
}
