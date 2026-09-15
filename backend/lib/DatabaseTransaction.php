<?php

declare(strict_types=1);

/** Atomic writes, including when the caller already owns a transaction. */
final class DatabaseTransaction
{
    public static function run(PDO $db, callable $operation)
    {
        $ownsTransaction = !$db->inTransaction();
        $savepoint = 'cary_' . bin2hex(random_bytes(8));
        if ($ownsTransaction) {
            $db->beginTransaction();
        } else {
            $db->exec('SAVEPOINT ' . $savepoint);
        }
        try {
            $result = $operation();
            if ($ownsTransaction) {
                $db->commit();
            } else {
                $db->exec('RELEASE SAVEPOINT ' . $savepoint);
            }
            return $result;
        } catch (Throwable $error) {
            if ($db->inTransaction()) {
                if ($ownsTransaction) {
                    $db->rollBack();
                } else {
                    $db->exec('ROLLBACK TO SAVEPOINT ' . $savepoint);
                    $db->exec('RELEASE SAVEPOINT ' . $savepoint);
                }
            }
            throw $error;
        }
    }
}
