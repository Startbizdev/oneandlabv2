<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../lib/nurse-tour/TourStopAvatar.php';

final class TourStopAvatarTest extends TestCase
{
    public function testKeepsLinks(): void
    {
        $this->assertSame('https://cary.bio/uploads/a.jpg', TourStopAvatar::url('https://cary.bio/uploads/a.jpg'));
    }

    public function testDropsInlineBase64AndEmpty(): void
    {
        $this->assertNull(TourStopAvatar::url('data:image/jpeg;base64,' . str_repeat('A', 1000)));
        $this->assertNull(TourStopAvatar::url(''));
        $this->assertNull(TourStopAvatar::url(null));
    }
}
