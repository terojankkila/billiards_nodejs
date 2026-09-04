module.exports = {
  getByMatch: (pool, matchId) =>
    pool.query(
      `SELECT f.id, f.frame_number, f.winner_id,
              p1.name AS player1_name, p2.name AS player2_name,
              CASE WHEN f.winner_id = m.player1_id THEN p1.name ELSE p2.name END AS winner_name
       FROM frames f
       JOIN matches m ON f.match_id = m.id
       JOIN players p1 ON m.player1_id = p1.id
       JOIN players p2 ON m.player2_id = p2.id
       WHERE f.match_id = $1
       ORDER BY f.frame_number`,
      [matchId]
    ),

  getByMatchAndNumber: (pool, matchId, frameNumber) =>
    pool.query(
      'SELECT id FROM frames WHERE match_id = $1 AND frame_number = $2',
      [matchId, frameNumber]
    ),

  insert: (pool, matchId, frameNumber, winnerId) =>
    pool.query(
      'INSERT INTO frames (match_id, frame_number, winner_id) VALUES ($1, $2, $3)',
      [matchId, frameNumber, winnerId]
    ),

  update: (pool, winnerId, matchId, frameNumber) =>
    pool.query(
      'UPDATE frames SET winner_id = $1 WHERE match_id = $2 AND frame_number = $3',
      [winnerId, matchId, frameNumber]
    ),

  getFrameWinners: (pool, matchId) =>
    pool.query(
      'SELECT winner_id FROM frames WHERE match_id = $1 ORDER BY frame_number',
      [matchId]
    ),

  delete: (pool, matchId, frameNumber) =>
    pool.query(
      'DELETE FROM frames WHERE match_id = $1 AND frame_number = $2',
      [matchId, frameNumber]
    ),
};
