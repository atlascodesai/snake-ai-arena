# Snake AI Arena

3D Snake game where users can write AI algorithms to compete on a leaderboard.

## Development

### Local Development (without Docker)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (frontend: 5173, API: 3001)
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Docker Development (Recommended)

Uses PostgreSQL for dev/prod parity with Railway:

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
| `preview` | Preview | https://web-preview-e0a3.up.railway.app |
| `main` | Production | (Railway production URL) |

### Workflow

1. **Development:** Work on `preview` branch or feature branches
2. **Test:** Push to `preview` → auto-deploys to preview environment
3. **Ship:** Merge `preview` into `main` → auto-deploys to production

### Commands

```bash
# Deploy to preview
git checkout preview
git merge feature/my-feature
git push origin preview

# Deploy to production
git checkout main
git merge preview
git push origin main
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
- `server/db.ts` - Database abstraction (SQLite fallback, PostgreSQL prod)
- `server/app.ts` - Express app factory (for testing)

### Key Files
- `src/game/HeadlessGame.ts` - Headless game simulation for benchmarking
- `src/game/AlgorithmRunner.ts` - Safe algorithm execution in Web Worker
- `src/pages/Play.tsx` - Manual play with keyboard/touch controls
- `src/pages/Editor.tsx` - Code editor with live preview
- `src/game/controls/` - Extracted control utilities and schemes

## Database

- **Local Docker:** PostgreSQL (`docker compose up`)
- **Production:** PostgreSQL (Railway)
- **Fallback:** SQLite (`data/snake.db`) - when DATABASE_URL not set

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
DATABASE_URL=        # PostgreSQL connection (auto-set in Docker)
SQLITE_PATH=         # Custom SQLite path (fallback only)
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
