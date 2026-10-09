import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/test';
import { liveApiClient, liveLogin } from './helpers/live-session';

// Aucun mock : frontend → API PHP → MySQL. La stack live n'a pas de clé xAI : l'admin route les tâches
// vers le simulateur local, seul fournisseur autorisé sur une base `_test` sans clé.
// L'assistant conversationnel n'a pas d'écran web (application mobile) : le patient l'appelle par l'API
// réelle, l'admin constate le résultat dans /admin/ai.

type RoutingRow = { task_type: string; model: string | null; enabled: number | string | boolean };

test('Cary IA réelle : routage admin, conversation patient, urgence, refus labo et suivi admin', async ({ browser }) => {
  test.setTimeout(180_000);

  const admin = await browser.newPage();
  await liveLogin(admin, 'super_admin', 'admin@test.invalid');
  const adminApi = await liveApiClient(admin);
  const routing = await adminApi.get('/admin/ai/routing');
  expect(routing.status, JSON.stringify(routing.body)).toBe(200);
  for (const row of routing.body.data as RoutingRow[]) {
    const saved = await adminApi.patch('/admin/ai/routing', {
      task_type: row.task_type,
      provider: 'local',
      model: row.model,
      enabled: row.enabled === true || Number(row.enabled) === 1,
    });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
  }
  const refused = await adminApi.patch('/admin/ai/routing', { task_type: 'chat_simple', provider: 'openai' });
  expect(refused.status).toBe(400);
  expect(refused.body.code).toBe('VALIDATION_ERROR');

  const patient = await browser.newPage();
  await liveLogin(patient, 'patient', 'alice.patient@test.invalid');
  const patientApi = await liveApiClient(patient);
  const conversation = await patientApi.post('/ai/conversations', { custom_title: 'E2E live Cary' });
  expect(conversation.status, JSON.stringify(conversation.body)).toBe(201);
  const conversationId = conversation.body.data.id as string;

  const turn = { conversation_id: conversationId, message: 'Bonjour, que peux-tu faire ?', client_message_id: randomUUID() };
  const reply = await patientApi.post('/ai/chat', turn);
  expect(reply.status, JSON.stringify(reply.body)).toBe(200);
  const data = reply.body.data;
  expect(data.message.content.trim()).not.toBe('');
  expect(data.message.content).not.toContain('[ref:');
  expect(Array.isArray(data.message.sources)).toBe(true);
  expect(data.suggestions.length).toBeGreaterThanOrEqual(2);
  expect(data.suggestions.length).toBeLessThanOrEqual(3);
  expect(data.emergency).toBeNull();
  expect(data.deduplicated).toBe(false);
  expect(data.audit_id).toBeTruthy();

  const replay = await patientApi.post('/ai/chat', turn);
  expect(replay.status).toBe(200);
  expect(replay.body.data.deduplicated).toBe(true);
  expect(replay.body.data.message.id).toBe(data.message.id);

  const history = await patientApi.get(`/ai/conversations/${conversationId}?limit=50`);
  expect(history.status).toBe(200);
  const userTurns = (history.body.data.messages as Array<{ role: string; content: string }>).filter(m => m.role === 'user');
  expect(userTurns.map(m => m.content)).toEqual([turn.message]);

  const emergency = await patientApi.post('/ai/chat', {
    conversation_id: conversationId,
    message: "J'ai une grosse douleur dans la poitrine qui irradie dans le bras",
    client_message_id: randomUUID(),
  });
  expect(emergency.status).toBe(200);
  expect(emergency.body.data.emergency.kind).toBe('cardiac');
  expect((emergency.body.data.emergency.actions as Array<{ phone: string }>).map(a => a.phone)).toEqual(['15', '112']);

  const tooLong = await patientApi.post('/ai/chat', { ...turn, message: 'a'.repeat(4001), client_message_id: randomUUID() });
  expect(tooLong.status).toBe(400);
  expect(tooLong.body.code).toBe('AI_MESSAGE_TOO_LONG');
  await patient.close();

  const lab = await browser.newPage();
  await liveLogin(lab, 'lab', 'labo@test.invalid');
  const labChat = await (await liveApiClient(lab)).post('/ai/chat', { ...turn, client_message_id: randomUUID() });
  expect(labChat.status).toBe(403);
  expect(labChat.body.code).toBe('AI_ROLE_NOT_SUPPORTED');
  await lab.close();

  await admin.goto('/admin/ai');
  const chatRow = admin.getByRole('row').filter({ hasText: 'chat_simple' });
  await expect(chatRow).toContainText('Simulateur local (QA)');
  const requests = admin.getByText('Requêtes', { exact: true }).locator('xpath=following-sibling::p');
  await expect(requests).not.toHaveText('0');

  const patched = admin.waitForResponse(r => r.url().includes('/api/admin/ai/routing') && r.request().method() === 'PATCH');
  await chatRow.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  const patchedResponse = await patched;
  expect(patchedResponse.status()).toBe(200);
  expect(patchedResponse.request().postDataJSON().provider).toBe('local');
  await expect(admin.getByText('Configuration enregistrée', { exact: true })).toBeVisible();

  await admin.reload();
  await expect(admin.getByRole('row').filter({ hasText: 'chat_simple' })).toContainText('Simulateur local (QA)');
  await admin.close();
});
