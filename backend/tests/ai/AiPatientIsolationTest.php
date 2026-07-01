<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/rag/RagSearchService.php';
require_once __DIR__ . '/../../lib/PatientDossierAccess.php';

/**
 * ACL IA — pas d'accès inter-patients via recherche RAG.
 */
final class AiPatientIsolationTest extends TestCase
{
    public function testCrossPatientRagSearchDenied(): void
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
        $search->searchForUser($user, $patientB, 'glycémie');
    }
}
