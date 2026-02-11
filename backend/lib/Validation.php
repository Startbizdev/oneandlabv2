<?php

/**
 * Classe de validation des données
 */

class Validation
{
    /**
     * Valide un email
     */
    public static function email(string $email): bool
    {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    /**
     * Valide un téléphone français
     */
    public static function phone(string $phone): bool
    {
        // Supprime les espaces, tirets, points
        $cleaned = preg_replace('/[\s\-\.]/', '', $phone);
        // Vérifie le format (10 chiffres, optionnellement avec +33)
        return preg_match('/^(\+33|0)[1-9]\d{8}$/', $cleaned) === 1;
    }

    /**
     * Valide une date
     */
    public static function date(string $date, string $format = 'Y-m-d'): bool
    {
        $d = DateTime::createFromFormat($format, $date);
        return $d && $d->format($format) === $date;
    }

    /**
     * Valide une date/heure
     */
    public static function datetime(string $datetime, string $format = 'Y-m-d H:i:s'): bool
    {
        $d = DateTime::createFromFormat($format, $datetime);
        return $d && $d->format($format) === $datetime;
    }

    /**
     * Valide une latitude
     */
    public static function latitude(float $lat): bool
    {
        return $lat >= -90 && $lat <= 90;
    }

    /**
     * Valide une longitude
     */
    public static function longitude(float $lng): bool
    {
        return $lng >= -180 && $lng <= 180;
    }

    /**
     * Valide un UUID
     */
    public static function uuid(string $uuid): bool
    {
        return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $uuid) === 1;
    }

    /**
     * Valide un rôle
     */
    public static function role(string $role): bool
    {
        $validRoles = [
            'super_admin',
            'lab',
            'subaccount',
            'preleveur',
            'nurse',
            'pro',
            'patient',
        ];
        
        return in_array($role, $validRoles, true);
    }

    /**
     * Valide un statut de rendez-vous
     */
    public static function appointmentStatus(string $status): bool
    {
        $validStatuses = [
            'pending',
            'confirmed',
            'inProgress',
            'completed',
            'canceled',
            'expired',
            'refused',
        ];
        
        return in_array($status, $validStatuses, true);
    }

    /**
     * Valide un type de rendez-vous
     */
    public static function appointmentType(string $type): bool
    {
        return in_array($type, ['blood_test', 'nursing'], true);
    }

    /**
     * Valide une note d'avis (1-5)
     */
    public static function rating(int $rating): bool
    {
        return $rating >= 1 && $rating <= 5;
    }

    /**
     * Valide un code OTP (6 chiffres)
     */
    public static function otp(string $otp): bool
    {
        return preg_match('/^\d{6}$/', $otp) === 1;
    }

    /**
     * Valide une taille de fichier (en bytes)
     */
    public static function fileSize(int $size, int $maxSize): bool
    {
        return $size > 0 && $size <= $maxSize;
    }

    /**
     * Valide un type MIME de fichier
     */
    public static function mimeType(string $mimeType, array $allowedTypes): bool
    {
        return in_array($mimeType, $allowedTypes, true);
    }
}




