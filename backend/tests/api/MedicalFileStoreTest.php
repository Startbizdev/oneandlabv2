<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/MedicalDocumentsInternal.php';
require_once __DIR__ . '/../../lib/storage/S3ObjectStore.php';

use Aws\Command;
use Aws\CommandInterface;
use Aws\MockHandler;
use Aws\Result;
use Aws\S3\Exception\S3Exception;
use Aws\S3\S3Client;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;

/** Stockage des fichiers chiffrés des documents : disque local, S3, et lecture des fichiers pas encore migrés. */
final class MedicalFileStoreTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        $this->root = sys_get_temp_dir() . '/cary-files-' . bin2hex(random_bytes(6));
        mkdir($this->root);
    }

    protected function tearDown(): void
    {
        MedicalFileStore::useStore(null);
        exec('rm -rf ' . escapeshellarg($this->root));
    }

    public function testLocalStoreWritesReadsAndDeletesUnderTheDocumentPath(): void
    {
        MedicalFileStore::useStore(new LocalObjectStore($this->root));
        $path = MedicalDocumentsInternal::storeBytes('doc1', 'ordonnance.pdf', "\x00chiffré");

        $this->assertSame('/uploads/medical/doc1/ordonnance.pdf.encrypted', $path);
        $this->assertFileExists($this->root . '/uploads/medical/doc1/ordonnance.pdf.encrypted');
        $this->assertSame("\x00chiffré", MedicalDocumentsInternal::readStoredFile($path));

        $this->assertTrue(MedicalDocumentsInternal::deleteStoredFile($path));
        $this->assertNull(MedicalDocumentsInternal::readStoredFile($path));
        $this->assertDirectoryDoesNotExist($this->root . '/uploads/medical/doc1', 'Le dossier vide du document est retiré');
        $this->assertTrue(MedicalDocumentsInternal::deleteStoredFile($path), 'Supprimer un fichier absent réussit');
    }

    public function testPathsOutsideMedicalUploadsAreRefused(): void
    {
        MedicalFileStore::useStore(new LocalObjectStore($this->root));
        foreach (['/uploads/medical/../../.env', '/etc/passwd', '/uploads/medical/a/b/c.encrypted', '/uploads/rate-limit/x/y'] as $path) {
            $this->assertNull(MedicalDocumentsInternal::readStoredFile($path), $path);
            $this->assertFalse(MedicalDocumentsInternal::deleteStoredFile($path), $path);
        }
    }

    public function testS3StoreUsesTheBucketAndFallsBackToDiskForFilesNotYetMigrated(): void
    {
        $local = new LocalObjectStore($this->root);
        $local->put('uploads/medical/old/scan.jpg.encrypted', 'ancien');

        $calls = [];
        $mock = new MockHandler();
        $notFound = static fn (CommandInterface $cmd) => new S3Exception('absent', $cmd, ['code' => 'NoSuchKey', 'response' => new Response(404)]);
        $mock->append(
            new Result([]),                                   // putObject new
            new Result(['Body' => 'nouveau']),               // getObject new
            $notFound,                                        // getObject old → disque
            new Result([]),                                   // deleteObject old
        );
        $client = new S3Client([
            'version' => '2006-03-01',
            'region' => 'eu-west-3',
            'credentials' => ['key' => 'test', 'secret' => 'test'],
            'handler' => static function (CommandInterface $cmd, $request) use ($mock, &$calls) {
                $calls[] = [$cmd->getName(), $cmd['Bucket'], $cmd['Key'], $cmd['ServerSideEncryption'] ?? null];

                return $mock($cmd, $request);
            },
        ]);
        MedicalFileStore::useStore(new S3ObjectStore($client, 'cary-files', $local));

        $path = MedicalDocumentsInternal::storeBytes('new', 'photo.jpg', 'nouveau');
        $this->assertFileDoesNotExist($this->root . '/uploads/medical/new/photo.jpg.encrypted', 'En mode S3, rien n\'est écrit sur le disque');
        $this->assertSame('nouveau', MedicalDocumentsInternal::readStoredFile($path));
        $this->assertSame('ancien', MedicalDocumentsInternal::readStoredFile('/uploads/medical/old/scan.jpg.encrypted'));
        $this->assertTrue(MedicalDocumentsInternal::deleteStoredFile('/uploads/medical/old/scan.jpg.encrypted'));
        $this->assertNull($local->get('uploads/medical/old/scan.jpg.encrypted'), 'La suppression vise aussi le disque');

        $this->assertSame([
            ['PutObject', 'cary-files', 'uploads/medical/new/photo.jpg.encrypted', 'AES256'],
            ['GetObject', 'cary-files', 'uploads/medical/new/photo.jpg.encrypted', null],
            ['GetObject', 'cary-files', 'uploads/medical/old/scan.jpg.encrypted', null],
            ['DeleteObject', 'cary-files', 'uploads/medical/old/scan.jpg.encrypted', null],
        ], $calls);
    }

    public function testS3ErrorsOtherThanNotFoundAreNotHiddenByTheDiskFallback(): void
    {
        $local = new LocalObjectStore($this->root);
        $local->put('uploads/medical/doc/a.encrypted', 'disque');
        $mock = new MockHandler([
            static fn (CommandInterface $cmd) => new S3Exception('refusé', $cmd, ['code' => 'AccessDenied', 'response' => new Response(403)]),
        ]);
        $client = new S3Client([
            'version' => '2006-03-01',
            'region' => 'eu-west-3',
            'credentials' => ['key' => 'test', 'secret' => 'test'],
            'handler' => $mock,
        ]);
        MedicalFileStore::useStore(new S3ObjectStore($client, 'cary-files', $local));

        $this->expectException(S3Exception::class);
        MedicalFileStore::get('/uploads/medical/doc/a.encrypted');
    }
}
