<?php

declare(strict_types=1);

require_once __DIR__ . '/PharmacyOrderAccess.php';

/**
 * Fil de conversation commande pharmacie.
 */
final class PharmacyOrderConversation
{
    public static function newUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    public static function canAccess(array $user, array $order): bool
    {
        return PharmacyOrderAccess::canView($user, $order);
    }

    public static function canPost(array $user, array $order): bool
    {
        return PharmacyOrderAccess::canPostMessage($user, $order);
    }
}
