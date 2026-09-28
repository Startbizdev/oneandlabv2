import type { Page } from '@playwright/test';

/** Playwright route glob anchored on localhost (not 127.0.0.1). */
export function apiRoutePattern(): string {
  return new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href;
}

export function normalizeApiPathname(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/$/, '') || '/';
  } catch {
    return '';
  }
}

/** Navigate then wait until a matching API response finishes (network sync, not arbitrary sleep). */
export async function gotoWaitingForApi(
  page: Page,
  path: string,
  match: (pathname: string, method: string) => boolean,
  timeout = 30_000,
) {
  const responseWait = page.waitForResponse(
    (r) => match(normalizeApiPathname(r.url()), r.request().method()),
    { timeout },
  );
  await page.goto(path);
  await responseWait;
}
