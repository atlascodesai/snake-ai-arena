# Snake AI Arena

3D Snake game where users can write AI algorithms to compete on a leaderboard.

## Development

### Local Development (Docker Required)

Docker is required for local development to run PostgreSQL:

```bash
npm run docker:dev        # Start dev environment with PostgreSQL
npm run docker:dev:build  # Rebuild and start
npm run docker:dev:down   # Stop containers
```

Access:
- Frontend: http://localhost:3000
- API: http://localhost:3001

## Testing

### Test Commands

```bash
# Unit tests (fast, run frequently)
npm run test:run          # Run all unit tests once
npm run test              # Run tests in watch mode
npm run test:coverage     # Run with coverage report
npm run test:ui           # Run with Vitest UI

# E2E tests (browser-based)
npm run test:e2e          # Run Playwright E2E tests
npm run test:e2e:ui       # Run with Playwright UI

# Integration tests (requires Docker)
npm run docker:test       # Start test containers
npm run test:integration  # Run integration tests
npm run docker:test:down  # Stop test containers

# Full integration test (automated)
npm run test:integration:docker  # Spin up Docker, run tests, cleanup
```

### Test Structure

```
src/
├── game/
│   ├── utils.test.ts           # 31 tests - Game utilities
│   ├── algorithms.test.ts      # 18 tests - AI pathfinding
│   ├── HeadlessGame.test.ts    # 26 tests - Game engine
│   └── controls/
│       └── controlUtils.test.ts # 13 tests - Control utilities
server/
└── __tests__/
    ├── api.test.ts             # 15 tests - API routes (mocked DB)
    └── integration.test.ts     # Integration tests (real PostgreSQL)
e2e/
├── navigation.spec.ts          # Navigation and dashboard tests
├── editor.spec.ts              # Code editor tests
├── play.spec.ts                # Manual play tests
├── leaderboard.spec.ts         # Leaderboard tests
└── about.spec.ts               # About page tests
```

### Development Workflow

```bash
# Before committing (fast, <10s)
npm run precommit    # lint + unit tests

# Before pushing (thorough, ~60-90s)
npm run prepush      # lint + unit + E2E tests

# CI/CD pipeline
npm run ci           # lint + coverage + E2E
```

### Integration Testing

Integration tests run against real PostgreSQL (same as production):

```bash
# Quick: Start containers manually, run tests
npm run docker:test               # Start PostgreSQL + API
npm run test:integration          # Run integration tests
npm run docker:test:down          # Cleanup

# Automated: Full cycle
npm run test:integration:docker   # Start, test, cleanup (all-in-one)
```

## Deployment Pipeline

**GitHub Repo:** https://github.com/atlascodesai/snake-ai-arena

### Branch Strategy

```
feature/* → preview → main
               ↓        ↓
           Preview   Production
```

| Branch | Environment | URL |
|--------|-------------|-----|
| `preview` | Preview | https://p.snake3js.com / https://web-preview-e0a3.up.railway.app |
| `main` | Production | https://snake3js.com |

### Deployment Methods

**GitHub Actions CI/CD (Automated)**

Pushing to `preview` or `main` triggers automatic deployment via GitHub Actions:

```bash
git push origin preview   # Auto-deploys to preview
git push origin main      # Auto-deploys to production
```

The workflow (`.github/workflows/deploy.yml`) handles the private submodule automatically using repository secrets.

**Local Deploy (Manual/Fallback)**

For manual deployments or if CI/CD is not configured:

```bash
./deploy.sh           # Deploy to preview (default)
./deploy.sh preview   # Explicit preview deploy
./deploy.sh production  # Deploy to production
```

### CI/CD Setup (Required Secrets)

Add these secrets to GitHub repository settings (Settings → Secrets → Actions):

| Secret | Description | How to get |
|--------|-------------|------------|
| `RAILWAY_TOKEN` | Railway API token | [Railway Dashboard](https://railway.app/account/tokens) → New Token |
| `PRIVATE_REPO_PAT` | GitHub PAT with repo access | [GitHub Settings](https://github.com/settings/tokens) → New token (classic) → Select `repo` scope |

The PAT must have access to the private submodule repository.

### Workflow

1. **Feature development:** Create feature branch from `preview`, build and test locally (or just build directly on `preview` for smaller changes)
2. **Merge to preview:** Merge feature branch into `preview`, push (auto-deploys to preview environment)
3. **Ship to prod:** Create PR from `preview` → `main`, review and merge (auto-deploys to production)

### Commands

```bash
# Feature branch workflow
git checkout preview
git checkout -b feature/my-feature    # Create feature branch
# ... make changes, test locally ...
git add . && git commit -m "Add feature"
git checkout preview && git merge feature/my-feature
git push origin preview               # Auto-deploys to preview

# Production release via PR (recommended)
gh pr create --base main --head preview --title "Release: feature description"
gh pr merge <PR_NUMBER> --merge       # Merge from CLI after review

# Direct production deploy (use sparingly)
git checkout main && git merge preview && git push origin main

# Manual deploy (fallback)
./deploy.sh preview
./deploy.sh production
```

## Architecture

### Frontend (React + Three.js)
- `src/pages/` - Page components (Dashboard, Editor, Play, Leaderboard)
- `src/components/` - Reusable components
- `src/game/` - Game logic, AI algorithms, headless simulation
- `src/workers/` - Web Worker for algorithm execution

### Backend (Express + PostgreSQL)
- `server/index.ts` - Express server entry
- `server/routes/` - API routes (leaderboard, manual scores)
- `server/db.ts` - PostgreSQL database interface
- `server/app.ts` - Express app factory (for testing)

### Key Files
- `src/game/HeadlessGame.ts` - Headless game simulation for benchmarking
- `src/game/AlgorithmRunner.ts` - Safe algorithm execution in Web Worker
- `src/pages/Play.tsx` - Manual play with keyboard/touch controls
- `src/pages/Editor.tsx` - Code editor with live preview
- `src/game/controls/` - Extracted control utilities and schemes

## Database

PostgreSQL is used for both local development and production:
- **Local:** PostgreSQL via Docker (`npm run docker:dev`)
- **Production:** PostgreSQL on Railway

Tables:
- `submissions` - AI algorithm submissions with scores
- `manual_scores` - Manual play high scores

## Docker Files

```
docker-compose.yml       # Local development with PostgreSQL
docker-compose.test.yml  # Integration testing environment
Dockerfile              # Production build for Railway
Dockerfile.dev          # Development with hot reload
Dockerfile.test         # Testing container
```

## Environment Variables

```bash
DATABASE_URL=        # PostgreSQL connection (required, auto-set in Docker)
PORT=3001            # Server port
AIDEMO_PASSWORD=     # Protected route password (optional)
```

## Protected Routes

Some routes require authentication. These are configured server-side and require environment variables to be set in the deployment environment. The repo can be cloned and built without access to protected features - they are not required for core functionality or contributions.

## Contributing

1. Fork the repository
2. Create a feature branch from `preview`
3. Make changes and test locally:
   - `npm run docker:dev` for full environment
   - `npm run test:run` for unit tests
   - `npm run test:e2e` for E2E tests
4. Run `npm run prepush` before pushing
5. Submit PR to `preview` branch
6. Changes will be reviewed and merged

Note: Some pages may show placeholder content locally - this is expected for protected demo features.
