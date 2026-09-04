module.exports = {
  insert: (pool, tournamentId, playerId) =>
    pool.query(
      'INSERT INTO tournament_players (tournament_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [tournamentId, playerId]
    ),

  list: (pool, tournamentId) =>
    pool.query(
      `SELECT p.* FROM players p
       JOIN tournament_players tp ON p.id = tp.player_id
       WHERE tp.tournament_id = $1`,
      [tournamentId]
    ),

  getPlayerIds: (pool, tournamentId) =>
    pool.query(
      'SELECT player_id FROM tournament_players WHERE tournament_id = $1',
      [tournamentId]
    ),
};
