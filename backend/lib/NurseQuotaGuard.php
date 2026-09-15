<?php
declare(strict_types=1);

require_once __DIR__ . '/DatabaseTransaction.php';
require_once __DIR__ . '/NurseMonthlyAllowance.php';

final class NurseQuotaExceeded extends DomainException {}

/** Serialize nurse quota consumers and validate the entire change before committing. */
final class NurseQuotaGuard
{
    public static function run(PDO $db, string $nurseId, ?int $maximum, callable $operation, ?DateTimeImmutable $now = null): mixed
    {
        // An existing REPEATABLE READ snapshot can predate the profile lock and undercount another confirmation.
        if ($db->inTransaction()) throw new LogicException('Le contrôle du quota nécessite une nouvelle transaction.');
        return DatabaseTransaction::run($db, static function () use ($db, $nurseId, $maximum, $operation, $now) {
            $lockSql = "SELECT id FROM profiles WHERE id = ? AND role = 'nurse'";
            if ($db->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql') $lockSql .= ' FOR UPDATE';
            $lock = $db->prepare($lockSql);
            $lock->execute([$nurseId]);
            if (!$lock->fetchColumn()) throw new DomainException('Infirmier introuvable.');
            $result = $operation();
            if ($maximum !== null && NurseMonthlyAllowance::count($db, $nurseId, $now) > $maximum) {
                throw new NurseQuotaExceeded("La limite de {$maximum} rendez-vous acceptés ce mois-ci serait dépassée. La modification n’a pas été enregistrée. Consultez votre offre pour continuer.");
            }
            return $result;
        });
    }
}
