const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
function load(relative, mocks = {}) {
  const file = path.resolve(__dirname, relative);
  const compiled = new Module(file);
  compiled.require = name => { if (name in mocks) return mocks[name]; throw new Error('Unexpected dependency: ' + name); };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return compiled.exports;
}
const { ResumableAppointmentBatch } = load('../packages/shared-utils/src/resumable-appointment-batch.ts');
(async () => {
  let copies = 0, uploads = 0, creates = 0, fail = true;
  const { uploadAppointmentDocuments } = load('../apps/mobile/src/features/appointments/api/upload-appointment-documents.ts', {
    './medical-documents.service': { copyMedicalDocumentToAppointment: async () => { copies++; return { success: true }; } },
    '@/lib/uploads/upload-file': {
      buildMedicalDocumentForm: async file => file,
      uploadFormData: async () => { uploads++; if (fail) throw new Error('Synthetic upload failure'); },
    },
  });
  const payload = {
    form_data: { files: { carte_vitale: { medical_document_id: 'synthetic-profile-doc', isNew: false } } },
    files: { ordonnance: { uri: 'file:///synthetic.pdf', name: 'Ordonnance.pdf', mimeType: 'application/pdf' } },
  };
  const batch = new ResumableAppointmentBatch();
  const create = async () => { creates++; return 'synthetic-appointment'; };
  const attach = (p, id) => uploadAppointmentDocuments(id, p, batch);
  assert.equal((await batch.run('same', [payload], create, attach)).success, false);
  assert.equal(copies, 1);
  assert.equal(uploads, 1);
  fail = false;
  assert.equal((await batch.run('same', [payload], create, attach)).success, true);
  assert.equal(creates, 1);
  assert.equal(copies, 1);
  assert.equal(uploads, 2);
  console.log('7 native document merge and retry assertions passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
