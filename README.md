# Billiard Tournament Manager

Full-stack application for managing billiard tournaments with round-robin play, playoffs, and player performance analytics.

## Features

- **Admin Authentication**: Only admins can create tournaments. Default admin credentials set in `.env`, admins can manage other admin users and change their own passwords.
- **Tournament Creation**: Admins create tournaments with an admin password for player-facing access
- **Player Management**: Select existing players or create new ones
- **Round Robin (by Rounds)**: Split into rounds — each player plays exactly one match per round, facing every other player once
- **Scoring System**: Per-frame entry. Frame wins = 1 point, match win (best of 5) = 1 additional point
- **Playoffs**: Top 8 players advance, seeded 1v8, 2v7, 3v6, 4v5
- **Editable Results**: Results entered per-frame; individual frames can be edited/deleted to fix errors
- **Performance Analytics**: Charts showing player performance in current tournament and across all tournaments
- **Password Protection**: Only players with the tournament password can view tournament status and add results
- **Database Persistence**: All data stored in PostgreSQL

## Prerequisites

- Node.js (v16+)
- PostgreSQL (v13+)
- npm or yarn
- Docker + Docker Compose (for the Docker option)

## Configuration

Environment variables live in `backend/.env` (see `backend/.env.example`):

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=billiard_tournaments
DB_PASSWORD=postgres
DB_PORT=5432
PORT=3001

# Admin auth
JWT_SECRET=change-me-to-a-long-random-string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

- `JWT_SECRET` — secret used to sign admin tokens (set a strong random value in production)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` — the default admin account created on first startup (only if no admins exist yet). Change the password after first login via the Admin Panel.

## Setup

### Option 1: Docker Compose (recommended)

```bash
docker-compose up --build
```

This starts three containers:
- **db** — PostgreSQL 16 on `localhost:5433`
- **backend** — Express API on `localhost:3001` (nodemon, auto-reloads on changes)
- **frontend** — Vite/React on `localhost:5173` (hot reload)

Source directories are bind-mounted, so code changes reload automatically. Database data persists in the `postgres_data` volume. If you add new backend dependencies, rebuild the `node_modules` volume with `docker-compose down -v && docker-compose up --build`.

To stop: `docker-compose down` (add `-v` to also remove the database volume).

### Option 2: Local development without Docker

## Usage

1. Open the app in your browser
2. Log in as an admin (Admin Login → default `admin` / `admin123`) to create tournaments
3. Create a tournament (name + player-facing password)
4. Access the tournament with the password
5. Add players (from existing list or create new ones)
6. Start the tournament - round-robin matches are generated in rounds (each player plays once per round)
7. Enter match results frame by frame; frames can be edited/deleted to fix errors
8. When all round-robin matches are complete, start the playoffs
9. View player performance graphs on the Performance page
10. Manage other admins and change your password in the Admin Panel

## Points System

- Each frame won: **1 point**
- Winning a match (first to 3 frames / best of 5): **1 additional point**

So a player winning 3-2 earns 4 points (3 frames + 1 match win).