const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://flashv2_4d87_user:7PXyK9SAPsbdIVvx0jbGo09chmZUEDWh@dpg-d2b7efp5pdvs73cgg6h0-a.oregon-postgres.render.com/flashv2_4d87',
  ssl: { rejectUnauthorized: false }
});

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
  },
  getGroupWelcome: async (groupId) => {
    const res = await pool.query(
      'SELECT welcome_enabled, welcome_message FROM group_settings WHERE group_id = $1',
      [groupId]
    );

    const footer = '\n\n_This is the official welcome message sent by *FLASH-MD-V2* via Baileys._';

    if (res.rows.length === 0) {
      const defaultMessage = '👋 Hello @user Welcome to @group!' + footer;
      await pool.query(
        'INSERT INTO group_settings (group_id, welcome_enabled, welcome_message) VALUES ($1, $2, $3)',
        [groupId, false, defaultMessage]
      );
      return { enabled: false, message: defaultMessage };
    }

    return {
      enabled: res.rows[0].welcome_enabled,
      message: res.rows[0].welcome_message + footer,
    };
  },
  setGroupWelcome: async (groupId, enabled, message) => {
    await pool.query(`
      INSERT INTO group_settings (group_id, welcome_enabled, welcome_message)
      VALUES ($1, $2, $3)
      ON CONFLICT (group_id) DO UPDATE
      SET welcome_enabled = $2, welcome_message = $3
    `, [groupId, enabled, message]);
  }
};
