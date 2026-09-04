module.exports = {
  list: (pool) =>
    pool.query('SELECT * FROM players ORDER BY name'),

  insert: (pool, name) =>
    pool.query('INSERT INTO players (name) VALUES ($1) RETURNING *', [name]),
};
