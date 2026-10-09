<?php

declare(strict_types=1);

use Firebase\JWT\JWT;

/**
 * Serveur PHP intégré sur le routeur `backend/index.php`, partagé par les tests HTTP Cary d'un même processus.
 * Plusieurs workers pour permettre les requêtes concurrentes (confirmation de brouillon).
 */
final class AiHttpHarness
{
    /** @var resource|null */
    private static $process = null;
    private static ?string $baseUrl = null;

    public static function baseUrl(): string
    {
        if (self::$baseUrl !== null) {
            return self::$baseUrl;
        }
        $port = self::freePort();
        $env = getenv();
        $env['PHP_CLI_SERVER_WORKERS'] = '4';
        $env['XAI_API_KEY'] = '';
        $log = sys_get_temp_dir() . '/cary-ai-http-' . $port . '.log';
        $process = proc_open(
            [PHP_BINARY, '-S', '127.0.0.1:' . $port, 'index.php'],
            [0 => ['pipe', 'r'], 1 => ['file', $log, 'a'], 2 => ['file', $log, 'a']],
            $pipes,
            dirname(__DIR__, 3),
            $env,
        );
        if (!is_resource($process)) {
            throw new RuntimeException('Serveur HTTP de test indisponible');
        }
        fclose($pipes[0]);
        self::$process = $process;
        register_shutdown_function(static function (): void {
            if (is_resource(self::$process)) {
                proc_terminate(self::$process);
            }
        });

        $deadline = microtime(true) + 10;
        while (microtime(true) < $deadline) {
            $socket = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
            if ($socket !== false) {
                fclose($socket);
                self::$baseUrl = 'http://127.0.0.1:' . $port;

                return self::$baseUrl;
            }
            usleep(100_000);
        }
        throw new RuntimeException('Serveur HTTP de test non démarré : ' . (string) @file_get_contents($log));
    }

    public static function token(string $userId, string $role): string
    {
        $secret = (string) getenv('JWT_SECRET');
        if ($secret === '') {
            throw new RuntimeException('JWT_SECRET requis pour les tests HTTP');
        }

        return JWT::encode(['user_id' => $userId, 'role' => $role, 'iat' => time(), 'exp' => time() + 3600], $secret, 'HS256');
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array{status: int, headers: array<string, string>, raw: string, json: array<string, mixed>|null}
     */
    public static function request(string $method, string $path, ?string $token = null, ?array $body = null): array
    {
        $ch = self::handle($method, $path, $token, $body);
        $headers = [];
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, static function ($curl, string $line) use (&$headers): int {
            $parts = explode(':', $line, 2);
            if (count($parts) === 2) {
                $headers[strtolower(trim($parts[0]))] = trim($parts[1]);
            }

            return strlen($line);
        });
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $raw = is_string($raw) ? $raw : '';
        $json = json_decode($raw, true);

        return ['status' => $status, 'headers' => $headers, 'raw' => $raw, 'json' => is_array($json) ? $json : null];
    }

    /**
     * Requêtes envoyées en parallèle (curl_multi).
     *
     * @param list<array{method: string, path: string, token: ?string, body: ?array<string, mixed>}> $requests
     * @return list<array{status: int, json: array<string, mixed>|null, raw: string}>
     */
    public static function parallel(array $requests): array
    {
        $multi = curl_multi_init();
        $handles = [];
        foreach ($requests as $req) {
            $ch = self::handle($req['method'], $req['path'], $req['token'], $req['body']);
            curl_multi_add_handle($multi, $ch);
            $handles[] = $ch;
        }
        do {
            $status = curl_multi_exec($multi, $running);
            if ($running > 0) {
                curl_multi_select($multi, 1.0);
            }
        } while ($running > 0 && $status === CURLM_OK);

        $results = [];
        foreach ($handles as $ch) {
            $raw = (string) curl_multi_getcontent($ch);
            $json = json_decode($raw, true);
            $results[] = ['status' => (int) curl_getinfo($ch, CURLINFO_HTTP_CODE), 'json' => is_array($json) ? $json : null, 'raw' => $raw];
            curl_multi_remove_handle($multi, $ch);
            curl_close($ch);
        }
        curl_multi_close($multi);

        return $results;
    }

    /**
     * @param array<string, mixed> $body
     * @return array{status: int, events: list<array{event: string, data: mixed}>, raw: string}
     */
    public static function stream(string $token, array $body): array
    {
        $response = self::request('POST', '/api/ai/chat/stream', $token, $body);
        $events = [];
        foreach (preg_split("/\n\n/", $response['raw']) ?: [] as $block) {
            if (preg_match('/^event: (\S+)\ndata: (.*)$/s', trim($block), $m)) {
                $events[] = ['event' => $m[1], 'data' => json_decode($m[2], true)];
            }
        }

        return ['status' => $response['status'], 'events' => $events, 'raw' => $response['raw']];
    }

    /**
     * @param array<string, mixed>|null $body
     * @return CurlHandle
     */
    private static function handle(string $method, string $path, ?string $token, ?array $body)
    {
        $ch = curl_init(self::baseUrl() . $path);
        if ($ch === false) {
            throw new RuntimeException('curl_init');
        }
        $headers = ['Content-Type: application/json', 'X-Client-Platform: mobile'];
        if ($token !== null) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 60,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        }

        return $ch;
    }

    private static function freePort(): int
    {
        $socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
        if ($socket === false) {
            throw new RuntimeException('Port libre introuvable : ' . $errstr);
        }
        $name = (string) stream_socket_get_name($socket, false);
        fclose($socket);

        return (int) substr($name, strrpos($name, ':') + 1);
    }
}
