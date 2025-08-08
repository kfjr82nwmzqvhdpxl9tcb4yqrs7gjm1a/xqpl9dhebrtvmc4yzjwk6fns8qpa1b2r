const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://flashv2_4d87_user:7PXyK9SAPsbdIVvx0jbGo09chmZUEDWh@dpg-d2b7efp5pdvs73cgg6h0-a.oregon-postgres.render.com/flashv2_4d87',
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
