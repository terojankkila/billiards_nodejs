module.exports = {
  getByName: (pool, username) =>
    pool.query('SELECT * FROM admins WHERE username = $1', [username]),

  getById: (pool, id) =>
    pool.query('SELECT id, username, is_default, created_at FROM admins WHERE id = $1', [id]),

  insert: (pool, username, passwordHash) =>
    pool.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) RETURNING id, username, is_default, created_at',
      [username, passwordHash]
    ),

  updatePassword: (pool, passwordHash, id) =>
    pool.query(
      'UPDATE admins SET password_hash = $1, is_default = FALSE WHERE id = $2',
      [passwordHash, id]
    ),

  list: (pool) =>
    pool.query('SELECT id, username, is_default, created_at FROM admins ORDER BY id'),

  count: (pool) =>
    pool.query('SELECT COUNT(*)::int as count FROM admins'),

  delete: (pool, id) =>
    pool.query('DELETE FROM admins WHERE id = $1', [id]),
};
