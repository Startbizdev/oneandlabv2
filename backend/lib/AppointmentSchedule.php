<?php

declare(strict_types=1);

final class AppointmentSchedule
{
    /** Database values represent the appointment's clock time in France. */
    public static function forStorage(string $value): string
    {
        $value = trim($value);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[zZ]|[+-]\d{2}:?\d{2})?$/', $value)) {
            throw new InvalidArgumentException('Format de date invalide.');
        }
        $paris = new DateTimeZone('Europe/Paris');
        try {
            $date = new DateTimeImmutable($value, $paris);
            $errors = DateTimeImmutable::getLastErrors();
            if ($errors && ($errors['warning_count'] || $errors['error_count'])) throw new InvalidArgumentException('Date invalide.');
            return $date->setTimezone($paris)->format('Y-m-d H:i:s');
        } catch (Exception $error) {
            throw new InvalidArgumentException('Date de rendez-vous invalide.', 0, $error);
        }
    }
}
