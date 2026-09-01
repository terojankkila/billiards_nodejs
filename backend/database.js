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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'setup',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tournament_players (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tournament_id, player_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
        player1_id INTEGER REFERENCES players(id),
        player2_id INTEGER REFERENCES players(id),
        player1_frames INTEGER DEFAULT 0,
        player2_frames INTEGER DEFAULT 0,
        round VARCHAR(50) NOT NULL,
        round_number INTEGER,
        match_order INTEGER,
        status VARCHAR(50) DEFAULT 'pending',
        winner_id INTEGER REFERENCES players(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS round_number INTEGER;
    `);

    await client.query(`
      ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_started BOOLEAN DEFAULT FALSE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS frames (
        id SERIAL PRIMARY KEY,
        match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
        frame_number INTEGER NOT NULL,
        winner_id INTEGER REFERENCES players(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed the default admin from environment variables if no admins exist yet.
    const adminCount = await client.query('SELECT COUNT(*)::int as count FROM admins');
    if (adminCount.rows[0].count === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
      const hash = await bcrypt.hash(defaultPassword, 10);
      await client.query(
        'INSERT INTO admins (username, password_hash, is_default) VALUES ($1, $2, $3)',
        [defaultUsername, hash, true]
      );
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
