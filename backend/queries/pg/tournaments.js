module.exports = {
  insert: (pool, name, hashedPassword) =>
    pool.query(
      'INSERT INTO tournaments (name, password) VALUES ($1, $2) RETURNING id, name, status, created_at',
      [name, hashedPassword]
    ),

  getById: (pool, id) =>
    pool.query('SELECT id, name, status, created_at FROM tournaments WHERE id = $1', [id]),

  getByIdWithPassword: (pool, id) =>
    pool.query('SELECT * FROM tournaments WHERE id = $1', [id]),

  list: (pool) =>
    pool.query('SELECT id, name, status, created_at FROM tournaments ORDER BY created_at DESC'),

  updateStatus: (pool, status, id) =>
    pool.query('UPDATE tournaments SET status = $1 WHERE id = $2', [status, id]),
};
