#!/usr/bin/env node
/**
 * Audit patients sur le serveur legacy (MongoDB)
 * À exécuter sur oneandlab-vps: cd /var/www/onl/backend && node scripts/migration/audit-patients-legacy.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('../../config/db');

async function main() {
  await connectDB();
  const mongoose = require('mongoose');

  const db = mongoose.connection.db;

  console.log('\n========== AUDIT PATIENTS LEGACY ==========\n');

  const totalPatients = await db.collection('patients').countDocuments();
  console.log('Total patients (collection):', totalPatients);

  const withProfessionalId = await db.collection('patients').countDocuments({
    professionalId: { $exists: true, $ne: null }
  });
  console.log('Patients avec professionalId (créés par pro/infirmier):', withProfessionalId);

  const withUserId = await db.collection('patients').countDocuments({
    userId: { $exists: true, $ne: null }
  });
  console.log('Patients avec userId (compte User):', withUserId);

  const withoutUserId = await db.collection('patients').countDocuments({
    $or: [{ userId: null }, { userId: { $exists: false } }]
  });
  console.log('Patients sans userId:', withoutUserId);

  // Doublons par email_search_hash
  const dupesByHash = await db.collection('patients').aggregate([
    { $match: { email_search_hash: { $exists: true, $ne: null, $ne: '' } } },
    { $group: { _id: '$email_search_hash', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('\n--- Doublons par email_search_hash ---');
  console.log('Groupes avec même email (hash):', dupesByHash.length);
  let totalDup = 0;
  dupesByHash.forEach((g) => { totalDup += g.count - 1; });
  console.log('Patients en excédent (doublons):', totalDup);
  console.log('Emails uniques (approx):', totalPatients - totalDup);

  if (dupesByHash.length > 0) {
    console.log('\nExemple 3 premiers groupes (hash, count, ids):');
    dupesByHash.slice(0, 3).forEach((g, i) => {
      console.log(`  ${i + 1}. count=${g.count} ids=${g.ids.map((x) => x.toString()).join(', ')}`);
    });
  }

  // Patients sans email_search_hash
  const noHash = await db.collection('patients').countDocuments({
    $or: [{ email_search_hash: null }, { email_search_hash: '' }, { email_search_hash: { $exists: false } }]
  });
  console.log('\nPatients sans email_search_hash:', noHash);

  // Appointments
  const totalAppts = await db.collection('appointments').countDocuments();
  const apptsWithPatient = await db.collection('appointments').countDocuments({ patientId: { $exists: true, $ne: null } });
  console.log('\n--- Appointments ---');
  console.log('Total appointments:', totalAppts);
  console.log('Avec patientId:', apptsWithPatient);

  // Comment les pros voient leurs patients (logique legacy)
  console.log('\n--- Logique dashboard pro/infirmier ---');
  const profIds = await db.collection('professionals').distinct('_id');
  console.log('Professionals count:', profIds.length);

  // Doublons par email DÉCHIFFRÉ (SHA256) - comme la migration
  console.log('\n--- Doublons par email (après déchiffrement, hash SHA256) ---');
  const crypto = require('crypto');
  let decryptFn;
  try {
    const { decrypt, isEncrypted } = require('../../config/encryption');
    decryptFn = (val) => (val && isEncrypted(val) ? decrypt(val) : val || '');
  } catch (e) {
    console.log('  (decrypt non dispo, skip)');
    decryptFn = null;
  }
  if (decryptFn) {
    const patientsRaw = await db.collection('patients').find({}).toArray();
    const hashToPatients = {};
    let noEmail = 0;
    for (const p of patientsRaw) {
      let email = '';
      try {
        email = decryptFn(p.email) || '';
      } catch (_) {
        email = 'patient-' + (p._id?.toString() || '') + '@migration.local';
      }
      if (!email || email === '') {
        noEmail++;
        email = 'patient-' + (p._id?.toString() || '') + '@migration.local';
      }
      const norm = (email || '').toLowerCase().trim();
      const h = crypto.createHash('sha256').update(norm).digest('hex');
      if (!hashToPatients[h]) hashToPatients[h] = [];
      hashToPatients[h].push({ id: p._id?.toString(), professionalId: p.professionalId?.toString(), email: norm.substring(0, 30) });
    }
    const dupGroups = Object.values(hashToPatients).filter((arr) => arr.length > 1);
    const uniqueEmails = Object.keys(hashToPatients).length;
    const totalDupByEmail = dupGroups.reduce((s, g) => s + g.length - 1, 0);
    console.log('Emails uniques (après déchiffrement):', uniqueEmails);
    console.log('Groupes avec même email:', dupGroups.length);
    console.log('Patients en excédent (fusionnés par migration):', totalDupByEmail);
    console.log('577 -', totalDupByEmail, '=', 577 - totalDupByEmail, '(attendu ~378)');
    if (dupGroups.length > 0) {
      console.log('\nExemple groupe doublon (2 premiers):');
      dupGroups.slice(0, 2).forEach((g, i) => {
        console.log('  Groupe', i + 1, ':', g.length, 'patients, email:', g[0].email, '...');
        g.forEach((x) => console.log('    -', x.id, 'professionalId:', x.professionalId || 'null'));
      });
    }
  }

  await mongoose.disconnect();
  console.log('\n========== FIN AUDIT ==========\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
