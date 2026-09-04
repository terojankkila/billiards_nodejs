const Pool = require('pg').Pool;
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'billiard_tournaments',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

const initDatabase = async () => {
  // Lazy-load queries so the dialect can be selected via DB_DIALECT env var.
  // The init module exports raw DDL statements; everything else is used by
  // server.js via the same queries object.
  const queries = require('./queries');
  const init = queries.init;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const stmt of init.createTables) {
      await client.query(stmt);
    }

    // Seed the default admin from environment variables if no admins exist yet.
    const countResult = await client.query(init.adminCount);
    if (countResult.rows[0].count === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
      const hash = await bcrypt.hash(defaultPassword, 10);
      await client.query(init.seedAdmin(defaultUsername, hash));
      console.log(`Seeded default admin user "${defaultUsername}" from env`);
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDatabase };
