# Snake AI Arena

3D Snake game where users can write AI algorithms to compete on a leaderboard.

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (frontend: 5173, API: 3001)
npm run build        # Build for production
npm run lint         # Run ESLint
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

### Backend (Express + SQLite/PostgreSQL)
- `server/index.ts` - Express server entry
- `server/routes/` - API routes (leaderboard, manual scores)
- `server/db.ts` - Database abstraction (SQLite local, PostgreSQL prod)

### Key Files
- `src/game/HeadlessGame.ts` - Headless game simulation for benchmarking
- `src/game/AlgorithmRunner.ts` - Safe algorithm execution in Web Worker
- `src/pages/Play.tsx` - Manual play with keyboard/touch controls
- `src/pages/Editor.tsx` - Code editor with live preview

## Database

- **Local:** SQLite (`data/snake.db`)
- **Production:** PostgreSQL (Railway)

Tables:
- `submissions` - AI algorithm submissions with scores
- `manual_scores` - Manual play high scores

## Environment Variables

```bash
DATABASE_URL=        # PostgreSQL connection (production only)
SQLITE_PATH=         # Custom SQLite path (optional)
PORT=3001            # Server port
```

## Protected Routes

Some routes require authentication. These are configured server-side and require environment variables to be set in the deployment environment. The repo can be cloned and built without access to protected features - they are not required for core functionality or contributions.

## Contributing

1. Fork the repository
2. Create a feature branch from `preview`
3. Make changes and test locally with `npm run dev`
4. Submit PR to `preview` branch
5. Changes will be reviewed and merged

Note: Some pages may show placeholder content locally - this is expected for protected demo features.
