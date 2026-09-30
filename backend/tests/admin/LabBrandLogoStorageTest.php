<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/LabBrandLogoStorage.php';

use PHPUnit\Framework\TestCase;

/**
 * Logo de marque déposé par l'admin : formats sûrs, taille bornée, URL absolue servie par logo.php.
 */
final class LabBrandLogoStorageTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = sys_get_temp_dir() . '/lab-brand-logo-' . bin2hex(random_bytes(4));
        mkdir($this->root);
    }

    protected function tearDown(): void
    {
        foreach (glob(LabBrandLogoStorage::uploadDir($this->root) . '/*') ?: [] as $file) {
            unlink($file);
        }
        @rmdir(LabBrandLogoStorage::uploadDir($this->root));
        @rmdir(dirname(LabBrandLogoStorage::uploadDir($this->root)));
        foreach (glob($this->root . '/*') ?: [] as $file) {
            is_file($file) && unlink($file);
        }
        @rmdir($this->root);
        parent::tearDown();
    }

    public function testPngIsStoredWithAPublicUrlThatLogoEndpointAccepts(): void
    {
        $tmp = $this->root . '/upload.tmp';
        file_put_contents($tmp, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='));

        $url = LabBrandLogoStorage::store($this->root, 'https://cary.bio/', ['tmp_name' => $tmp, 'size' => filesize($tmp), 'error' => UPLOAD_ERR_OK], 'rename');

        $this->assertMatchesRegularExpression('#^https://cary\.bio/api/public/lab-brands/logo\?name=brand-[a-f0-9]{16}\.png$#', $url);
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertMatchesRegularExpression('/^[a-z0-9-]+\.(jpe?g|png|webp|gif|svg)$/i', $query['name']);
        $this->assertFileExists(LabBrandLogoStorage::uploadDir($this->root) . '/' . $query['name']);
    }

    public function testNonImageAndOversizedFilesAreRejected(): void
    {
        $tmp = $this->root . '/upload.tmp';
        file_put_contents($tmp, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
        try {
            LabBrandLogoStorage::store($this->root, 'https://cary.bio', ['tmp_name' => $tmp, 'size' => filesize($tmp), 'error' => UPLOAD_ERR_OK], 'rename');
            $this->fail('SVG accepté');
        } catch (InvalidArgumentException $e) {
            $this->assertSame('Formats acceptés : PNG, JPEG ou WebP.', $e->getMessage());
        }

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Image trop volumineuse (2 Mo maximum).');
        LabBrandLogoStorage::store($this->root, 'https://cary.bio', ['tmp_name' => $tmp, 'size' => LabBrandLogoStorage::MAX_BYTES + 1, 'error' => UPLOAD_ERR_OK], 'rename');
    }
}
