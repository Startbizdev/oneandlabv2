<?php

declare(strict_types=1);

final class AppointmentApiLogging
{
    /** Logs verbeux : désactivés si APP_ENV=production (après chargement .env par config/database.php). */
    public static function appointmentsVerboseLoggingEnabled(): bool
    {
        $env = strtolower(trim((string) ($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?: '')));

        return $env !== 'production';
    }

    /** Journalise toujours les erreurs (prod incluse) — appointments-error.log */
    public static function logAppointmentError(string $message, $data = null): void
    {
        $logDir = self::logDirectory();
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        $logFile = $logDir . '/appointments-error.log';
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message";
        if ($data !== null) {
            $logMessage .= "\n" . print_r($data, true);
        }
        $logMessage .= "\n" . str_repeat('-', 80) . "\n";
        @file_put_contents($logFile, $logMessage, FILE_APPEND);
    }

    /** Fonction de logging (verbose uniquement hors production). */
    public static function logAppointment(string $message, $data = null): void
    {
        if (!self::appointmentsVerboseLoggingEnabled()) {
            return;
        }
        $logDir = self::logDirectory();
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        $logFile = $logDir . '/appointments.log';
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message";
        if ($data !== null) {
            $logMessage .= "\n" . print_r($data, true);
        }
        $logMessage .= "\n" . str_repeat('-', 80) . "\n";
        @file_put_contents($logFile, $logMessage, FILE_APPEND);
    }

    private static function logDirectory(): string
    {
        return __DIR__ . '/../../logs';
    }
}
