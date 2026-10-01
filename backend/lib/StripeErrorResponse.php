<?php

declare(strict_types=1);

require_once __DIR__ . '/ApiServerError.php';

/**
 * Réponse 400 pour une erreur de l'API Stripe. Un refus de carte reçoit un message français
 * choisi côté serveur selon le decline_code ; le message Stripe (anglais, parfois technique)
 * ne sort jamais des logs.
 */
final class StripeErrorResponse
{
    public const GENERIC_MESSAGE = 'Le service de paiement est momentanément indisponible. Réessayez plus tard.';
    public const DECLINED_MESSAGE = 'Votre carte a été refusée. Contactez votre banque ou utilisez une autre carte.';

    /** Les refus liés à une suspicion de fraude ou de perte gardent le message générique. */
    private const DECLINE_MESSAGES = [
        'insufficient_funds' => 'Le solde de votre carte est insuffisant. Utilisez une autre carte.',
        'expired_card' => 'Votre carte a expiré. Utilisez une autre carte.',
        'incorrect_cvc' => 'Le code de sécurité (CVC) est incorrect. Vérifiez-le et réessayez.',
        'invalid_cvc' => 'Le code de sécurité (CVC) est incorrect. Vérifiez-le et réessayez.',
        'incorrect_number' => 'Le numéro de carte est incorrect. Vérifiez-le et réessayez.',
        'invalid_number' => 'Le numéro de carte est incorrect. Vérifiez-le et réessayez.',
        'invalid_expiry_month' => 'La date d\'expiration de la carte est invalide.',
        'invalid_expiry_year' => 'La date d\'expiration de la carte est invalide.',
        'card_velocity_exceeded' => 'Le plafond de votre carte est atteint. Contactez votre banque ou utilisez une autre carte.',
        'withdrawal_count_limit_exceeded' => 'Le plafond de votre carte est atteint. Contactez votre banque ou utilisez une autre carte.',
        'authentication_required' => 'Votre banque demande une authentification. Réessayez et validez le paiement auprès de votre banque.',
        'card_not_supported' => 'Cette carte ne permet pas ce paiement. Utilisez une autre carte.',
        'currency_not_supported' => 'Cette carte ne permet pas ce paiement. Utilisez une autre carte.',
        'processing_error' => 'Une erreur est survenue pendant le traitement de la carte. Réessayez.',
        'issuer_not_available' => 'Votre banque est momentanément injoignable. Réessayez dans quelques minutes.',
        'try_again_later' => 'Votre banque est momentanément injoignable. Réessayez dans quelques minutes.',
    ];

    public static function respond(string $context, \Stripe\Exception\ApiErrorException $e): void
    {
        $isCardDecline = $e instanceof \Stripe\Exception\CardException;
        $declineCode = $isCardDecline ? self::declineCode($e) : '';
        ApiServerError::log($isCardDecline ? $context . ' decline_code=' . ($declineCode !== '' ? $declineCode : 'none') : $context, $e);

        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $isCardDecline ? self::declineMessage($declineCode) : self::GENERIC_MESSAGE,
            'code' => $isCardDecline ? 'PAYMENT_DECLINED' : 'PAYMENT_PROVIDER_ERROR',
        ]);
    }

    public static function declineMessage(string $declineCode): string
    {
        return self::DECLINE_MESSAGES[$declineCode] ?? self::DECLINED_MESSAGE;
    }

    /** decline_code de l'émetteur, sinon code Stripe (expired_card, incorrect_cvc… n'ont pas toujours de decline_code). */
    private static function declineCode(\Stripe\Exception\CardException $e): string
    {
        $code = trim((string) ($e->getDeclineCode() ?? ''));
        if ($code === '' || $code === 'generic_decline') {
            $stripeCode = trim((string) ($e->getStripeCode() ?? ''));
            if ($stripeCode !== '' && $stripeCode !== 'card_declined') {
                return $stripeCode;
            }
        }

        return $code;
    }
}
