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
- **Public Viewing**: Anyone can view tournaments, standings, matches, and results
- **Password Protection**: The tournament password is required to add results; admins can always add scores
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

TODO: Add local dev instructions.

## Kubernetes Deployment (Helm)

### Prerequisites

- Kubernetes cluster (v1.24+)
- [Helm 3](https://helm.sh/docs/intro/install/) installed
- `kubectl` configured to point at your cluster
- A private container registry (update `global.registry` in values)
- NGINX Ingress Controller installed in the cluster

### 1. Build and push Docker images

Production Dockerfiles are provided for both services:

```bash
# Set your registry (no trailing slash)
export REGISTRY="registry.example.com/team"

# Backend
docker build -t $REGISTRY/billiard-backend:latest -f backend/Dockerfile.prod backend/
docker push $REGISTRY/billiard-backend:latest

# Frontend
docker build -t $REGISTRY/billiard-frontend:latest -f frontend/Dockerfile.prod frontend/
docker push $REGISTRY/billiard-frontend:latest
```

### 2. Install the Helm chart

```bash
cd deploy/helm

# Fetch the postgres dependency (cloudpirates OCI chart)
helm dependency update billiard-tournaments

# Install (override secrets via --set)
helm upgrade --install billiard ./billiard-tournaments \
  --namespace billiard --create-namespace \
  --set global.registry=$REGISTRY \
  --set backend.jwtSecret=$(openssl rand -hex 32) \
  --set backend.frontendKey=$(openssl rand -hex 16) \
  --set backend.adminPassword=CHANGE_ME \
  --set postgres.auth.username=billiard \
  --set postgres.auth.database=billiard_tournaments \
  --set postgres.auth.password=$(openssl rand -hex 16) \
  --set ingress.hosts[0].host=billiard.example.com \
  --set ingress.tls[0].secretName=billiard-tls \
  --set ingress.tls[0].hosts[0]=billiard.example.com
```

### 3. Verify the deployment

```bash
kubectl -n billiard get pods
kubectl -n billiard logs -l app.kubernetes.io/component=backend --tail=20
```

Open `https://billiard.example.com` in your browser.

### Configuration reference

| Value | Default | Description |
|---|---|---|
| `global.registry` | `""` | Private registry prefix (e.g. `ghcr.io/team`) |
| `backend.image.repository` | `billiard-backend` | Backend image name |
| `backend.image.tag` | `latest` | Backend image tag |
| `backend.jwtSecret` | `""` | JWT signing secret (CHANGE THIS) |
| `backend.frontendKey` | `""` | Shared X-App-Key (CHANGE THIS) |
| `backend.adminUsername` | `admin` | Default admin username |
| `backend.adminPassword` | `""` | Default admin password (CHANGE THIS) |
| `frontend.image.repository` | `billiard-frontend` | Frontend image name |
| `frontend.replicaCount` | `2` | Frontend pod count |
| `postgres.enabled` | `true` | Deploy the postgres subchart |
| `postgres.auth.username` | `billiard` | Database superuser name |
| `postgres.auth.password` | `""` | Superuser password (auto-generated if empty) |
| `postgres.auth.database` | `billiard_tournaments` | Database name |
| `ingress.enabled` | `true` | Create NGINX Ingress resource |
| `ingress.hosts` | `billiard.example.com` | Ingress hostname(s) |
| `ingress.tls` | `[]` | TLS configuration |

### 4. Uninstall

```bash
helm uninstall billiard -n billiard
kubectl delete namespace billiard
```

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