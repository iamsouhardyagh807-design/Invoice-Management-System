const db = require('../config/db');

async function main() {
  console.log('Initializing Invoice Pro Database...');
  try {
    await db.initDb();
    console.log(`Database initialization complete. Engine: ${db.getDbType()}`);
    process.exit(0);
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
}

main();
