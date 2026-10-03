# AEGIS — Architectural Decision Records (ADRs)

This document records the foundational architectural decisions implemented in the AEGIS codebase. Rationale is drawn directly from code evidence and test verifications.

---

## ADR Index

| ADR ID | Title | Status | Primary Code Reference |
| :--- | :--- | :---: | :--- |
| **ADR-001** | Standalone Node.js + Express Backend Architecture | `Accepted` | [`src/server/`](file:///d:/Projects/Aegis/src/server/) |
| **ADR-002** | In-Memory Mission Instance State Isolation | `Accepted` | [`src/server/services/missionService.ts`](file:///d:/Projects/Aegis/src/server/services/missionService.ts) |
| **ADR-003** | Deterministic Linear Congruential PRNG for Simulation | `Accepted` | [`src/simulation/roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts#L10-L40) |
| **ADR-004** | Additive Point System with Compounding Hazard Multipliers | `Accepted` | [`src/engines/riskEngine.ts`](file:///d:/Projects/Aegis/src/engines/riskEngine.ts) |
| **ADR-005** | Headless Batch Monte Carlo Benchmark Service | `Accepted` | [`src/server/services/benchmarkService.ts`](file:///d:/Projects/Aegis/src/server/services/benchmarkService.ts) |
| **ADR-006** | Dual-Engine AI Assistant (Deterministic Fallback + Optional LLM) | `Accepted` | [`src/engines/aiAssistantEngine.ts`](file:///d:/Projects/Aegis/src/engines/aiAssistantEngine.ts) |
| **ADR-007** | Bounded Ring Buffers for Telemetry and Event Streams | `Accepted` | [`src/server/models/missionInstance.ts`](file:///d:/Projects/Aegis/src/server/models/missionInstance.ts) |
| **ADR-008** | Subsystem Telemetry Normalization on Fault Clearance | `Accepted` | [`src/simulation/roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts#L129-L135) |

---

## ADR-001: Standalone Node.js + Express Backend Architecture

- **Context**: The hackathon prototype originally ran simulation, hazard detection, and risk scoring logic directly in React component state on the client side. This prevented headless testing, background simulation, multi-client monitoring, and automated benchmarking.
- **Decision**: Extract simulation physics, hazard engines, and risk scoring into an independent Node.js + Express + TypeScript service exposing standard REST endpoints.
- **Alternatives Considered**: Keeping simulation in React state (rejected due to lack of headless benchmarking and API accessibility); Web Workers (rejected because external REST clients and automated test scripts could not query the rover state).
- **Consequences**:
  - Positive: Backend can run headlessly (`npm run server`) on port 3001 without frontend running.
  - Positive: Automated test suites (`vitest`, `supertest`) can verify APIs without browser rendering.
  - Negative: Requires cross-origin resource sharing (CORS) configuration and network communication between frontend and backend.
- **Status**: `Accepted & Implemented`.

---

## ADR-002: In-Memory Mission Instance State Isolation

- **Context**: The backend needed to support multiple simultaneous missions (e.g. concurrent testing, benchmark runs, multi-rover exploration) without state leakage.
- **Decision**: Implement a `MissionService` singleton maintaining a `Map<string, MissionInstance>`. Each `MissionInstance` owns private instances of `RoverSimulationModel`, `HazardDetectionEngine`, `DynamicRiskEngine`, and `AutonomousDecisionEngine`.
- **Alternatives Considered**: Global single-mission state (rejected due to inability to run concurrent isolation tests or parallel benchmarks); relational database persistence (deferred to Phase 4 for simplicity during hackathon development).
- **Consequences**:
  - Positive: Strict isolation between missions (verified via `testAudit.mjs`).
  - Positive: Instantaneous in-memory state mutations without disk I/O latency.
  - Negative: Mission state is ephemeral and resets if the backend process restarts.
- **Status**: `Accepted & Implemented`.

---

## ADR-003: Deterministic Linear Congruential PRNG for Simulation

- **Context**: Planetary mission simulation requires repeatable, reproducible test scenarios to validate autonomous decision algorithms. Standard `Math.random()` produces non-reproducible sequences.
- **Decision**: Implement a custom `SeededRandom` class using a Linear Congruential Generator ($X_{n+1} = (aX_n + c) \pmod m$) to drive all stochastic terrain roughness, slip noise, and atmospheric temperature flux.
- **Alternatives Considered**: Native `Math.random()` (rejected due to non-determinism); external PRNG library (rejected to minimize external dependencies).
- **Consequences**:
  - Positive: 100% bit-accurate replay across runs with identical seeds.
  - Positive: Zero external npm dependencies.
- **Status**: `Accepted & Implemented`.

---

## ADR-004: Additive Point System with Compounding Hazard Multipliers

- **Context**: Autonomous risk scoring in planetary robotics cannot rely on simple linear averaging. Independent minor hazards can combine synergistically to create vehicle-loss conditions (e.g. Low Battery alone is manageable; Low Battery combined with Communication Loss is catastrophic).
- **Decision**: Implement a two-tiered calculation in `DynamicRiskEngine`:
  1. Base environmental risk + additive points by severity (`CRITICAL`: 78 pts, `HIGH`: 46 pts, `MODERATE`: 24 pts).
  2. Explicit compounding multipliers for 5 recognized dangerous interactions (+25% to +40%).
  3. Absolute severity floors (e.g. any `CRITICAL` hazard forces minimum score of 78).
- **Alternatives Considered**: Weighted average formula (rejected because critical single faults could be masked by other healthy subsystems); machine learning risk classifier (rejected due to lack of explainability and training datasets).
- **Consequences**:
  - Positive: Transparent, explainable risk escalation with explicit `compoundingFactors` logs.
  - Positive: Deterministic and verifiable through unit tests.
- **Status**: `Accepted & Implemented`.

---

## ADR-005: Headless Batch Monte Carlo Benchmark Service

- **Context**: Hackathon demonstrations require quantitative, reproducible proof that autonomous edge decision-making outperforms traditional Earth teleoperation.
- **Decision**: Implement `HeadlessBenchmarkEngine` in [`src/server/services/benchmarkService.ts`](file:///d:/Projects/Aegis/src/server/services/benchmarkService.ts) to execute $N$ missions across varying seeds headlessly, dynamically aggregating speed, power, survival rate, and incident resolution times.
- **Alternatives Considered**: Hardcoded benchmark comparison charts (rejected as unverified claims); real-time UI-driven benchmark (rejected due to multi-minute execution times).
- **Consequences**:
  - Positive: Real dynamic calculations running 1,000+ simulation ticks in under 300ms.
  - Positive: Verifiable through automated test scripts (`backend.test.ts`, `testAudit.mjs`).
- **Status**: `Accepted & Implemented`.

---

## ADR-006: Dual-Engine AI Assistant (Deterministic Fallback + Optional LLM)

- **Context**: Planetary missions operate in deep-space environments where cloud LLM APIs are unreachable due to light-delay or communication loss. Furthermore, hackathon environments may lack active API keys.
- **Decision**: Implement a two-tier architecture in `AegisAIAssistant`:
  1. Offline Deterministic Rules Engine: Analyzes query intent and generates context-grounded markdown responses directly from live telemetry.
  2. Cloud Hybrid Mode: When `GEMINI_API_KEY` is provided, queries the Gemini API with automatic, silent fallback to the deterministic engine upon network error or timeout.
- **Alternatives Considered**: Pure cloud LLM (rejected due to comms loss constraint and dependency on API keys); pure rule engine without LLM capability (rejected to allow natural language flexibility).
- **Consequences**:
  - Positive: Assistant is 100% functional out of the box with zero configuration.
  - Positive: Complete resilience to network failures.
- **Status**: `Accepted & Implemented`.

---

## ADR-007: Bounded Ring Buffers for Telemetry and Event Streams

- **Context**: Long-running simulations with high tick rates can exhaust Node.js heap memory if arrays append indefinitely.
- **Decision**: Enforce explicit FIFO limits on all historical data structures:
  - `telemetryHistory`: Capped at 100 points via `.shift()`.
  - `logs`: Capped at 300 entries via `.slice(0, 300)`.
  - `trail`: Capped at 300 coordinates via `.shift()`.
- **Alternatives Considered**: Unbounded arrays (rejected due to memory leak risk); disk-backed circular logs (deferred to future persistence phase).
- **Consequences**:
  - Positive: Flat, predictable memory footprint even under continuous multi-hour runs.
  - Negative: Telemetry older than 100 ticks is discarded from the active API response.
- **Status**: `Accepted & Implemented`.

---

## ADR-008: Subsystem Telemetry Normalization on Fault Clearance

- **Context**: When an operator cleared an active fault scenario (e.g. `LOW_BATTERY`), the fault flag was reset, but degraded telemetry variables (e.g. battery at 18.5%) lingered, contaminating subsequent tests.
- **Decision**: Update `RoverSimulationModel.clearFaults()` to restore nominal subsystem baselines (`batteryPct = 85.0%`, `motorTempC = 28.2°C`, `dustPct = 12.0%`) and transition operational mode back to `AUTONOMOUS_TRANSIT`.
- **Alternatives Considered**: Requiring a full mission reset (rejected because operators need to demonstrate fault recovery mid-traverse without losing mission progress).
- **Consequences**:
  - Positive: Clean isolation between sequential scenario demonstrations.
  - Positive: Immediate visual and telemetry recovery in dashboard HUD.
- **Status**: `Accepted & Implemented`.
