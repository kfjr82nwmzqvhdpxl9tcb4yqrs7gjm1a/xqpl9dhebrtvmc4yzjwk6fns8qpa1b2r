const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://flashmdusers_user:vrtQBGvmcpMXVTd0I6kremlRdHcJVZlX@dpg-d1n44oruibrs73e40j90-a.oregon-postgres.render.com/flashmdusers',
  ssl: { rejectUnauthorized: false }
});

// 🔧 Create required tables if they don't exist
const init = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_settings (
        id SERIAL PRIMARY KEY,
        group_id TEXT UNIQUE NOT NULL,
        antilink_enabled BOOLEAN DEFAULT FALSE,
        action TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_warnings (
        id SERIAL PRIMARY KEY,
        group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        warnings INTEGER DEFAULT 1,
        UNIQUE(group_id, user_id)
      );
    `);

    console.log("✅ Tables checked/created successfully.");
  } catch (err) {
    console.error("❌ Failed to create tables:", err);
  }
};

// Call init once
init();

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
      SET antilink_enabled = $2, action = $3,
          updated_at = CURRENT_TIMESTAMP
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
