import { execSync } from 'node:child_process';

export default function teardown() {
  execSync('docker compose -f ../docker-compose.e2e-live.yml down -v', { stdio: 'inherit' });
}
