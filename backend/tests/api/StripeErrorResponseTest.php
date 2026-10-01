<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\CardException;
use Stripe\Exception\InvalidRequestException;

require_once __DIR__ . '/../../lib/StripeErrorResponse.php';

final class StripeErrorResponseTest extends TestCase
{
    private const STRIPE_DETAIL = 'No such customer: cus_SECRET123; a similar object exists in test mode';

    private string $logFile;
    private string|false $previousLog;

    protected function setUp(): void
    {
        $this->logFile = (string) tempnam(sys_get_temp_dir(), 'stripe-error-');
        $this->previousLog = ini_get('error_log');
        ini_set('error_log', $this->logFile);
    }

    protected function tearDown(): void
    {
        ini_set('error_log', $this->previousLog === false ? '' : $this->previousLog);
        http_response_code(200);
        if (is_file($this->logFile)) {
            unlink($this->logFile);
        }
    }

    /** @return array<string, mixed> */
    private function respond(ApiErrorException $e): array
    {
        ob_start();
        StripeErrorResponse::respond('checkout abonnement user=42', $e);

        return json_decode((string) ob_get_clean(), true, 512, JSON_THROW_ON_ERROR);
    }

    public function testProviderErrorIsGenericAndLogged(): void
    {
        $payload = $this->respond(InvalidRequestException::factory(self::STRIPE_DETAIL, 400));

        $this->assertSame(400, http_response_code());
        $this->assertSame([
            'success' => false,
            'error' => StripeErrorResponse::GENERIC_MESSAGE,
            'code' => 'PAYMENT_PROVIDER_ERROR',
        ], $payload);
        $log = (string) file_get_contents($this->logFile);
        $this->assertStringContainsString('checkout abonnement user=42', $log);
        $this->assertStringContainsString(self::STRIPE_DETAIL, $log);
    }

    /**
     * Le message Stripe (anglais) n'est plus renvoyé tel quel : le serveur choisit le texte français
     * selon le decline_code, et le detail Stripe reste dans les logs.
     */
    public function testCardDeclineGetsFrenchMessageFromDeclineCode(): void
    {
        $payload = $this->respond(CardException::factory('Your card has insufficient funds.', 402, null, null, null, 'card_declined', 'insufficient_funds'));

        $this->assertSame(400, http_response_code());
        $this->assertSame('Le solde de votre carte est insuffisant. Utilisez une autre carte.', $payload['error']);
        $this->assertSame('PAYMENT_DECLINED', $payload['code']);
        $log = (string) file_get_contents($this->logFile);
        $this->assertStringContainsString('decline_code=insufficient_funds', $log);
        $this->assertStringContainsString('Your card has insufficient funds.', $log);
    }

    /** @return iterable<string, array{?string, ?string, string}> */
    public static function declineProvider(): iterable
    {
        yield 'carte expirée (code Stripe sans decline_code)' => ['expired_card', null, 'Votre carte a expiré. Utilisez une autre carte.'];
        yield 'CVC incorrect' => ['incorrect_cvc', null, 'Le code de sécurité (CVC) est incorrect. Vérifiez-le et réessayez.'];
        yield 'fraude : message générique' => ['card_declined', 'fraudulent', StripeErrorResponse::DECLINED_MESSAGE];
        yield 'carte volée : message générique' => ['card_declined', 'stolen_card', StripeErrorResponse::DECLINED_MESSAGE];
        yield 'code inconnu' => ['card_declined', 'something_new', StripeErrorResponse::DECLINED_MESSAGE];
        yield 'aucun code' => [null, null, StripeErrorResponse::DECLINED_MESSAGE];
    }

    /** @dataProvider declineProvider */
    public function testCardDeclineMessageNeverLeaksStripeText(?string $stripeCode, ?string $declineCode, string $expected): void
    {
        $payload = $this->respond(CardException::factory('Stripe raw text', 402, null, null, null, $stripeCode, $declineCode));

        $this->assertSame($expected, $payload['error']);
        $this->assertSame('PAYMENT_DECLINED', $payload['code']);
        $this->assertStringNotContainsString('Stripe raw text', (string) json_encode($payload));
    }
}
