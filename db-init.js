const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://flashv2_user:LjpfY0Dt5UNUrwFEOIjOPBjLgClTqHln@dpg-d0eta695pdvs73b2omag-a.oregon-postgres.render.com/flashv2',
  ssl: { rejectUnauthorized: false }
});

(async () => {
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

    console.log('✅ Tables are ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize tables:', err);
    process.exit(1);
  }
})();
