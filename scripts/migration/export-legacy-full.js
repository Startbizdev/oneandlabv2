/**
 * Export complet pour migration legacy → cible
 * Données RAW (chiffrées conservées telles quelles - pas de decrypt)
 * Périmètre: 3 labs Labio, 8 préleveurs, infirmiers, pros, patients, relatives, RDV
 *
 * Usage sur le serveur legacy:
 *   cd /var/www/onl/backend && node scripts/migration/export-legacy-full.js > /tmp/legacy-export.json
 * Ou avec chemin explicite:
 *   node /var/www/onl/backend/scripts/migration/export-legacy-full.js
 */

const path = require('path');
const fs = require('fs');

const envPath = process.env.DOTENV_PATH || path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const connectDB = require('../../config/db');
const Lab = require('../../models/labModel');
const Phlebotomist = require('../../models/phlebotomistModel');
const Professional = require('../../models/professionalModel');
const User = require('../../models/userModel');
const Patient = require('../../models/patientModel');
const Relative = require('../../models/relativeModel');
const Appointment = require('../../models/appointmentModel');

function toPlainObject(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && v._id && typeof v._id.toString === 'function') {
      out[k] = v.toString();
    } else if (Array.isArray(v)) {
      out[k] = v.map((x) => (x && x._id ? x.toString() : x));
    } else if (v && typeof v === 'object' && v.constructor.name === 'ObjectId') {
      out[k] = v.toString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

function stringifyIds(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  if (out._id) out._id = out._id.toString ? out._id.toString() : String(out._id);
  const idFields = ['patientId', 'relativeId', 'labId', 'phlebotomistId', 'professionalId', 'userId', 'roleDetailsId', 'bookedBy', 'uploadedBy'];
  for (const f of idFields) {
    if (out[f] && out[f].toString) out[f] = out[f].toString();
  }
  return out;
}

async function main() {
  await connectDB();

  // 1) Labs Labio avec RDV (3 labs)
  const allAppointments = await Appointment.find({}).lean();
  const labIdsWithRdv = new Set();
  for (const a of allAppointments) {
    if (a.labId) labIdsWithRdv.add(a.labId.toString());
  }

  const allLabs = await Lab.find({}).lean();
  // Labs avec RDV assignés (3 labs Labio selon le rapport)
  const labioLabs = allLabs.filter((l) => {
    const id = l._id.toString();
    return labIdsWithRdv.has(id);
  });

  const labioLabIds = labioLabs.map((l) => l._id.toString());

  // 2) Phlebotomists du Labio principal (689233af3b78f462d126e06a)
  const labioPrincipalId = '689233af3b78f462d126e06a';
  const phlebotomists = await Phlebotomist.find({
    labId: labioPrincipalId,
  }).lean();

  // 3) Professionals (infirmiers + pros)
  const professionals = await Professional.find({}).lean();

  // 4) Patients (tous)
  const patients = await Patient.find({}).lean();

  // 5) Relatives (tous)
  const relatives = await Relative.find({}).lean();

  // 6) Users liés: lab_admin pour les 3 labs, phlebotomist pour les 8, professional pour les 131
  const labUserIds = new Set();
  const phlebUserIds = new Set();
  const profUserIds = new Set();

  const users = await User.find({}).lean();
  for (const u of users) {
    const role = u.role || '';
    const model = u.roleDetailsModel || '';
    const rid = u.roleDetailsId ? u.roleDetailsId.toString() : null;
    if (role === 'lab_admin' && model === 'Laboratory' && rid && labioLabIds.includes(rid)) {
      labUserIds.add(u._id.toString());
    }
    if (role === 'phlebotomist' && phlebotomists.some((p) => p._id.toString() === rid)) {
      phlebUserIds.add(u._id.toString());
    }
    if (role === 'professional' && professionals.some((p) => p._id.toString() === rid)) {
      profUserIds.add(u._id.toString());
    }
  }

  const patientUserIds = new Set(users.filter((u) => u.role === 'patient').map((u) => u._id.toString()));
  const relativeUserIds = new Set(users.filter((u) => u.role === 'relative').map((u) => u._id.toString()));

  const usersToExport = users.filter((u) => {
    const id = u._id.toString();
    return labUserIds.has(id) || phlebUserIds.has(id) || profUserIds.has(id) || patientUserIds.has(id) || relativeUserIds.has(id) || u.role === 'superadmin';
  });

  const result = {
    exportedAt: new Date().toISOString(),
    scope: {
      labioLabIds,
      labCount: labioLabs.length,
      phlebotomistCount: phlebotomists.length,
      professionalCount: professionals.length,
      patientCount: patients.length,
      relativeCount: relatives.length,
      appointmentCount: allAppointments.length,
      userCount: usersToExport.length,
    },
    laboratories: labioLabs.map((l) => stringifyIds({ ...l, _id: l._id.toString() })),
    phlebotomists: phlebotomists.map((p) => stringifyIds({ ...p, _id: p._id.toString() })),
    professionals: professionals.map((p) => stringifyIds({ ...p, _id: p._id.toString() })),
    patients: patients.map((p) => stringifyIds({ ...p, _id: p._id.toString(), userId: p.userId ? p.userId.toString() : null, professionalId: p.professionalId ? p.professionalId.toString() : null })),
    relatives: relatives.map((r) => stringifyIds({ ...r, _id: r._id.toString(), patientId: r.patientId ? r.patientId.toString() : null })),
    users: usersToExport.map((u) => stringifyIds({ ...u, _id: u._id.toString(), roleDetailsId: u.roleDetailsId ? u.roleDetailsId.toString() : null })),
    appointments: allAppointments.map((a) => {
      const o = { ...a, _id: a._id.toString() };
      if (a.patientId) o.patientId = a.patientId.toString();
      if (a.relativeId) o.relativeId = a.relativeId.toString();
      if (a.labId) o.labId = a.labId.toString();
      if (a.phlebotomistId) o.phlebotomistId = a.phlebotomistId.toString();
      if (a.professionalId) o.professionalId = a.professionalId.toString();
      if (a.bookedBy) o.bookedBy = a.bookedBy.toString();
      if (a.createdBy && a.createdBy.userId) o.createdBy = { ...a.createdBy, userId: a.createdBy.userId.toString() };
      return o;
    }),
  };

  const outputPath = process.env.EXPORT_OUTPUT_PATH || '/tmp/legacy-export.json';
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
  console.error('Export terminé (données chiffrées conservées):', outputPath);
  console.error('  Labs:', result.scope.labCount, '| Phlebotomists:', result.scope.phlebotomistCount, '| Professionals:', result.scope.professionalCount);
  console.error('  Patients:', result.scope.patientCount, '| Relatives:', result.scope.relativeCount, '| Appointments:', result.scope.appointmentCount);

  await require('mongoose').connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Erreur export:', err);
  process.exit(1);
});
