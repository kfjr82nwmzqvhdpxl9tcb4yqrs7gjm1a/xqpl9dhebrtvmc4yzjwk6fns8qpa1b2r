const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://beltahke:CdiT5wd6lnosDJyqVtiuHMAeB64DU24b@dpg-d12fn6juibrs73f61n0g-a.oregon-postgres.render.com/beltahtechpg',
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        group_id TEXT PRIMARY KEY,
        antilink_enabled BOOLEAN DEFAULT FALSE,
        action TEXT DEFAULT 'warn'
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_warnings (
        group_id TEXT,
        user_id TEXT,
        warnings INTEGER DEFAULT 1,
        PRIMARY KEY (group_id, user_id)
      );
    `);

    console.log('✅ Tables initialized (db-init)');
  } catch (err) {
    console.warn('⚠️ Failed to initialize tables:', err.message);
  }
}

module.exports = initDB;
