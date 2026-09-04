require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, initDatabase } = require('./database');

const app = express();
const FRONTEND_KEY = process.env.FRONTEND_KEY || 'dev-frontend-key';
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',');
// Only allow known frontend origins; browser requests normally go through the
// Vite proxy (same origin), so this mainly blocks direct cross-site calls.
app.use(cors({ origin: FRONTEND_ORIGINS }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ---- Frontend-origin verification ----
// Every /api request must carry the app key that is baked into the frontend
// bundle (VITE_APP_KEY) and configured here (FRONTEND_KEY). This asserts the
// request originates from our own frontend, not a third-party script.
const requireFrontend = (req, res, next) => {
  if (req.headers['x-app-key'] !== FRONTEND_KEY) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }
  next();
};

// ---- Tournament access ----
// Returns a short-lived token proving the caller supplied the correct
// tournament password. Required for viewing results and entering them.
const signTournamentToken = (tournamentId) => jwt.sign(
  { type: 'tournament', tid: tournamentId },
  JWT_SECRET,
  { expiresIn: '12h' }
);

// Verifies the tournament access token and binds it to the tournament that the
// route targets. Works for both /api/tournaments/:id/... and /api/matches/:id/...
// routes (matches are resolved to their owning tournament).
const requireTournamentAccess = async (req, res, next) => {
  try {
    const token = req.headers['x-tournament-token'];
    if (!token) return res.status(401).json({ error: 'Tournament access required' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired tournament token' });
    }
    if (payload.type !== 'tournament') {
      return res.status(401).json({ error: 'Invalid or expired tournament token' });
    }

    let tournamentId = Number(req.params.id);
    if (req.originalUrl.startsWith('/api/matches/')) {
      const result = await pool.query('SELECT tournament_id FROM matches WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
      tournamentId = result.rows[0].tournament_id;
    }

    if (Number(payload.tid) !== tournamentId) {
      return res.status(403).json({ error: 'You do not have access to this tournament' });
    }

    req.tournamentId = tournamentId;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// All API routes must come from the frontend
app.use('/api', requireFrontend);

// ---- Admin authentication ----
const signToken = (admin) => jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '8h' });

const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Get current admin / verify token
app.get('/api/auth/me', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, is_default, created_at FROM admins WHERE id = $1', [req.admin.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ token: signToken(admin), admin: { id: admin.id, username: admin.username, is_default: admin.is_default } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin changes own password
app.put('/api/auth/password', requireAdmin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }
    const result = await pool.query('SELECT * FROM admins WHERE id = $1', [req.admin.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Admin not found' });
    const admin = result.rows[0];
    const valid = await bcrypt.compare(current_password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE admins SET password_hash = $1, is_default = FALSE WHERE id = $2', [hash, req.admin.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all admins (admin only)
app.get('/api/admin/admins', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, is_default, created_at FROM admins ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new admin (admin only)
app.post('/api/admin/admins', requireAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admins (username, password_hash) VALUES ($1, $2) RETURNING id, username, is_default, created_at',
      [username, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Delete an admin (admin only, cannot delete the last admin)
app.delete('/api/admin/admins/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    const countResult = await pool.query('SELECT COUNT(*)::int as count FROM admins');
    if (countResult.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }
    await pool.query('DELETE FROM admins WHERE id = $1', [id]);
    res.json({ message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to shuffle an array (Fisher-Yates)
const shuffle = (arr) => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Generate round-robin rounds using the circle method.
// Returns an array of rounds, each round containing a set of matches
// where every player plays exactly once (odd counts get one bye per round).
const generateRoundRobinRounds = (players) => {
  let list = shuffle(players.map(p => p.player_id));
  const oddCount = list.length % 2 === 1;
  if (oddCount) list.push(null); // null = bye, so a player rests each round

  const numRounds = list.length - 1;
  const matchesPerRound = list.length / 2;
  const fixed = list[0];
  let rotating = list.slice(1);

  const rounds = [];
  for (let r = 0; r < numRounds; r++) {
    const current = [fixed, ...rotating];
    const round = [];
    for (let i = 0; i < matchesPerRound; i++) {
      const p1 = current[i];
      const p2 = current[current.length - 1 - i];
      if (p1 !== null && p2 !== null) {
        const pair = Math.random() < 0.5 ? [p1, p2] : [p2, p1];
        round.push({ player1_id: pair[0], player2_id: pair[1] });
      }
    }
    rounds.push(round);
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return rounds;
};

// Create a new tournament (admin only)
app.post('/api/tournaments', requireAdmin, async (req, res) => {
  try {
    const { name, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO tournaments (name, password) VALUES ($1, $2) RETURNING id, name, status, created_at',
      [name, hashedPassword]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify tournament password
app.post('/api/tournaments/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const result = await pool.query('SELECT * FROM tournaments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const tournament = result.rows[0];
    const validPassword = await bcrypt.compare(password, tournament.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    res.json({ valid: true, token: signTournamentToken(tournament.id), tournament: { id: tournament.id, name: tournament.name, status: tournament.status } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tournaments
app.get('/api/tournaments', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, status, created_at FROM tournaments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tournament by ID
app.get('/api/tournaments/:id', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, name, status, created_at FROM tournaments WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all players
app.get('/api/players', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM players ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new player
app.post('/api/players', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO players (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Player name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Add players to tournament
app.post('/api/tournaments/:id/players', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { playerIds } = req.body;
    
    for (const playerId of playerIds) {
      await pool.query(
        'INSERT INTO tournament_players (tournament_id, player_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, playerId]
      );
    }
    
    const result = await pool.query(
      `SELECT p.* FROM players p 
       JOIN tournament_players tp ON p.id = tp.player_id 
       WHERE tp.tournament_id = $1`,
      [id]
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tournament players
app.get('/api/tournaments/:id/players', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.* FROM players p 
       JOIN tournament_players tp ON p.id = tp.player_id 
       WHERE tp.tournament_id = $1`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start tournament (generate round-robin matches)
app.post('/api/tournaments/:id/start', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get tournament players
    const playersResult = await pool.query(
      'SELECT player_id FROM tournament_players WHERE tournament_id = $1',
      [id]
    );
    
    if (playersResult.rows.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start tournament' });
    }
    
    const players = playersResult.rows;
    const rounds = generateRoundRobinRounds(players);
    
    // Create matches grouped by round
    let matchIndex = 0;
    for (let r = 0; r < rounds.length; r++) {
      for (const { player1_id, player2_id } of rounds[r]) {
        matchIndex++;
        await pool.query(
          'INSERT INTO matches (tournament_id, player1_id, player2_id, round, round_number, match_order) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, player1_id, player2_id, 'round_robin', r + 1, matchIndex]
        );
      }
    }
    
    // Update tournament status
    await pool.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['round_robin', id]);
    
    res.json({ message: 'Tournament started', rounds: rounds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tournament matches
app.get('/api/tournaments/:id/matches', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT m.*, 
              p1.name as player1_name, p2.name as player2_name,
              w.name as winner_name
       FROM matches m
       JOIN players p1 ON m.player1_id = p1.id
       JOIN players p2 ON m.player2_id = p2.id
       LEFT JOIN players w ON m.winner_id = w.id
       WHERE m.tournament_id = $1
       ORDER BY m.round, m.match_order`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recompute a match's score, status, and winner from its frame records.
// Then auto-advance playoff brackets / complete the tournament as needed.
async function recomputeMatch(client, matchId) {
  const matchResult = await client.query('SELECT * FROM matches WHERE id = $1', [matchId]);
  const match = matchResult.rows[0];
  if (!match) throw new Error('Match not found');

  const framesResult = await client.query(
    'SELECT winner_id FROM frames WHERE match_id = $1 ORDER BY frame_number',
    [matchId]
  );
  const frameWinners = framesResult.rows.map(r => r.winner_id);

  const player1_frames = frameWinners.filter(w => w === match.player1_id).length;
  const player2_frames = frameWinners.filter(w => w === match.player2_id).length;
  const completed = Math.max(player1_frames, player2_frames) >= 3;
  const status = frameWinners.length === 0 ? 'pending' : (completed ? 'completed' : 'in_progress');
  const winner_id = completed
    ? (player1_frames > player2_frames ? match.player1_id : match.player2_id)
    : null;

  await client.query(
    'UPDATE matches SET player1_frames = $1, player2_frames = $2, winner_id = $3, status = $4 WHERE id = $5',
    [player1_frames, player2_frames, winner_id, status, matchId]
  );

  // Auto-advance playoff bracket when a completed round's last match finishes
  if (completed && status === 'completed') {
    const { tournament_id, round } = match;
    if (round === 'quarter_final' || round === 'semi_final') {
      const roundMatches = await client.query(
        'SELECT * FROM matches WHERE tournament_id = $1 AND round = $2 ORDER BY match_order',
        [tournament_id, round]
      );
      if (roundMatches.rows.every(m => m.status === 'completed')) {
        if (round === 'quarter_final') {
          await client.query(
            'INSERT INTO matches (tournament_id, player1_id, player2_id, round, match_order) VALUES ($1, $2, $3, $4, $5)',
            [tournament_id, roundMatches.rows[0].winner_id, roundMatches.rows[1].winner_id, 'semi_final', 1]
          );
          await client.query(
            'INSERT INTO matches (tournament_id, player1_id, player2_id, round, match_order) VALUES ($1, $2, $3, $4, $5)',
            [tournament_id, roundMatches.rows[2].winner_id, roundMatches.rows[3].winner_id, 'semi_final', 2]
          );
        } else {
          await client.query(
            'INSERT INTO matches (tournament_id, player1_id, player2_id, round, match_order) VALUES ($1, $2, $3, $4, $5)',
            [tournament_id, roundMatches.rows[0].winner_id, roundMatches.rows[1].winner_id, 'final', 1]
          );
        }
      }
    } else if (round === 'final') {
      await client.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['completed', tournament_id]);
    }
  }

  return { player1_frames, player2_frames, status, winner_id };
}

// Determine whether a round-robin match belongs to the tournament's current round.
// The current round is the lowest round_number with any not-yet-completed match.
async function isCurrentRoundMatch(client, match) {
  if (match.round !== 'round_robin') {
    // Playoff matches exist only for the active phase, so they are by definition current.
    return true;
  }
  const result = await client.query(
    `SELECT MIN(round_number) as current_round
     FROM matches
     WHERE tournament_id = $1 AND round = 'round_robin' AND status <> 'completed'`,
    [match.tournament_id]
  );
  const currentRound = result.rows[0].current_round;
  return match.round_number === currentRound;
}

// Start a match (enable frame entry). Only current-round games can be started.
app.post('/api/matches/:id/start', requireTournamentAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const matchResult = await client.query('SELECT * FROM matches WHERE id = $1', [id]);
    if (matchResult.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchResult.rows[0];

    if (match.status === 'completed') {
      return res.status(400).json({ error: 'This match is already completed' });
    }
    if (!(await isCurrentRoundMatch(client, match))) {
      return res.status(400).json({ error: 'Only games in the current round can be started' });
    }
    if (match.is_started) {
      return res.status(400).json({ error: 'Match is already started' });
    }

    await client.query('UPDATE matches SET is_started = TRUE WHERE id = $1', [id]);
    res.json({ message: 'Match started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get a match's frame records
app.get('/api/matches/:id/frames', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT f.id, f.frame_number, f.winner_id, 
              p1.name AS player1_name, p2.name AS player2_name,
              CASE WHEN f.winner_id = m.player1_id THEN p1.name ELSE p2.name END AS winner_name
       FROM frames f
       JOIN matches m ON f.match_id = m.id
       JOIN players p1 ON m.player1_id = p1.id
       JOIN players p2 ON m.player2_id = p2.id
       WHERE f.match_id = $1
       ORDER BY f.frame_number`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add / save a single frame result
app.post('/api/matches/:id/frames', requireTournamentAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { winner_id, frame_number } = req.body;

    const matchResult = await client.query('SELECT * FROM matches WHERE id = $1', [id]);
    if (matchResult.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchResult.rows[0];

    if (!match.is_started) {
      return res.status(400).json({ error: 'Match has not been started yet' });
    }

    if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
      return res.status(400).json({ error: 'Winner must be one of the two players in the match' });
    }

    // If frame already exists, allow overwriting it (edit)
    const existing = await client.query(
      'SELECT id FROM frames WHERE match_id = $1 AND frame_number = $2',
      [id, frame_number]
    );
    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE frames SET winner_id = $1 WHERE match_id = $2 AND frame_number = $3',
        [winner_id, id, frame_number]
      );
    } else {
      await client.query(
        'INSERT INTO frames (match_id, frame_number, winner_id) VALUES ($1, $2, $3)',
        [id, frame_number, winner_id]
      );
    }

    const state = await recomputeMatch(client, id);
    res.json({ message: 'Frame saved', frames: { player1_frames: state.player1_frames, player2_frames: state.player2_frames, status: state.status, winner_id: state.winner_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Delete a frame result (fix errors)
app.delete('/api/matches/:id/frames/:frameNumber', requireTournamentAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, frameNumber } = req.params;
    await client.query('DELETE FROM frames WHERE match_id = $1 AND frame_number = $2', [id, frameNumber]);
    const state = await recomputeMatch(client, id);
    res.json({ message: 'Frame removed', frames: { player1_frames: state.player1_frames, player2_frames: state.player2_frames, status: state.status, winner_id: state.winner_id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update match result (bulk save of frame winners)
app.put('/api/matches/:id', requireTournamentAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { player1_frames, player2_frames, frames } = req.body;

    const matchResult = await client.query('SELECT * FROM matches WHERE id = $1', [id]);
    if (matchResult.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchResult.rows[0];

    // Support per-frame winners array [{player1_wins}...] or legacy score counts
    await client.query('DELETE FROM frames WHERE match_id = $1', [id]);

    if (Array.isArray(frames)) {
      let p1 = 0, p2 = 0;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i].winner_id !== match.player1_id && frames[i].winner_id !== match.player2_id) {
          throw new Error(`Frame ${i + 1} winner is not in the match`);
        }
        await client.query(
          'INSERT INTO frames (match_id, frame_number, winner_id) VALUES ($1, $2, $3)',
          [id, i + 1, frames[i].winner_id]
        );
        if (frames[i].winner_id === match.player1_id) p1++; else p2++;
      }
    } else {
      const total = player1_frames + player2_frames;
      for (let i = 1; i <= total; i++) {
        const winner = i <= player1_frames ? match.player1_id : match.player2_id;
        await client.query(
          'INSERT INTO frames (match_id, frame_number, winner_id) VALUES ($1, $2, $3)',
          [id, i, winner]
        );
      }
    }

    const state = await recomputeMatch(client, id);
    res.json({ message: 'Match result updated', ...state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get tournament standings
app.get('/api/tournaments/:id/standings', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
         p.id as player_id,
         p.name,
         COUNT(CASE WHEN m.winner_id = p.id THEN 1 END)::int as matches_won,
         COUNT(CASE WHEN m.status = 'completed' THEN 1 END)::int as matches_played,
         COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player1_frames 
                          WHEN m.player2_id = p.id THEN m.player2_frames END), 0)::int as frames_won,
         COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player2_frames 
                          WHEN m.player2_id = p.id THEN m.player1_frames END), 0)::int as frames_lost,
         (COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) + 
          COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player1_frames 
                           WHEN m.player2_id = p.id THEN m.player2_frames END), 0))::int as total_points
       FROM tournament_players tp
       JOIN players p ON tp.player_id = p.id
       LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
         AND m.tournament_id = tp.tournament_id AND m.status = 'completed' AND m.round = 'round_robin'
       WHERE tp.tournament_id = $1
       GROUP BY p.id, p.name
       ORDER BY total_points DESC, frames_won DESC, matches_won DESC`,
      [id]
    );
    
    // Add total points (matches_won + frames_won)
    const standings = result.rows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
    
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start playoffs (top 8 players)
app.post('/api/tournaments/:id/playoffs', requireTournamentAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get standings
    const standingsResult = await pool.query(
      `SELECT 
         p.id as player_id,
         p.name,
         (COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) + 
          COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player1_frames 
                           WHEN m.player2_id = p.id THEN m.player2_frames END), 0))::int as total_points
       FROM tournament_players tp
       JOIN players p ON tp.player_id = p.id
       LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
         AND m.tournament_id = tp.tournament_id AND m.status = 'completed' AND m.round = 'round_robin'
       WHERE tp.tournament_id = $1
       GROUP BY p.id, p.name
       ORDER BY total_points DESC
       LIMIT 8`,
      [id]
    );
    
    if (standingsResult.rows.length < 8) {
      return res.status(400).json({ error: 'Need at least 8 players for playoffs' });
    }
    
    const players = standingsResult.rows;
    
    // Create playoff matches: 1v8, 2v7, 3v6, 4v5
    const playoffMatches = [
      { player1: players[0].player_id, player2: players[7].player_id },
      { player1: players[1].player_id, player2: players[6].player_id },
      { player1: players[2].player_id, player2: players[5].player_id },
      { player1: players[3].player_id, player2: players[4].player_id }
    ];
    
    for (let i = 0; i < playoffMatches.length; i++) {
      const { player1, player2 } = playoffMatches[i];
      await pool.query(
        'INSERT INTO matches (tournament_id, player1_id, player2_id, round, match_order) VALUES ($1, $2, $3, $4, $5)',
        [id, player1, player2, 'quarter_final', i + 1]
      );
    }
    
    // Update tournament status
    await pool.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['playoffs', id]);
    
    res.json({ message: 'Playoffs started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get player stats across all tournaments
app.get('/api/players/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
         t.id as tournament_id,
         t.name as tournament_name,
         COUNT(CASE WHEN m.winner_id = p.id THEN 1 END) as matches_won,
         COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as matches_played,
         COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player1_frames 
                          WHEN m.player2_id = p.id THEN m.player2_frames END), 0) as frames_won,
         COALESCE(SUM(CASE WHEN m.player1_id = p.id THEN m.player2_frames 
                          WHEN m.player2_id = p.id THEN m.player1_frames END), 0) as frames_lost
       FROM tournaments t
       JOIN tournament_players tp ON t.id = tp.tournament_id
       JOIN players p ON tp.player_id = p.id
       LEFT JOIN matches m ON (m.player1_id = p.id OR m.player2_id = p.id) 
         AND m.tournament_id = t.id AND m.status = 'completed'
       WHERE p.id = $1
       GROUP BY t.id, t.name, p.id, p.name
       ORDER BY t.created_at DESC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggregate stats for all players across every tournament.
// Returns every player who has participated (even those with zero matches)
// together with match win/loss counts, frame win/loss counts, and win percentages.
app.get('/api/stats/all-players', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         COUNT(DISTINCT m.id)
           FILTER (WHERE m.status = 'completed')::int AS matches_played,
         COUNT(DISTINCT m.id)
           FILTER (WHERE m.status = 'completed' AND m.winner_id = p.id)::int AS matches_won,
         COALESCE(SUM(
           CASE WHEN m.player1_id = p.id THEN m.player1_frames
                WHEN m.player2_id = p.id THEN m.player2_frames
           END) FILTER (WHERE m.status = 'completed'), 0)::int AS frames_won,
         COALESCE(SUM(
           CASE WHEN m.player1_id = p.id THEN m.player2_frames
                WHEN m.player2_id = p.id THEN m.player1_frames
           END) FILTER (WHERE m.status = 'completed'), 0)::int AS frames_lost
       FROM players p
       JOIN tournament_players tp ON tp.player_id = p.id
       LEFT JOIN matches m ON m.tournament_id = tp.tournament_id
         AND (m.player1_id = p.id OR m.player2_id = p.id)
         AND m.status = 'completed'
       GROUP BY p.id, p.name
       ORDER BY matches_won DESC, frames_won DESC`
    );

    const stats = result.rows.map((r) => {
      const matchesPlayed = r.matches_played;
      const framesWon = r.frames_won;
      const framesLost = r.frames_lost;
      return {
        ...r,
        match_win_pct: matchesPlayed > 0
          ? Math.round((r.matches_won / matchesPlayed) * 1000) / 10
          : 0,
        frame_win_pct: (framesWon + framesLost) > 0
          ? Math.round((framesWon / (framesWon + framesLost)) * 1000) / 10
          : 0,
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
