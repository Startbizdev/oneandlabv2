<?php

declare(strict_types=1);

final class TourStopAvatar
{
    /**
     * Photo d'un passage de tournée : un lien seulement. Les photos stockées en base64 (jusqu'à
     * plusieurs centaines de Ko chacune) alourdissaient la tournée jusqu'à 2 Mo par jour ;
     * l'app affiche alors l'avatar par défaut.
     */
    public static function url(mixed $raw): ?string
    {
        if (!is_string($raw) || $raw === '' || str_starts_with($raw, 'data:')) {
            return null;
        }

        return $raw;
    }
}
