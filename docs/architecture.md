# Snake AI Arena - Architecture Documentation

## Overview

Snake AI Arena is a 3D Snake game platform where users write AI algorithms in JavaScript to compete on a global leaderboard. The application is designed with a **client-heavy architecture** where most functionality runs in the browser.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│  React App                                                       │
│  ├── Three.js / React Three Fiber (3D rendering)                │
│  ├── Monaco Editor (code editing)                               │
│  ├── HeadlessGame (game simulation)                             │
│  ├── AlgorithmRunner (user code execution)                      │
│  └── AudioContext (sound effects & music)                       │
├─────────────────────────────────────────────────────────────────┤
│                    API Calls (fetch)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Server (API)                        │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                         │
│  ├── GET  /api/leaderboard     - Fetch leaderboard              │
│  ├── POST /api/leaderboard     - Submit algorithm               │
│  ├── GET  /api/leaderboard/:id - Get submission details         │
│  ├── GET  /api/leaderboard/placement - Preview rank             │
│  └── POST /api/manual-scores   - Submit manual play score       │
├─────────────────────────────────────────────────────────────────┤
│  Middleware:                                                     │
│  ├── Helmet.js (CSP, security headers)                          │
│  ├── CORS (restricted to allowed origins)                       │
│  ├── Rate limiting (100 submissions/hour per IP)                │
│  └── Static file serving                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        PostgreSQL                                │
│                   (Railway / Docker)                             │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  ├── submissions    - AI algorithm submissions & scores         │
│  └── manual_scores  - Manual play high scores                   │
└─────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### 1. Client-Side Game Execution

**Decision:** All game logic, algorithm execution, and benchmarking runs entirely in the browser.

**Rationale:**
- Zero server load for gameplay - scales infinitely
- Instant feedback for users testing algorithms
- No latency issues affecting game timing
- Server restarts don't interrupt active users

**Trade-offs:**
- Users could potentially cheat by submitting fake scores
- Mitigated by: Score sanity checks, rate limiting, community moderation

### 2. In-Memory Session Storage for Protected Routes

**Decision:** The `/aidemo` protected page uses in-memory session storage (`Set<string>`).

**Rationale:**
- Only affects the optional demo feature, not core functionality
- Simple implementation with no external dependencies
- Server restarts only require re-entering the demo password
- Normal users (playing, editing, submitting) are unaffected

**Trade-offs:**
- Sessions lost on server restart
- Acceptable because: Demo page is non-critical, password re-entry is minor friction

### 3. PostgreSQL Only (No SQLite)

**Decision:** Use PostgreSQL exclusively for both development and production.

**Rationale:**
- Dev/prod parity: Same database in all environments eliminates "works on my machine" issues
- Simplified codebase: Single database implementation, fewer code paths to maintain
- Docker is easy: `npm run docker:dev` starts PostgreSQL with zero configuration
- Reduced attack surface: One less dependency to audit and maintain

**Development:**
- Local development requires Docker: `npm run docker:dev`
- `DATABASE_URL` environment variable is required (auto-set by Docker)

### 4. User Code Execution via `new Function()`

**Decision:** User algorithms are compiled using `new Function()` constructor.

**Rationale:**
- Simpler than Web Workers for synchronous game ticks
- Provides `utils` object with safe helper functions
- Game engine enforces 25,000 frame limit (timeout protection)

**Security considerations:**
- Code runs in user's own browser (self-contained risk)
- Server validates score ranges and submission rates
- No server-side code execution

### 5. Chatwoot Hidden on Editor Page

**Decision:** Hide Chatwoot chat widget specifically on the Editor page.

**Rationale:**
- Editor page has dense UI with scoreboard
- Chat bubble overlapped with game/scoreboard area
- Other pages have more space for the chat widget

**Implementation:** `useEffect` in Editor.tsx hides widget on mount, restores on unmount.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 | UI framework |
| 3D Rendering | Three.js + React Three Fiber | Game visualization |
| Code Editor | Monaco Editor | Algorithm editing |
| Styling | Tailwind CSS | Utility-first CSS |
| Build | Vite | Fast builds & HMR |
| Backend | Express.js | API server |
| Database | PostgreSQL | Production data |
| Deployment | Railway | Hosting platform |
| CI/CD | GitHub Actions | Automated deployments |

## File Structure

```
├── src/
│   ├── pages/           # Route components
│   ├── components/      # Reusable UI components
│   ├── game/            # Game logic & algorithms
│   │   ├── HeadlessGame.ts    # Core game simulation
│   │   ├── AlgorithmRunner.ts # User code execution
│   │   ├── algorithms.ts      # Built-in algorithms
│   │   └── controls/          # Input handling
│   ├── contexts/        # React contexts (Audio)
│   ├── api/             # API client
│   └── workers/         # Web Workers
├── server/
│   ├── index.ts         # Express entry point
│   ├── routes/          # API route handlers
│   └── db.ts            # PostgreSQL database interface
├── public/              # Static assets
├── e2e/                 # Playwright E2E tests
└── docs/                # Documentation
```

## Performance Characteristics

| Operation | Location | Latency |
|-----------|----------|---------|
| Game tick | Browser | <1ms |
| Algorithm execution | Browser | <1ms per tick |
| 10-game benchmark | Browser | ~30 seconds |
| Leaderboard fetch | Server | ~50-100ms |
| Submission POST | Server | ~100-200ms |

## Security Model

1. **Client-side isolation:** User code runs in their own browser only
2. **Security headers:** Helmet.js provides CSP, X-Frame-Options, X-Content-Type-Options, etc.
3. **CORS restrictions:** API only accepts requests from allowed origins (snake3js.com, localhost in dev)
4. **API rate limiting:** 100 submissions/hour per IP
5. **Input validation:**
   - Score ranges with `Number.isFinite()` checks (prevents NaN/Infinity attacks)
   - Name length validation
   - Code size limits
6. **Parameterized queries:** SQL injection prevention via pg parameterized queries
7. **No server-side code execution:** All user code runs client-side

## Future Considerations

- [x] Add Content Security Policy headers (helmet.js)
- [x] Implement React Error Boundary
- [x] CORS restricted to allowed origins
- [x] Input validation with Number.isFinite()
- [x] Remove SQLite, PostgreSQL-only
- [ ] Add lazy loading for routes
- [ ] Consider Web Worker for algorithm execution (better isolation)
- [ ] Add replay system for submitted algorithms
