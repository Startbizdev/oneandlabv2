<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/QrCodeService.php';
require_once __DIR__ . '/../../lib/QrPosterRenderer.php';

final class QrCodeServiceTest extends TestCase
{
    public function testEligibleRoles(): void
    {
        $this->assertTrue(QrCodeService::isEligibleRole('nurse'));
        $this->assertTrue(QrCodeService::isEligibleRole('lab'));
        $this->assertTrue(QrCodeService::isEligibleRole('subaccount'));
        $this->assertTrue(QrCodeService::isEligibleRole('pro'));
        $this->assertFalse(QrCodeService::isEligibleRole('patient'));
        $this->assertFalse(QrCodeService::isEligibleRole('preleveur'));
    }

    public function testBuildRedirectUrlContainsProviderParams(): void
    {
        $service = new QrCodeService();
        $profileId = '00000000-0000-4000-8000-000000000001';
        $url = $service->buildRedirectUrl($profileId, 'pro');
        $this->assertStringContainsString('provider_id=' . rawurlencode($profileId), $url);
        $this->assertStringContainsString('provider_type=pro', $url);
        $this->assertStringContainsString('/rendez-vous/nouveau', $url);
    }

    public function testBuildRedirectUrlMapsSubaccountToLab(): void
    {
        $service = new QrCodeService();
        $url = $service->buildRedirectUrl('00000000-0000-4000-8000-000000000002', 'subaccount');
        $this->assertStringContainsString('provider_type=lab', $url);
        $this->assertStringNotContainsString('provider_type=subaccount', $url);
    }

    public function testPosterRendererRawQrProducesPng(): void
    {
        if (!extension_loaded('gd')) {
            $this->markTestSkipped('GD extension required');
        }
        $renderer = new QrPosterRenderer();
        $png = $renderer->renderRawQrPng('https://cary.bio/qr/testtoken', 200);
        $this->assertNotEmpty($png);
        $this->assertStringStartsWith("\x89PNG", $png);
    }

    public function testPosterDimensionsForFormats(): void
    {
        $story = QrPosterRenderer::dimensionsForFormat('story');
        $this->assertSame(1080, $story['width']);
        $this->assertSame(1350, $story['height']);

        $a4 = QrPosterRenderer::dimensionsForFormat('a4');
        $this->assertSame(1240, $a4['width']);
        $this->assertSame(1754, $a4['height']);

        $print = QrPosterRenderer::dimensionsForFormat('print');
        $this->assertSame(1240, $print['width']);
        $this->assertSame(1754, $print['height']);

        $this->assertSame('a4', QrPosterRenderer::normalizeFormat('print'));

        $square = QrPosterRenderer::dimensionsForFormat('square');
        $this->assertSame(1080, $square['width']);
        $this->assertSame(1080, $square['height']);
    }

    public function testBrandedPosterProducesPng(): void
    {
        if (!extension_loaded('gd')) {
            $this->markTestSkipped('GD extension required');
        }
        $renderer = new QrPosterRenderer();
        $png = $renderer->renderBrandedPoster(
            [
                'scan_url' => 'https://cary.fr/qr/abc12345',
                'token' => 'abc12345',
                'effective_tagline' => 'Scannez pour réserver avec Dr Test.',
            ],
            ['display_name' => 'Dr Test', 'profile_image_url' => null],
            'story',
        );
        $this->assertNotEmpty($png);
        $this->assertStringStartsWith("\x89PNG", $png);
        $this->assertGreaterThan(5000, strlen($png));
    }
}
