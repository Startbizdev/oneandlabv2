<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/TestFixtures.php';
require_once __DIR__ . '/../../lib/ReviewResponse.php';
require_once __DIR__ . '/../../lib/Uuid.php';

/**
 * PUT/POST /reviews/{id}/response : texte non vide, longueur bornée, réponse unique du professionnel noté.
 */
final class ReviewResponseTest extends TestCase
{
    use SkipsWithoutPdo;

    private ?PDO $db = null;
    private ?string $appointmentId = null;

    protected function tearDown(): void
    {
        if ($this->db !== null && $this->appointmentId !== null) {
            $this->db->prepare('DELETE FROM reviews WHERE appointment_id = ?')->execute([$this->appointmentId]);
            $this->db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$this->appointmentId]);
        }
        $this->db = null;
        parent::tearDown();
    }

    public function testNormalizeTrimsAndRejectsEmptyOrNonString(): void
    {
        $this->assertSame('Merci beaucoup', ReviewResponse::normalize("  Merci beaucoup \n"));
        foreach (['', "   \n ", null, 42, ['texte']] as $invalid) {
            $this->assertValidationError(static fn () => ReviewResponse::normalize($invalid), 'Réponse requise');
        }
    }

    public function testNormalizeEnforcesMaxLengthInCharacters(): void
    {
        $atLimit = str_repeat('é', ReviewResponse::MAX_LENGTH);
        $this->assertSame($atLimit, ReviewResponse::normalize($atLimit));
        $this->assertValidationError(
            static fn () => ReviewResponse::normalize($atLimit . 'é'),
            'Réponse trop longue (' . ReviewResponse::MAX_LENGTH . ' caractères maximum)'
        );
    }

    public function testRevieweeAnswersOnceThenGetsConflict(): void
    {
        $reviewId = $this->insertReview();

        $this->assertSame('Merci pour votre retour', ReviewResponse::save($this->db(), $reviewId, TestFixtures::NURSE, '  Merci pour votre retour '));
        $this->assertSame('Merci pour votre retour', $this->storedResponse($reviewId));

        try {
            ReviewResponse::save($this->db(), $reviewId, TestFixtures::NURSE, 'Nouvelle réponse');
            $this->fail('Conflit attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame(409, $e->httpStatus);
            $this->assertSame('RESPONSE_ALREADY_EXISTS', $e->errorCode);
        }
        $this->assertSame('Merci pour votre retour', $this->storedResponse($reviewId));
    }

    public function testOtherUserIsForbiddenAndUnknownReviewIsNotFound(): void
    {
        $reviewId = $this->insertReview();

        try {
            ReviewResponse::save($this->db(), $reviewId, TestFixtures::PATIENT_B, 'Réponse');
            $this->fail('Refus attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
        }
        try {
            ReviewResponse::save($this->db(), Uuid::v4(), TestFixtures::NURSE, 'Réponse');
            $this->fail('Avis introuvable attendu');
        } catch (HttpStatusException $e) {
            $this->assertSame(404, $e->httpStatus);
        }
        $this->assertNull($this->storedResponse($reviewId));
    }

    public function testInvalidTextIsRejectedBeforeAnyWrite(): void
    {
        $reviewId = $this->insertReview();
        $db = $this->db();
        $this->assertValidationError(static fn () => ReviewResponse::save($db, $reviewId, TestFixtures::NURSE, '   '), 'Réponse requise');
        $this->assertNull($this->storedResponse($reviewId));
    }

    private function assertValidationError(callable $call, string $message): void
    {
        try {
            $call();
            $this->fail('Erreur de validation attendue');
        } catch (HttpStatusException $e) {
            $this->assertSame(400, $e->httpStatus);
            $this->assertSame('VALIDATION_ERROR', $e->errorCode);
            $this->assertSame($message, $e->getMessage());
        }
    }

    private function db(): PDO
    {
        if ($this->db === null) {
            $this->requirePdo();
            if (!TestDatabase::isConfigured()) {
                $this->markTestSkipped('TEST_DATABASE_DSN');
            }
            $this->db = TestDatabase::pdo();
        }
        return $this->db;
    }

    private function insertReview(): string
    {
        $db = $this->db();
        $this->appointmentId = Uuid::v4();
        $db->prepare(
            'INSERT INTO appointments (
                id, type, status, created_by, created_by_role, form_type,
                location_lat, location_lng, address_encrypted, address_dek, scheduled_at, patient_id
            ) VALUES (?, ?, ?, ?, ?, ?, 48.86, 2.35, ?, ?, NOW(), ?)'
        )->execute([$this->appointmentId, 'blood_test', 'completed', TestFixtures::PATIENT_A, 'patient', 'blood_test', 'fixture-addr', 'fixture-dek', TestFixtures::PATIENT_A]);

        $reviewId = Uuid::v4();
        $db->prepare("INSERT INTO reviews (id, appointment_id, patient_id, reviewee_id, reviewee_type, rating) VALUES (?, ?, ?, ?, 'nurse', 5)")
            ->execute([$reviewId, $this->appointmentId, TestFixtures::PATIENT_A, TestFixtures::NURSE]);
        return $reviewId;
    }

    private function storedResponse(string $reviewId): ?string
    {
        $stmt = $this->db()->prepare('SELECT response FROM reviews WHERE id = ?');
        $stmt->execute([$reviewId]);
        $value = $stmt->fetchColumn();
        return $value === false || $value === null ? null : (string) $value;
    }
}
