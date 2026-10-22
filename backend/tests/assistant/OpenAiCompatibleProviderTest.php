<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/assistant/OpenAiCompatibleProvider.php';

/** Fournisseur OpenAI-compatible contre un faux serveur SSE local (aucun appel réseau externe). */
final class OpenAiCompatibleProviderTest extends TestCase
{
    /** @var resource|null */
    private static $process = null;
    private static string $base = '';

    public static function setUpBeforeClass(): void
    {
        $socket = stream_socket_server('tcp://127.0.0.1:0');
        $name = (string) stream_socket_get_name($socket, false);
        fclose($socket);
        $port = (int) substr($name, strrpos($name, ':') + 1);
        self::$process = proc_open([PHP_BINARY, '-S', '127.0.0.1:' . $port, __DIR__ . '/support/fake-llm.php'], [0 => ['pipe', 'r'], 1 => ['file', '/dev/null', 'a'], 2 => ['file', '/dev/null', 'a']], $pipes);
        self::$base = 'http://127.0.0.1:' . $port;
        for ($i = 0; $i < 50 && @fsockopen('127.0.0.1', $port) === false; $i++) {
            usleep(100_000);
        }
    }

    public static function tearDownAfterClass(): void
    {
        if (is_resource(self::$process)) {
            proc_terminate(self::$process);
        }
    }

    public function testStreamsTextAndAccumulatesToolCallDeltas(): void
    {
        $provider = new OpenAiCompatibleProvider(self::$base . '/ok', 'test-key', 'text-model', 'vision-model');
        $deltas = [];
        $started = [];
        $result = $provider->stream(
            [['role' => 'user', 'content' => 'Bonjour']],
            [['type' => 'function', 'function' => ['name' => 'get_my_appointments', 'parameters' => ['type' => 'object']]]],
            function (string $text) use (&$deltas): void {
                $deltas[] = $text;
            },
            function (string $name) use (&$started): void {
                $started[] = $name;
            },
        );
        $this->assertSame(['Bon', 'jour'], $deltas);
        $this->assertSame(['get_my_appointments'], $started);
        $this->assertSame('Bonjour', $result['content']);
        $this->assertSame([['id' => 'call_1', 'name' => 'get_my_appointments', 'arguments' => ['period' => 'past']]], $result['tool_calls']);
        $this->assertSame('text-model', $result['model']);
        $this->assertSame(42, $result['input_tokens']);
        $this->assertSame(7, $result['output_tokens']);
    }

    public function testImageMessagesUseTheVisionModel(): void
    {
        $provider = new OpenAiCompatibleProvider(self::$base . '/ok', 'test-key', 'text-model', 'vision-model');
        $result = $provider->stream([['role' => 'user', 'content' => [
            ['type' => 'text', 'text' => 'Que dit cette ordonnance ?'],
            ['type' => 'image_url', 'image_url' => ['url' => 'data:image/png;base64,AAAA']],
        ]]], [], static function (): void {
        }, static function (): void {
        });
        $this->assertSame('vision-model', $result['model']);
        $this->assertSame([], $result['tool_calls']);
    }

    public function testProviderErrorIsUnavailableWithoutLeakingDetails(): void
    {
        $provider = new OpenAiCompatibleProvider(self::$base . '/error', 'test-key', 'm', 'm');
        try {
            $provider->stream([['role' => 'user', 'content' => 'x']], [], static function (): void {
            }, static function (): void {
            });
            $this->fail('Erreur attendue');
        } catch (AssistantError $e) {
            $this->assertSame(503, $e->httpStatus);
            $this->assertSame('ASSISTANT_UNAVAILABLE', $e->errorCode);
            $this->assertStringNotContainsString('boom', $e->getMessage());
        }
    }

    public function testMissingKeyIsUnavailable(): void
    {
        $this->expectException(AssistantError::class);
        $this->expectExceptionMessage(AssistantError::UNAVAILABLE_MESSAGE);
        new OpenAiCompatibleProvider(self::$base, '', 'm', 'm');
    }
}
