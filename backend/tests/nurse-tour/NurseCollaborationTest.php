<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../fixtures/SkipsWithoutPdo.php';
require_once __DIR__ . '/../TestDatabase.php';
require_once __DIR__ . '/../fixtures/NursePassageFixtures.php';
require_once __DIR__ . '/../../lib/nurse-passage/NursePassageSeriesService.php';
require_once __DIR__ . '/../../lib/nurse-tour/NurseTourService.php';
require_once __DIR__ . '/../../lib/nurse-tour/TourVisitService.php';
require_once __DIR__ . '/../../lib/nurse-collaboration/NurseCollaborationService.php';
require_once __DIR__ . '/../../lib/appointments/bootstrap.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentDetailAccess.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentDetailGetPayload.php';
require_once __DIR__ . '/../../lib/appointments/AppointmentDetailPatchRules.php';
require_once __DIR__ . '/../../lib/AppointmentCancellationPolicy.php';
require_once __DIR__ . '/../../lib/MedicalDocumentAccess.php';
require_once __DIR__ . '/../../lib/health/PatientCareTeam.php';
require_once __DIR__ . '/../../models/Appointment.php';

/**
 * Binôme infirmier : le confrère invité (RDV, série ou plage de tournée) voit et gère les passages partagés
 * (tournée, agenda, détail, soins, dossier) ; le retrait coupe l'accès ; le titulaire garde l'annulation.
 */
final class NurseCollaborationTest extends TestCase
{
    use SkipsWithoutPdo;

    private const TOUR_DATE = '2030-01-08';

    private PDO $db;
    /** @var array{nurse: string, patient: string, category: string}|null */
    private ?array $fixtures = null;
    private string $coNurse = '';
    private string $outsider = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->requirePdo();
        if (!TestDatabase::isConfigured()) {
            $this->markTestSkipped('TEST_DATABASE_DSN');
        }
        $this->db = TestDatabase::pdo();
        $this->fixtures = NursePassageFixtures::create($this->db);
        $this->coNurse = TestFixtures::insertProfile($this->db, 'nurse');
        $this->outsider = TestFixtures::insertProfile($this->db, 'nurse');
    }

    protected function tearDown(): void
    {
        unset($_GET['nurse_segment']);
        if ($this->fixtures !== null) {
            $this->db->prepare('DELETE FROM appointments WHERE patient_id = ?')->execute([$this->fixtures['patient']]);
            $this->db->prepare('DELETE FROM nurse_tour_plans WHERE nurse_id IN (?, ?)')->execute([$this->coNurse, $this->outsider]);
            $this->db->prepare('DELETE FROM profiles WHERE id IN (?, ?)')->execute([$this->coNurse, $this->outsider]);
            NursePassageFixtures::cleanup($this->db, $this->fixtures);
        }
        unset($this->db);
        parent::tearDown();
    }

    public function testSharedAppointmentAppearsInGuestTourAgendaAndDetail(): void
    {
        $appointmentId = $this->passage()['appointment_id'];
        $item = $this->service()->create($this->owner(), [
            'co_nurse_id' => $this->coNurse,
            'scope' => 'appointment',
            'appointment_id' => $appointmentId,
        ]);

        $this->assertSame('appointment', $item['scope']);
        $this->assertSame($this->owner(), $item['owner_nurse_id']);
        $this->assertSame('Profil Test', $item['co_nurse_name']);
        $this->assertSame($appointmentId, $item['appointment_id']);
        $this->assertNull($item['passage_series_id']);
        $this->assertTrue($item['can_remove']);
        $this->assertNotificationSent($item['id'], $appointmentId);

        $guestStop = $this->onlyStop($this->coNurse);
        $this->assertSame($appointmentId, $guestStop['appointment_id']);
        $this->assertTrue($guestStop['is_co_nurse']);
        $this->assertSame([['id' => $this->coNurse, 'name' => 'Profil Test']], $guestStop['co_nurses']);
        $this->assertIsString($guestStop['shared_by_name']);
        $this->assertNotSame('', $guestStop['shared_by_name']);
        $ownerStop = $this->onlyStop($this->owner());
        $this->assertFalse($ownerStop['is_co_nurse']);
        $this->assertNull($ownerStop['shared_by_name']);
        $this->assertSame($this->coNurse, $ownerStop['co_nurses'][0]['id']);

        $this->assertContains($appointmentId, $this->agendaIds($this->coNurse, 'acceptes'));
        $this->assertContains($appointmentId, $this->agendaIds($this->coNurse, 'tous'));
        $this->assertNotContains($appointmentId, $this->agendaIds($this->outsider, 'acceptes'));
        $this->assertSame(1, (new NurseTourService($this->db))->getSummaryRange($this->coNurse, self::TOUR_DATE, self::TOUR_DATE)[self::TOUR_DATE]);

        $this->assertTrue($this->hasDetailAccess($this->coNurse, $appointmentId));
        $this->assertTrue($this->hasDetailAccess($this->owner(), $appointmentId), 'Le titulaire garde l\'accès au rendez-vous');
        $this->assertFalse($this->hasDetailAccess($this->outsider, $appointmentId));
        $this->assertSeriesOpenable((string) $ownerStop['passage_series_id']);
        $detail = AppointmentDetailGetPayload::loadWithOptionalBatch($this->db, new Appointment($this->db), $this->user($this->coNurse), $appointmentId, '');
        $this->assertTrue($detail['is_co_nurse']);
        $this->assertSame($guestStop['shared_by_name'], $detail['shared_by_name']);
        $this->assertSame($this->coNurse, $detail['co_nurses'][0]['id']);

        $listed = $this->service()->listFor($this->coNurse, $appointmentId);
        $this->assertSame([$item['id']], array_column($listed, 'id'));
        $this->assertSame([$item['id']], array_column($this->service()->listFor($this->coNurse), 'id'));
    }

    public function testGuestManagesCareStatusAndDossier(): void
    {
        $stop = $this->passage();
        $appointmentId = $stop['appointment_id'];
        $this->share('appointment', ['appointment_id' => $appointmentId]);
        $guestStop = $this->onlyStop($this->coNurse);
        $visits = new TourVisitService($this->db);

        $tour = $visits->setItemDone($this->coNurse, $guestStop['stop_id'], $guestStop['nursing_items'][0]['id'], true);
        $tour = $visits->setItemDone($this->coNurse, $guestStop['stop_id'], $guestStop['nursing_items'][1]['id'], true);
        $this->assertSame('done', $tour['stops'][0]['visit_status']);
        $this->assertNotNull($this->onlyStop($this->owner())['nursing_items'][0]['done_at'], 'Le titulaire voit le soin coché par son confrère');

        $permission = ['id' => $appointmentId, 'assigned_nurse_id' => $this->owner(), 'assigned_lab_id' => null, 'assigned_to' => null, 'created_by' => $this->owner()];
        $this->assertTrue(AppointmentDetailPatchRules::canStaffSetCompletedOrInProgressWithDb($this->db, $this->user($this->coNurse), $permission));
        $this->assertFalse(AppointmentDetailPatchRules::canStaffSetCompletedOrInProgressWithDb($this->db, $this->user($this->outsider), $permission));
        $this->assertTrue(AppointmentDetailPatchRules::nurseCanManageNursing($this->db, $appointmentId, $this->coNurse));
        $this->assertFalse(AppointmentDetailPatchRules::nurseCanManageNursing($this->db, $appointmentId, $this->outsider));

        $patient = $this->fixtures['patient'];
        $this->assertTrue(MedicalDocumentAccess::userHasProfileDocumentAccess($this->db, $this->user($this->coNurse), $patient));
        $this->assertFalse(MedicalDocumentAccess::userHasProfileDocumentAccess($this->db, $this->user($this->outsider), $patient));
        $this->assertContains($this->coNurse, array_column(PatientCareTeam::members($this->db, $patient), 'id'));
    }

    public function testGuestCannotCancelRedispatchOrInviteAndOutsiderCannotInvite(): void
    {
        $appointmentId = $this->passage()['appointment_id'];
        $this->share('appointment', ['appointment_id' => $appointmentId]);

        $this->assertFalse(AppointmentCancellationPolicy::canCancel(
            $this->user($this->coNurse),
            ['created_by' => $this->owner(), 'assigned_nurse_id' => $this->owner(), 'assigned_lab_id' => null, 'assigned_to' => null],
        ));
        try {
            (new Appointment($this->db))->updateStatus($appointmentId, 'pending', $this->coNurse, 'nurse', null, true);
            $this->fail('Le confrère invité ne doit pas redispatcher');
        } catch (DomainException $e) {
            $this->assertSame('Vous ne pouvez redispatcher que les rendez-vous qui vous sont assignés', $e->getMessage());
        }

        foreach ([$this->outsider => $this->coNurse, $this->coNurse => $this->outsider] as $notOwner => $invitee) {
            try {
                $this->service()->create((string) $notOwner, ['co_nurse_id' => $invitee, 'scope' => 'appointment', 'appointment_id' => $appointmentId]);
                $this->fail('Seul le titulaire invite');
            } catch (HttpStatusException $e) {
                $this->assertSame(422, $e->httpStatus);
                $this->assertSame('Vous n\'êtes pas l\'infirmier titulaire de ce rendez-vous', $e->getMessage());
            }
        }
        $this->assertSame([], $this->agendaIds($this->outsider, 'acceptes'));
    }

    public function testRemovalByGuestOrOwnerEndsAccess(): void
    {
        $stop = $this->passage();
        $appointmentId = $stop['appointment_id'];
        $item = $this->share('appointment', ['appointment_id' => $appointmentId]);
        $guestStop = $this->onlyStop($this->coNurse);

        try {
            $this->service()->revoke($this->outsider, $item['id']);
            $this->fail('Un tiers ne retire pas le binôme');
        } catch (HttpStatusException $e) {
            $this->assertSame(403, $e->httpStatus);
        }
        $this->service()->revoke($this->coNurse, $item['id']);

        try {
            (new TourVisitService($this->db))->setItemDone($this->coNurse, $guestStop['stop_id'], $guestStop['nursing_items'][0]['id'], true);
            $this->fail('L\'arrêt d\'un binôme retiré ne doit plus être modifiable');
        } catch (HttpStatusException $e) {
            $this->assertSame('Stop introuvable', $e->getMessage());
        }
        $this->assertSame([], (new NurseTourService($this->db))->getTour($this->coNurse, self::TOUR_DATE)['stops']);
        $this->assertFalse($this->hasDetailAccess($this->coNurse, $appointmentId));
        $this->assertNotContains($appointmentId, $this->agendaIds($this->coNurse, 'acceptes'));
        $this->assertFalse(MedicalDocumentAccess::userHasProfileDocumentAccess($this->db, $this->user($this->coNurse), $this->fixtures['patient']));
        $this->assertSame([], $this->service()->listFor($this->coNurse));

        $again = $this->share('appointment', ['appointment_id' => $appointmentId]);
        $this->service()->revoke($this->owner(), $again['id']);
        $this->assertFalse($this->hasDetailAccess($this->coNurse, $appointmentId));
        $this->expectException(HttpStatusException::class);
        $this->expectExceptionMessage('Binôme introuvable');
        $this->service()->revoke($this->owner(), $again['id']);
    }

    public function testSeriesShareCoversEveryPassageOfTheSeries(): void
    {
        $stop = $this->passage();
        $seriesId = (string) $stop['passage_series_id'];
        $this->assertNotSame('', $seriesId);
        $item = $this->share('series', ['passage_series_id' => $seriesId]);

        $this->assertSame($seriesId, $item['passage_series_id']);
        $guestStop = $this->onlyStop($this->coNurse);
        $this->assertSame($stop['appointment_id'], $guestStop['appointment_id']);
        $this->assertTrue($guestStop['is_co_nurse']);
        $this->assertTrue($this->hasDetailAccess($this->coNurse, $stop['appointment_id']));
        $this->assertSame($stop['appointment_id'], $this->onlyStop($this->owner())['appointment_id'], 'Le titulaire garde le passage après le partage');
        $this->assertSeriesOpenable($seriesId);

        try {
            $this->service()->create($this->outsider, ['co_nurse_id' => $this->coNurse, 'scope' => 'series', 'passage_series_id' => $seriesId]);
            $this->fail('Seul le titulaire de la série invite');
        } catch (HttpStatusException $e) {
            $this->assertSame(422, $e->httpStatus);
        }
    }

    public function testRangeShareCoversTheOwnerTourBetweenDatesOnly(): void
    {
        $appointmentId = $this->passage()['appointment_id'];
        $this->share('range', ['start_date' => '2030-01-09', 'end_date' => '2030-01-20']);
        $this->assertSame([], (new NurseTourService($this->db))->getTour($this->coNurse, self::TOUR_DATE)['stops']);

        $this->share('range', ['start_date' => '2030-01-01', 'end_date' => self::TOUR_DATE]);
        $this->assertSame($appointmentId, $this->onlyStop($this->coNurse)['appointment_id']);
        $this->assertSame($appointmentId, $this->onlyStop($this->owner())['appointment_id'], 'Le titulaire garde le passage sur la période partagée');
        $this->assertContains($appointmentId, $this->agendaIds($this->coNurse, 'acceptes'));
        $ownerStop = $this->onlyStop($this->owner());
        $this->assertSeriesOpenable((string) $ownerStop['passage_series_id']);

        $this->db->prepare('UPDATE appointments SET assigned_nurse_id = ? WHERE id = ?')->execute([$this->outsider, $appointmentId]);
        $this->assertFalse($this->hasDetailAccess($this->coNurse, $appointmentId), 'Un RDV réassigné sort de la tournée du titulaire');
    }

    public function testInvitationValidation(): void
    {
        $appointmentId = $this->passage()['appointment_id'];
        $this->share('appointment', ['appointment_id' => $appointmentId]);

        $cases = [
            'doublon actif' => [409, ['co_nurse_id' => $this->coNurse, 'scope' => 'appointment', 'appointment_id' => $appointmentId]],
            'soi-même' => [422, ['co_nurse_id' => $this->owner(), 'scope' => 'appointment', 'appointment_id' => $appointmentId]],
            'pas infirmier' => [422, ['co_nurse_id' => $this->fixtures['patient'], 'scope' => 'appointment', 'appointment_id' => $appointmentId]],
            'périmètre inconnu' => [422, ['co_nurse_id' => $this->coNurse, 'scope' => 'week']],
            'plage > 92 jours' => [422, ['co_nurse_id' => $this->coNurse, 'scope' => 'range', 'start_date' => '2030-01-01', 'end_date' => '2030-04-03']],
            'plage inversée' => [422, ['co_nurse_id' => $this->coNurse, 'scope' => 'range', 'start_date' => '2030-01-10', 'end_date' => '2030-01-01']],
            'plage passée' => [422, ['co_nurse_id' => $this->coNurse, 'scope' => 'range', 'start_date' => '2020-01-01', 'end_date' => '2020-01-10']],
            'date invalide' => [422, ['co_nurse_id' => $this->coNurse, 'scope' => 'range', 'start_date' => '2030-02-30', 'end_date' => '2030-03-01']],
        ];
        foreach ($cases as $label => [$status, $input]) {
            try {
                $this->service()->create($this->owner(), $input);
                $this->fail('Invitation acceptée : ' . $label);
            } catch (HttpStatusException $e) {
                $this->assertSame($status, $e->httpStatus, $label);
            }
        }
        $ninetyTwoDays = $this->service()->create($this->owner(), ['co_nurse_id' => $this->coNurse, 'scope' => 'range', 'start_date' => '2030-01-01', 'end_date' => '2030-04-02']);
        $this->assertSame('2030-04-02', $ninetyTwoDays['end_date']);
    }

    private function service(): NurseCollaborationService
    {
        return new NurseCollaborationService($this->db);
    }

    private function owner(): string
    {
        return $this->fixtures['nurse'];
    }

    /** @return array{user_id: string, role: string} */
    private function user(string $nurseId): array
    {
        return ['user_id' => $nurseId, 'role' => 'nurse'];
    }

    /**
     * @param array<string, string> $target
     * @return array<string, mixed>
     */
    private function share(string $scope, array $target): array
    {
        return $this->service()->create($this->owner(), ['co_nurse_id' => $this->coNurse, 'scope' => $scope] + $target);
    }

    /** Passage du titulaire (série d'un jour, deux soins) et son arrêt dans sa tournée. */
    private function passage(): array
    {
        (new NursePassageSeriesService($this->db))->create($this->owner(), [
            'patient_id' => $this->fixtures['patient'],
            'planning_type' => 'single_day',
            'planning_config' => ['start_date' => self::TOUR_DATE],
            'time_slot' => 'morning',
            'duration_minutes' => 20,
            'at_home' => true,
            'nursing_items' => [
                ['category_id' => $this->fixtures['category'], 'care_options' => ['site' => 'bras']],
                ['category_id' => $this->fixtures['category'], 'care_options' => ['site' => 'cuisse']],
            ],
        ], new DateTimeImmutable('2030-01-07 06:00', new DateTimeZone('Europe/Paris')));

        return $this->onlyStop($this->owner());
    }

    /** @return array<string, mixed> */
    private function onlyStop(string $nurseId): array
    {
        $tour = (new NurseTourService($this->db))->getTour($nurseId, self::TOUR_DATE);
        $this->assertCount(1, $tour['stops']);

        return $tour['stops'][0];
    }

    private function assertSeriesOpenable(string $seriesId): void
    {
        $this->assertNotSame('', $seriesId);
        $service = new NursePassageSeriesService($this->db);
        $this->assertNotNull($service->getById($seriesId, $this->owner()), 'Le titulaire ouvre toujours sa série');
        $this->assertNotNull($service->getById($seriesId, $this->coNurse), 'Le confrère invité ouvre la série du passage');
        $this->assertNull($service->getById($seriesId, $this->outsider));
    }

    private function hasDetailAccess(string $nurseId, string $appointmentId): bool
    {
        $context = AppointmentDetailAccess::loadAccessContext($this->db, $appointmentId);
        $this->assertNotNull($context);

        return AppointmentDetailAccess::userHasDetailAccess(
            $this->db,
            $this->user($nurseId),
            $context['row'],
            $context['id'],
            $context['has_creation_batch_column'],
        );
    }

    /** @return list<string> */
    private function agendaIds(string $nurseId, string $segment): array
    {
        $_GET['nurse_segment'] = $segment;
        $flags = AppointmentListQueryBuilder::schemaFlags($this->db);
        $builder = new AppointmentListQueryBuilder(
            $this->db,
            AppointmentListQuery::fromArray(['scope' => 'list', 'limit' => '50']),
            $this->user($nurseId),
            $flags['useRelativeJoin'],
            $flags['hasMergedColumn'],
        );
        $sql = $builder->build();
        [$orderBy, $orderParams] = $builder->buildOrderByClause();
        $stmt = $this->db->prepare($sql->selectSql . $orderBy);
        $stmt->execute(array_merge($sql->params, $orderParams));

        return array_map('strval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'id'));
    }

    private function assertNotificationSent(string $collaborationId, string $appointmentId): void
    {
        $stmt = $this->db->prepare('SELECT data FROM notifications WHERE user_id = ? AND type = ?');
        $stmt->execute([$this->coNurse, NurseCollaborationService::NOTIFICATION_TYPE]);
        $data = json_decode((string) $stmt->fetchColumn(), true);
        $this->assertEquals(
            ['collaboration_id' => $collaborationId, 'scope' => 'appointment', 'appointment_id' => $appointmentId],
            $data,
        );
    }
}
