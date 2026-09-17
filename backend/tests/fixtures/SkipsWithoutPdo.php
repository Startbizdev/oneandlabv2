<?php

declare(strict_types=1);

trait SkipsWithoutPdo
{
    protected function requirePdo(): void
    {
        if (!extension_loaded('pdo_mysql')) {
            $this->markTestSkipped('Extension pdo_mysql requise pour ce test');
        }
    }
}
