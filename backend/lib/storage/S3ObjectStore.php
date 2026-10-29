<?php

declare(strict_types=1);

require_once __DIR__ . '/ObjectStore.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;

/**
 * Objets dans un bucket S3 (chiffrement serveur AES256). Les fichiers pas encore migrés restent lisibles
 * sur le disque ($fallback) ; une suppression vise le bucket et le disque.
 */
final class S3ObjectStore implements ObjectStore
{
    public function __construct(
        private readonly S3Client $client,
        private readonly string $bucket,
        private readonly ?ObjectStore $fallback = null,
    ) {
    }

    /** Identifiants : rôle IAM de l'instance EC2 (ou variables AWS_* en dehors d'EC2). */
    public static function client(string $region): S3Client
    {
        return new S3Client([
            'version' => '2006-03-01',
            'region' => $region,
            'retries' => 3,
            'http' => ['connect_timeout' => 5, 'timeout' => 60],
        ]);
    }

    public function put(string $key, string $bytes): void
    {
        $this->client->putObject([
            'Bucket' => $this->bucket,
            'Key' => $key,
            'Body' => $bytes,
            'ServerSideEncryption' => 'AES256',
            'ContentType' => 'application/octet-stream',
        ]);
    }

    public function get(string $key): ?string
    {
        try {
            $result = $this->client->getObject(['Bucket' => $this->bucket, 'Key' => $key]);

            return (string) $result['Body'];
        } catch (S3Exception $e) {
            if (!self::isNotFound($e)) {
                throw $e;
            }
        }

        return $this->fallback?->get($key);
    }

    public function exists(string $key): bool
    {
        if ($this->client->doesObjectExistV2($this->bucket, $key)) {
            return true;
        }

        return $this->fallback?->exists($key) ?? false;
    }

    public function delete(string $key): bool
    {
        $this->client->deleteObject(['Bucket' => $this->bucket, 'Key' => $key]);

        return $this->fallback?->delete($key) ?? true;
    }

    private static function isNotFound(S3Exception $e): bool
    {
        return in_array($e->getAwsErrorCode(), ['NoSuchKey', 'NotFound'], true) || $e->getStatusCode() === 404;
    }
}
