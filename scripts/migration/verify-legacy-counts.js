/**
 * Vérifie les totaux sur le serveur legacy (MongoDB)
 * À exécuter sur oneandlab-vps via SSH :
 *
 *   ssh user@oneandlab-vps
 *   cd /var/www/onl/backend && node scripts/migration/verify-legacy-counts.js
 *
 * Ou si le script est dans le repo local :
 *   scp scripts/migration/verify-legacy-counts.js user@oneandlab-vps:/var/www/onl/backend/scripts/migration/
 *   ssh user@oneandlab-vps "cd /var/www/onl/backend && node scripts/migration/verify-legacy-counts.js"
 */

const path = require('path');
const envPath = process.env.DOTENV_PATH || path.resolve(__dirname, '../../../.env');
require('dotenv').config({ path: envPath });

async function main() {
  let mongoose;
  try {
    mongoose = require('mongoose');
  } catch (e) {
    console.error('Mongoose non trouvé. Essayez depuis /var/www/onl/backend');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/oneandlab';
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;

  const counts = {};

  // Collections principales
  const collections = ['patients', 'users', 'relatives', 'appointments', 'laboratories', 'professionals', 'phlebotomists'];
  for (const col of collections) {
    try {
      counts[col] = await db.collection(col).countDocuments();
    } catch (e) {
      counts[col] = `erreur: ${e.message}`;
    }
  }

  // Users par rôle
  const userRoles = await db.collection('users').aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray();

  // Patients avec/sans userId
  const patientsWithUser = await db.collection('patients').countDocuments({ userId: { $exists: true, $ne: null } });
  const patientsWithoutUser = await db.collection('patients').countDocuments({ $or: [{ userId: null }, { userId: { $exists: false } }] });

  console.log('\n=== TOTAUX LEGACY (MongoDB) ===\n');
  console.log('Collections:');
  for (const [col, n] of Object.entries(counts)) {
    console.log(`  ${col}: ${n}`);
  }
  console.log('\nUsers par rôle:');
  for (const r of userRoles) {
    console.log(`  ${r._id || '(vide)'}: ${r.count}`);
  }
  console.log('\nPatients:');
  console.log(`  Avec userId (compte User): ${patientsWithUser}`);
  console.log(`  Sans userId: ${patientsWithoutUser}`);
  console.log(`  Total collection patients: ${counts.patients}`);
  console.log('\n');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
