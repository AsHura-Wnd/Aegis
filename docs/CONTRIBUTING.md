# AEGIS — Engineering Contribution Guidelines

Welcome to the AEGIS project. This guide outlines development practices, architecture boundaries, testing protocols, and contribution workflows for developers and maintainers.

---

## 1. Prerequisites & Environment Setup

- **Node.js**: v18.0.0 or higher (v20+ recommended).
- **npm**: v9.0.0 or higher.
- **Git**: v2.30+

```bash
# Clone and enter the repository
git clone https://github.com/your-org/aegis.git
cd aegis

# Install all dependencies (exact lockfile)
npm install
```

---

## 2. Development Workflow

AEGIS supports running backend and frontend independently:

```bash
# Terminal 1: Launch Backend REST API (Port 3001)
npm run server
# Or with auto-reloading during development:
npm run server:dev

# Terminal 2: Launch Frontend Mission Dashboard (Port 5173)
npm run dev

# Run full test suite before committing
npm test
```

---

## 3. Codebase Structure & Ownership

```
aegis/
├── docs/                 # Official technical documentation & specifications
├── scripts/              # Audit, determinism, and benchmarking CLI scripts
├── src/
│   ├── server/           # Express REST API, services, and mission models
│   │   ├── models/       # MissionInstance (encapsulates state & timers)
│   │   ├── routes/       # Express route handlers (missionRoutes, benchmarkRoutes)
│   │   ├── services/     # MissionService, BenchmarkService
│   │   ├── app.ts        # Express app configuration & middleware
│   │   └── server.ts     # Standalone HTTP entrypoint
│   ├── simulation/       # Kinematic physics, terrain DEM, and scenario definitions
│   │   ├── roverModel.ts # Seeded PRNG rover physics model
│   │   ├── terrainMap.ts # Jezero Sector 4 elevation, waypoints, & zones
│   │   └── scenarioDefinitions.ts # 6 operational fault scenarios
│   ├── engines/          # Core autonomy & safety evaluation engines
│   │   ├── hazardEngine.ts      # 9-vector hazard detection rules
│   │   ├── riskEngine.ts        # Dynamic compounding risk calculation
│   │   ├── decisionEngine.ts    # Mode executive & event logger
│   │   └── aiAssistantEngine.ts # Context-aware telemetry AI assistant
│   ├── types/            # Canonical TypeScript data models & enums
│   ├── components/       # React 19 UI mission control components
│   └── __tests__/        # Vitest unit, backend, and integration test suites
```

---

## 4. Coding & Architecture Rules

### 4.1 Strict Simulation Determinism
- **NEVER** use native `Math.random()` inside [`src/simulation/`](file:///d:/Projects/Aegis/src/simulation/) or [`src/engines/`](file:///d:/Projects/Aegis/src/engines/).
- Always use the rover instance's `this.rng` (`SeededRandom`) to guarantee that identical mission seeds produce bit-accurate identical state trajectories.

### 4.2 Bounded Historical Ring Buffers
- When appending to telemetry arrays, coordinate trails, or event logs, always enforce FIFO bounding (e.g. `if (arr.length > MAX) arr.shift();`).
- Never allow in-memory collections to grow unbounded.

### 4.3 REST API Standards
- Every route modifying state must validate input parameters before execution (e.g. rejecting non-numeric seeds or unknown scenario IDs with `400 Bad Request`).
- Never allow unhandled exceptions to crash the server; wrap async calls in `try/catch` and pass errors to the global error middleware.
- Return appropriate HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`.

### 4.4 TypeScript Conventions
- Enable strict mode; do not introduce `any` types for public interfaces.
- Define shared data models in [`src/types/`](file:///d:/Projects/Aegis/src/types/).
- All files must pass `npm run build` (`tsc -b && vite build`) without type errors.

---

## 5. Verification Checklist for Pull Requests

Before submitting a pull request, verify:
- [ ] `npm test` passes all 33 unit, backend, and integration tests.
- [ ] `npm run build` succeeds in under 2 seconds without TypeScript errors.
- [ ] `node scripts/testAudit.mjs` verifies bit-accurate replay and scenario execution.
- [ ] No unbounded memory allocations or orphaned `setInterval` handles.
- [ ] Documentation updated in `docs/` if API routes, scenario definitions, or hazard rules were modified.
