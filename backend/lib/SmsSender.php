<?php

/**
 * Factory SMS : Brevo en priorité, Twilio en repli.
 */

require_once __DIR__ . '/AbstractSmsProvider.php';
require_once __DIR__ . '/BrevoSms.php';
require_once __DIR__ . '/Twilio.php';

final class SmsSender
{
    public static function resolveBrevoApiKey(): ?string
    {
        return BrevoSms::resolveApiKey();
    }

    public static function tryCreate(): ?AbstractSmsProvider
    {
        if (self::resolveBrevoApiKey() !== null) {
            try {
                return new BrevoSms();
            } catch (Throwable $e) {
                error_log('SmsSender: Brevo indisponible — ' . $e->getMessage());
            }
        }

        try {
            return new Twilio();
        } catch (Throwable $e) {
            return null;
        }
    }

    public static function activeProviderLabel(): string
    {
        if (self::resolveBrevoApiKey() !== null) {
            return 'brevo';
        }

        return 'twilio';
    }
}
