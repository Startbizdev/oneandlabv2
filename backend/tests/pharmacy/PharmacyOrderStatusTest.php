<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/pharmacy/PharmacyModuleConfig.php';
require_once __DIR__ . '/../../lib/pharmacy/PharmacyOrderService.php';

final class PharmacyOrderStatusTest extends TestCase
{
    /** @return array<string, list<string>> */
    private function allowedTransitions(): array
    {
        $ref = new ReflectionClass(PharmacyOrderService::class);
        $prop = $ref->getConstant('ALLOWED_TRANSITIONS');
        if (!is_array($prop)) {
            $this->fail('ALLOWED_TRANSITIONS introuvable');
        }

        return $prop;
    }

    public function testTransitionMatrixMatchesExpectedStatuses(): void
    {
        $expected = [
            'en_attente' => ['acceptee', 'refusee', 'complement_demande', 'annulee'],
            'complement_demande' => ['en_attente', 'annulee'],
            'acceptee' => ['en_cours', 'annulee'],
            'en_cours' => ['terminee', 'annulee'],
        ];
        $this->assertSame($expected, $this->allowedTransitions());
    }

    /** @dataProvider invalidTransitionProvider */
    public function testUpdateStatusRejectsInvalidTransition(string $from, string $to): void
    {
        $orderId = 'test-pharmacy-order-status-' . substr(md5($from . $to), 0, 8);
        $service = $this->serviceWithOrder([
            'id' => $orderId,
            'requester_id' => 'req-1',
            'requester_role' => 'nurse',
            'pharmacy_id' => 'ph-1',
            'patient_id' => 'pat-1',
            'relative_id' => null,
            'fulfillment_mode' => 'click_collect',
            'delivery_address_json' => null,
            'delivery_postal_code' => null,
            'status' => $from,
            'requester_comment' => null,
            'pharmacy_note' => null,
            'rejection_reason' => null,
            'prescription_document_ids' => '["doc-1"]',
            'created_by_admin_id' => null,
            'created_at' => '2026-01-01 10:00:00',
            'updated_at' => '2026-01-01 10:00:00',
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage("Transition $from → $to non autorisée");
        $service->updateStatus(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $orderId,
            $to
        );
    }

    /** @return list<array{0: string, 1: string}> */
    public function invalidTransitionProvider(): array
    {
        return [
            ['en_attente', 'terminee'],
            ['en_attente', 'en_cours'],
            ['acceptee', 'refusee'],
            ['en_cours', 'acceptee'],
            ['terminee', 'en_attente'],
            ['refusee', 'en_attente'],
            ['annulee', 'en_attente'],
        ];
    }

    public function testUpdateStatusRequiresRejectionReason(): void
    {
        $orderId = 'test-pharmacy-order-reject-reason';
        $service = $this->serviceWithOrder($this->orderRow($orderId, 'en_attente'));

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Motif de refus requis');
        $service->updateStatus(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $orderId,
            'refusee',
            ['rejection_reason' => '']
        );
    }

    public function testRequesterCannotCancelViaPharmacyRole(): void
    {
        $orderId = 'test-pharmacy-order-cancel-acl';
        $service = $this->serviceWithOrder($this->orderRow($orderId, 'en_attente'));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Action réservée à la pharmacie');
        $service->updateStatus(
            ['user_id' => 'req-1', 'role' => 'nurse'],
            $orderId,
            'acceptee'
        );
    }

    public function testPharmacyCanCancelOrder(): void
    {
        $orderId = 'test-pharmacy-order-ph-cancel';
        $service = $this->serviceWithOrder($this->orderRow($orderId, 'en_attente'));

        $updated = $service->updateStatus(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $orderId,
            'annulee'
        );
        $this->assertSame($orderId, $updated['id']);
    }

    public function testPatientCanCancelOrder(): void
    {
        $orderId = 'test-pharmacy-order-patient-cancel';
        $service = $this->serviceWithOrder($this->orderRow($orderId, 'en_attente'));

        $updated = $service->updateStatus(
            ['user_id' => 'pat-1', 'role' => 'patient'],
            $orderId,
            'annulee'
        );
        $this->assertSame($orderId, $updated['id']);
    }

    public function testUnrelatedUserCannotCancelOrder(): void
    {
        $orderId = 'test-pharmacy-order-stranger-cancel';
        $service = $this->serviceWithOrder($this->orderRow($orderId, 'en_attente'));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Action non autorisée');
        $service->updateStatus(
            ['user_id' => 'stranger', 'role' => 'nurse'],
            $orderId,
            'annulee'
        );
    }

    public function testRequesterCancelIgnoresPharmacyNote(): void
    {
        $orderId = 'test-pharmacy-order-note-acl';
        $row = $this->orderRow($orderId, 'en_attente');
        $row['pharmacy_note'] = 'Note officielle';
        $captured = [];
        $service = $this->serviceWithOrder($row, $captured);

        $service->updateStatus(
            ['user_id' => 'req-1', 'role' => 'nurse'],
            $orderId,
            'annulee',
            ['pharmacy_note' => 'Fausse note', 'rejection_reason' => 'Faux motif']
        );

        $this->assertNotEmpty($captured);
        $this->assertSame('annulee', $captured[0] ?? null);
        $this->assertSame('Note officielle', $captured[1] ?? null);
        $this->assertArrayHasKey(2, $captured);
        $this->assertNull($captured[2]);
    }

    public function testValidTransitionAccepteeFromEnAttente(): void
    {
        $orderId = 'test-pharmacy-order-accept-ok';
        $service = $this->serviceWithOrder($this->orderRow($orderId, 'en_attente'));
        $updated = $service->updateStatus(
            ['user_id' => 'ph-1', 'role' => 'pro'],
            $orderId,
            'acceptee'
        );
        $this->assertSame('acceptee', $updated['status']);
    }

    /**
     * @param array<string, mixed> $row
     * @param list<mixed> $capturedUpdate
     */
    private function serviceWithOrder(array $row, array &$capturedUpdate = []): PharmacyOrderService
    {
        $db = $this->createMock(PDO::class);
        $selectStmt = $this->createMock(PDOStatement::class);
        $updateStmt = $this->createMock(PDOStatement::class);
        $eventStmt = $this->createMock(PDOStatement::class);

        $fetchCalls = 0;
        $selectStmt->method('execute')->willReturn(true);
        $selectStmt->method('fetch')->willReturnCallback(function () use (&$fetchCalls, $row) {
            $fetchCalls++;
            if ($fetchCalls === 1) {
                return $row;
            }
            $updated = $row;
            $updated['status'] = 'acceptee';

            return $updated;
        });

        $updateStmt->method('execute')->willReturnCallback(function (array $params) use (&$capturedUpdate): bool {
            $capturedUpdate = $params;

            return true;
        });
        $eventStmt->method('execute')->willReturn(true);

        $db->method('prepare')->willReturnCallback(function (string $sql) use ($selectStmt, $updateStmt, $eventStmt) {
            if (str_contains($sql, 'SELECT * FROM pharmacy_orders')) {
                return $selectStmt;
            }
            if (str_contains($sql, 'UPDATE pharmacy_orders')) {
                return $updateStmt;
            }
            if (str_contains($sql, 'INSERT INTO pharmacy_order_events')) {
                return $eventStmt;
            }
            $fallback = $this->createMock(PDOStatement::class);
            $fallback->method('execute')->willReturn(true);

            return $fallback;
        });

        return new PharmacyOrderService($db, new PharmacyModuleConfig($db));
    }

    /** @return array<string, mixed> */
    private function orderRow(string $id, string $status): array
    {
        return [
            'id' => $id,
            'requester_id' => 'req-1',
            'requester_role' => 'nurse',
            'pharmacy_id' => 'ph-1',
            'patient_id' => 'pat-1',
            'relative_id' => null,
            'fulfillment_mode' => 'click_collect',
            'delivery_address_json' => null,
            'delivery_postal_code' => null,
            'status' => $status,
            'requester_comment' => null,
            'pharmacy_note' => null,
            'rejection_reason' => null,
            'prescription_document_ids' => '["doc-1"]',
            'created_by_admin_id' => null,
            'created_at' => '2026-01-01 10:00:00',
            'updated_at' => '2026-01-01 10:00:00',
        ];
    }
}
