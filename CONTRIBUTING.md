# Contributing to Snake AI Arena

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (required for local development)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/atlascodesai/snake-ai-arena.git
   cd snake-ai-arena
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development environment**
   ```bash
   npm run docker:dev
   ```
   This starts PostgreSQL and the development server with hot reload.

4. **Access the app**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Development Workflow

### Branch Strategy

```
feature/* → preview → main
```

- Create feature branches from `preview`
- Submit PRs to `preview` branch
- `preview` is merged to `main` for production releases

### Before You Code

1. Check existing issues for the feature/bug
2. Open an issue to discuss significant changes
3. Create a feature branch: `git checkout -b feature/your-feature`

### Code Standards

#### Linting & Formatting

We use ESLint for linting and Prettier for code formatting:

```bash
npm run lint          # Check for linting issues
npm run format        # Auto-format code with Prettier
npm run format:check  # Check formatting without changing files
```

#### Testing

Run tests before committing:

```bash
# Quick check (before committing)
npm run precommit     # lint + unit tests

# Full check (before pushing)
npm run prepush       # lint + unit + E2E tests
```

#### Test Structure

| Type | Command | Purpose |
|------|---------|---------|
| Unit | `npm run test:run` | Fast, isolated logic tests |
| Integration | `npm run test:integration:docker` | Real database tests |
| E2E | `npm run test:e2e` | Browser-based UI tests |

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add dark mode toggle
fix: resolve snake collision detection bug
docs: update API documentation
test: add tests for algorithm runner
refactor: extract game state hook
```

## Project Structure

```
src/
├── pages/           # Route components
├── components/      # Reusable UI components
├── game/            # Core game engine
│   ├── HeadlessGame.ts    # Game simulation
│   ├── algorithms.ts      # Built-in AI algorithms
│   └── controls/          # Input handling
├── api/             # API client
└── workers/         # Web Worker for sandboxed execution

server/
├── routes/          # API endpoints
├── db.ts            # Database interface
└── __tests__/       # Server tests

e2e/                 # Playwright E2E tests
```

## Testing Guidelines

### What to Test

**Must test:**
- Game logic (HeadlessGame, algorithms, utils)
- API routes
- Utility functions

**Nice to test:**
- Complex component logic
- Custom hooks

**Tested via E2E:**
- Page navigation
- Form submissions
- User interactions

### Running Tests

```bash
# Unit tests with coverage
npm run test:coverage

# E2E tests with UI
npm run test:e2e:ui

# Integration tests (requires Docker)
npm run test:integration:docker
```

### Coverage Thresholds

Current coverage focuses on core game logic:

| Module | Target | Current |
|--------|--------|---------|
| Game Engine | 80%+ | 90%+ |
| Server Routes | 70%+ | 80%+ |
| Components | E2E | E2E |

## Pull Request Process

1. **Create your PR**
   - Target the `preview` branch
   - Fill out the PR template
   - Link related issues

2. **Ensure checks pass**
   - Linting passes
   - All tests pass
   - No merge conflicts

3. **PR Description**
   ```markdown
   ## Summary
   Brief description of changes

   ## Test Plan
   - [ ] Unit tests added/updated
   - [ ] E2E tests pass
   - [ ] Manual testing completed

   ## Screenshots (if UI changes)
   ```

4. **Review process**
   - Address reviewer feedback
   - Keep commits clean (squash if needed)
   - Maintain PR scope (one feature/fix per PR)

## Code Style

### TypeScript

- Use explicit types for function parameters
- Prefer interfaces over types for objects
- Use `const` by default, `let` when needed

### React

- Functional components only
- Use hooks for state and effects
- Keep components focused (single responsibility)

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Tests: `*.test.ts` or `*.spec.ts`

## Need Help?

- **Questions:** Open a GitHub Discussion
- **Bugs:** Open an Issue with reproduction steps
- **Features:** Open an Issue to discuss first

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
