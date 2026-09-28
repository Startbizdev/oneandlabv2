<?php

declare(strict_types=1);

final class PostCreateNotificationRunner
{
    /**
     * @param array<string, mixed> $notifyInput
     * @param callable(string, mixed): void|null $logAppointment
     */
    public static function runAfterResponseSent(
        Appointment $appointmentModel,
        string $notifyAppointmentId,
        array $notifyInput,
        string $notifyCreatorRole,
        ?callable $logAppointment = null,
    ): void {
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
            try {
                $appointmentModel->runPostCreateNotifications($notifyAppointmentId, $notifyInput, $notifyCreatorRole);
            } catch (Throwable $e) {
                error_log('runPostCreateNotifications failed: ' . $e->getMessage());
            }

            return;
        }

        if (PHP_SAPI === 'cli-server') {
            $bgScript = __DIR__ . '/../../scripts/cli-post-create-notifications.php';
            $tmpPath = tempnam(sys_get_temp_dir(), 'one-pcn-');
            $envelope = json_encode([
                'id' => $notifyAppointmentId,
                'input' => $notifyInput,
                'role' => $notifyCreatorRole,
            ], JSON_UNESCAPED_UNICODE);
            $spawned = false;
            if (is_string($bgScript) && is_file($bgScript) && $tmpPath !== false && $envelope !== false && @file_put_contents($tmpPath, $envelope) !== false) {
                $phpBin = defined('PHP_BINARY') ? PHP_BINARY : 'php';
                $phpExe = $phpBin !== '' && @is_executable($phpBin) ? $phpBin : 'php';
                $cmdLine = implode(' ', [
                    escapeshellarg($phpExe),
                    escapeshellarg($bgScript),
                    escapeshellarg($tmpPath),
                ]);
                try {
                    if (PHP_OS_FAMILY === 'Windows') {
                        pclose(popen('start /B "" ' . $cmdLine . ' 1>NUL 2>NUL', 'r'));
                    } else {
                        exec($cmdLine . ' > /dev/null 2>&1 &');
                    }
                    $spawned = true;
                    if ($logAppointment !== null) {
                        $logAppointment('cli-server: post-create notifications (sous-processus)', [
                            'appointment_id' => $notifyAppointmentId,
                        ]);
                    }
                } catch (Throwable $e) {
                    error_log('cli-server post-create spawn failed: ' . $e->getMessage());
                }
            }
            if (!$spawned) {
                if ($tmpPath !== false) {
                    @unlink($tmpPath);
                }
                if ($logAppointment !== null) {
                    $logAppointment('cli-server: fallback shutdown post-create (spawn échoué ou script absent)', [
                        'script_exists' => is_file($bgScript),
                    ]);
                }
                register_shutdown_function(static function () use ($appointmentModel, $notifyAppointmentId, $notifyInput, $notifyCreatorRole) {
                    try {
                        $appointmentModel->runPostCreateNotifications($notifyAppointmentId, $notifyInput, $notifyCreatorRole);
                    } catch (Throwable $e) {
                        error_log('runPostCreateNotifications failed (shutdown): ' . $e->getMessage());
                    }
                });
            }

            return;
        }

        register_shutdown_function(static function () use ($appointmentModel, $notifyAppointmentId, $notifyInput, $notifyCreatorRole) {
            try {
                $appointmentModel->runPostCreateNotifications($notifyAppointmentId, $notifyInput, $notifyCreatorRole);
            } catch (Throwable $e) {
                error_log('runPostCreateNotifications failed (shutdown): ' . $e->getMessage());
            }
        });
    }
}
