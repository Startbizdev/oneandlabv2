<?php

final class ProfessionalAppointmentLinks
{
    public static function listPath(string $role): string
    {
        return match ($role) {
            'nurse', 'lab', 'subaccount', 'pro', 'preleveur' => '/' . $role . '/appointments',
            default => '/login',
        };
    }

    public static function detailPath(string $role, string $appointmentId): string
    {
        $list = self::listPath($role);
        return $appointmentId !== '' && $list !== '/login' ? $list . '/' . rawurlencode($appointmentId) : $list;
    }

    public static function requestPath(string $role, string $appointmentId): string
    {
        if ($role === 'preleveur' || $role === 'pro') {
            return self::detailPath($role, $appointmentId);
        }
        $list = $role === 'nurse' ? '/nurse/demandes' : self::listPath($role);
        return $appointmentId !== '' && $list !== '/login' ? $list . '?openAppointment=' . rawurlencode($appointmentId) : $list;
    }
}
