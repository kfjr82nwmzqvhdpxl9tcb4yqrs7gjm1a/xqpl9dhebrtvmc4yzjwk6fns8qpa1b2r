const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://beltahke:CdiT5wd6lnosDJyqVtiuHMAeB64DU24b@dpg-d12fn6juibrs73f61n0g-a.oregon-postgres.render.com/beltahtechpg',
  ssl: { rejectUnauthorized: false }
});

const initTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        group_id TEXT PRIMARY KEY,
        antilink_enabled BOOLEAN NOT NULL DEFAULT false,
        action TEXT DEFAULT 'warn'
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_warnings (
        group_id TEXT,
        user_id TEXT,
        warnings INTEGER DEFAULT 1,
        PRIMARY KEY (group_id, user_id)
      )
    `);

    console.log('✅ Tables initialized');
  } catch (err) {
    console.error('⚠️ Failed to initialize tables:', err.message);
    throw err;
  }
};

initTables();

module.exports = {
  getGroupSettings: async (groupId) => {
    const res = await pool.query(
      'SELECT * FROM group_settings WHERE group_id = $1', [groupId]
    );
    return res.rows[0];
  },
  setGroupSettings: async (groupId, enabled, action) => {
    await pool.query(`
      INSERT INTO group_settings (group_id, antilink_enabled, action)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id) DO UPDATE
      SET antilink_enabled = $2, action = $3
    `, [groupId, enabled, action]);
  },
  incrementWarning: async (groupId, userId) => {
    await pool.query(`
      INSERT INTO user_warnings (group_id, user_id, warnings)
      VALUES ($1, $2, 1)
      ON CONFLICT (group_id, user_id)
      DO UPDATE SET warnings = user_warnings.warnings + 1
    `, [groupId, userId]);
  },
  getWarnings: async (groupId, userId) => {
    const res = await pool.query(
      'SELECT warnings FROM user_warnings WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    return res.rows[0]?.warnings || 0;
  }
};
