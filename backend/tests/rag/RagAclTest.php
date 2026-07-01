<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/rag/RagSearchService.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';

/**
 * Vérifie que la recherche RAG refuse l'accès inter-patients (ACL).
 */
final class RagAclTest extends TestCase
{
    public function testCrossPatientAccessDenied(): void
    {
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN non défini');
        }
        $pair = TestDatabase::patientPairOrNull();
        if ($pair === null) {
            $this->markTestSkipped('TEST_PATIENT_ID et TEST_PATIENT_B_ID requis');
        }
        [$patientA, $patientB] = $pair;
        $db = TestDatabase::pdo();
        $user = ['user_id' => $patientA, 'role' => 'patient'];
        $search = new RagSearchService($db);
        $this->expectException(RuntimeException::class);
        $search->searchForUser($user, $patientB, 'ferritine');
    }
}
