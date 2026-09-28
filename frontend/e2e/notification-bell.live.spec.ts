import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';

// Aucun mock : frontend → API PHP → MySQL (comptes créés par backend/scripts/e2e-live-seed.php).
const PASSWORD = 'E2e-Live-Cary-2026!';

const ACCOUNTS = [
  { role: 'patient', email: 'alice.patient@test.invalid', userId: '00000000-0000-4000-8000-00000000a001' },
  { role: 'lab', email: 'labo@test.invalid', userId: '00000000-0000-4000-8000-00000000c001' },
] as const;

function mysql(sql: string): string {
  return execFileSync(
    'docker',
    ['compose', '-f', '../docker-compose.e2e-live.yml', 'exec', '-T', 'mysql-e2e', 'mysql', '-uroot', '-N', '-B', 'oneandlab_test', '-e', sql],
    { encoding: 'utf8' },
  ).trim();
}

function insertNotification(userId: string, title: string): string {
  const id = randomUUID();
  mysql(
    `INSERT INTO notifications (id, user_id, type, title, message, data, created_at) VALUES ('${id}', '${userId}', 'system', '${title}', 'Notification e2e live', NULL, NOW())`,
  );
  return id;
}

async function login(page: Page, role: string, email: string) {
  await page.addInitScript(r => localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [r]: true })), role);
  await page.goto('/login?mode=password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

for (const account of ACCOUNTS) {
  test(`cloche ${account.role} : notification reçue par polling, affichée puis marquée lue`, async ({ page }) => {
    test.setTimeout(120_000);
    mysql(`DELETE FROM notifications WHERE user_id = '${account.userId}'`);
    await login(page, account.role, account.email);

    const bell = page.getByRole('button', { name: /^Notifications/ }).first();
    // Badge dashboard = non lues + offres en attente : on raisonne en delta après le chargement initial
    await expect(bell).toBeVisible();
    await page.waitForLoadState('networkidle');
    const badgeCount = async () => Number(/\((\d+)/.exec((await bell.getAttribute('aria-label')) ?? '')?.[1] ?? 0);
    const before = await badgeCount();
    const unreadBefore = Number(mysql(`SELECT COUNT(*) FROM notifications WHERE user_id = '${account.userId}' AND read_at IS NULL`));

    const title = `Bell live ${account.role} ${Date.now()}`;
    const notificationId = insertNotification(account.userId, title);

    // Arrivée sans rechargement : uniquement via le polling du layout
    await expect.poll(badgeCount, { timeout: 45_000 }).toBe(before + 1);

    await bell.click();
    await expect(page.getByText(title, { exact: true })).toBeVisible();

    await expect.poll(() => mysql(`SELECT read_at IS NOT NULL FROM notifications WHERE id = '${notificationId}'`), { timeout: 10_000 }).toBe('1');
    // Ouvrir le menu marque tout comme lu : il ne reste que les offres en attente
    expect(mysql(`SELECT COUNT(*) FROM notifications WHERE user_id = '${account.userId}' AND read_at IS NULL`)).toBe('0');
    await expect.poll(badgeCount).toBe(before - unreadBefore);
  });
}
