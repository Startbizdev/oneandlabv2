#!/usr/bin/env node
'use strict';

const assert = require('assert');

function stripBookingArtifacts(text) {
  return text
    .replace(/```booking_patch\s*\n?[\s\S]*?```/gi, '')
    .replace(/```json\s*\n?[\s\S]*?```/gi, '')
    .replace(/```\s*\n?[\s\S]*?```/g, (block) => {
      const inner = block.replace(/```/g, '').trim();
      if (/^[\s{[]/.test(inner) && /"category_id"|"booking_step"|"selected_services"/.test(inner)) {
        return '';
      }
      return block;
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function resolveAssistantMessageText(serverContent, assembledStream) {
  const fromServer = (serverContent ?? '').trim();
  const fromStream = stripBookingArtifacts(assembledStream);
  const text = fromServer || fromStream;
  return text || "Je n'ai pas bien compris. Pouvez-vous reformuler ?";
}

assert.strictEqual(
  resolveAssistantMessageText('', ''),
  "Je n'ai pas bien compris. Pouvez-vous reformuler ?",
);

assert.strictEqual(
  resolveAssistantMessageText('Réponse propre', '```booking_patch\n{"category_id":"x"}\n```'),
  'Réponse propre',
);

assert.ok(
  !resolveAssistantMessageText(null, '```booking_patch\n{"category_id":"x"}\n```').includes('category_id'),
);

console.log('test-resolve-assistant-message-text: OK');
