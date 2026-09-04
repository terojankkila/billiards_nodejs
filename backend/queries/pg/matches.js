module.exports = {
  insert: (pool, tournamentId, p1, p2, round, roundNumber, matchOrder) =>
    pool.query(
      `INSERT INTO matches (tournament_id, player1_id, player2_id, round, round_number, match_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tournamentId, p1, p2, round, roundNumber, matchOrder]
    ),

  insertSimple: (pool, tournamentId, p1, p2, round, matchOrder) =>
    pool.query(
      `INSERT INTO matches (tournament_id, player1_id, player2_id, round, match_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [tournamentId, p1, p2, round, matchOrder]
    ),

  getByTournament: (pool, tournamentId) =>
    pool.query(
      `SELECT m.*,
              p1.name as player1_name, p2.name as player2_name,
              w.name as winner_name
       FROM matches m
       JOIN players p1 ON m.player1_id = p1.id
       JOIN players p2 ON m.player2_id = p2.id
       LEFT JOIN players w ON m.winner_id = w.id
       WHERE m.tournament_id = $1
       ORDER BY m.round, m.match_order`,
      [tournamentId]
    ),

  getById: (pool, id) =>
    pool.query('SELECT * FROM matches WHERE id = $1', [id]),

  updateStarted: (pool, id) =>
    pool.query('UPDATE matches SET is_started = TRUE WHERE id = $1', [id]),

  updateScores: (pool, p1f, p2f, winnerId, status, id) =>
    pool.query(
      `UPDATE matches SET player1_frames = $1, player2_frames = $2, winner_id = $3, status = $4 WHERE id = $5`,
      [p1f, p2f, winnerId, status, id]
    ),

  getByTournamentAndRound: (pool, tournamentId, round) =>
    pool.query(
      `SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 ORDER BY match_order`,
      [tournamentId, round]
    ),

  getMinIncompleteRound: (pool, tournamentId) =>
    pool.query(
      `SELECT MIN(round_number) as current_round
       FROM matches
       WHERE tournament_id = $1 AND round = 'round_robin' AND status <> 'completed'`,
      [tournamentId]
    ),

  getTournamentId: (pool, id) =>
    pool.query('SELECT tournament_id FROM matches WHERE id = $1', [id]),

  deleteFrames: (pool, matchId) =>
    pool.query('DELETE FROM frames WHERE match_id = $1', [matchId]),
};
