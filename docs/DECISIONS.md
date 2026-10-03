# AEGIS — Architectural Decision Records (ADRs)

This document records the foundational architectural decisions implemented in the AEGIS codebase. Only decisions directly supported by code, commit history, and runtime evidence are recorded. Where past design alternatives or historical discussions were not formally archived in the repository, they are marked as **`Undocumented decision — rationale to be confirmed`**.

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

- **Context**: The mission simulation, hazard detection, and risk scoring logic needed to run independently of the browser DOM and React lifecycle to support headless execution, automated testing, and external API queries.
- **Decision**: Implement an independent Node.js + Express + TypeScript service in [`src/server/`](file:///d:/Projects/Aegis/src/server/) exposing standard REST endpoints.
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: Decoupling the backend enables CLI-based testing via Vitest and Supertest without requiring a browser instance, and permits headless benchmark execution.
- **Consequences**:
  - Positive: Backend can run headlessly (`npm run server`) on port 3001 without frontend running.
  - Positive: Automated test suites can verify API behavior programmatically.
  - Negative: Requires CORS configuration and asynchronous network fetching between frontend and backend.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-002: In-Memory Mission Instance State Isolation

- **Context**: The system must support creating, stepping, resetting, and deleting multiple rover missions without state leakage or shared timer collisions.
- **Decision**: Implement `MissionService` maintaining a `Map<string, MissionInstance>`. Each `MissionInstance` encapsulates its own simulation model, hazard engine, risk engine, and background timer handle.
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: An in-memory map provides zero-latency state access and clean encapsulation without introducing database setup overhead during rapid hackathon iteration.
- **Consequences**:
  - Positive: Complete isolation between concurrent missions (verified via [`scripts/testAudit.mjs`](file:///d:/Projects/Aegis/scripts/testAudit.mjs)).
  - Negative: Ephemeral storage; server restarts re-initialize the mission catalog to default state.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-003: Deterministic Linear Congruential PRNG for Simulation

- **Context**: Mission replay and hazard validation require identical, reproducible physical state trajectories when supplied with the same numerical seed.
- **Decision**: Implement a custom `SeededRandom` linear congruential generator in [`src/simulation/roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts) ($X_{n+1} = (1664525 \cdot X_n + 1013904223) \bmod 2^{32}$) to govern all stochastic variables (terrain noise, wheel slip fluctuations, sensor jitter).
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: Native `Math.random()` cannot be seeded in standard V8 JavaScript, precluding reproducible replay.
- **Consequences**:
  - Positive: Bit-accurate state reproducibility across repeated runs with the same seed.
  - Positive: Zero external library dependencies.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-004: Additive Point System with Compounding Hazard Multipliers

- **Context**: Autonomous risk scoring in planetary robotics requires accounting for multi-subsystem degradation where independent non-critical faults combine to threaten mission survival.
- **Decision**: Implement an additive severity point model (`LOW`: 12, `MODERATE`: 24, `HIGH`: 46, `CRITICAL`: 78) augmented by 5 compounding multipliers (+25% to +40%) for specific hazard pairings (e.g. Low Battery + Comm Loss).
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: A purely linear average would allow a critical failure to be masked by normal readings in unrelated subsystems. The additive-with-compounding model guarantees appropriate escalation.
- **Consequences**:
  - Positive: Transparent, explainable risk escalation with explicit `compoundingFactors` logging.
  - Positive: Deterministic scoring easily tested via unit tests.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-005: Headless Batch Monte Carlo Benchmark Service

- **Context**: Validating edge autonomy benefits over Earth teleoperation requires empirical comparison across varied mission seeds and fault injections.
- **Decision**: Implement [`HeadlessBenchmarkEngine`](file:///d:/Projects/Aegis/src/server/services/benchmarkService.ts) to execute batch simulations of $N$ missions headlessly, aggregating survival rates, resolution times, traverse speeds, and power usage.
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: Running benchmarks in real-time UI would require minutes of rendering; running headlessly allows evaluating hundreds of ticks in milliseconds.
- **Consequences**:
  - Positive: Dynamic benchmark calculations from real simulated ticks rather than static mock tables.
  - Negative: Baseline teleoperation characteristics (e.g. 2,550s Earth round-trip delay, 35% stall failure probability) are modeled assumptions rather than live hardware telemetry.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-006: Dual-Engine AI Assistant (Deterministic Fallback + Optional LLM)

- **Context**: The mission assistant must operate reliably in offline and local environments where internet access or external API credentials may not be available.
- **Decision**: Implement a two-tier architecture in [`AegisAIAssistant`](file:///d:/Projects/Aegis/src/engines/aiAssistantEngine.ts): an offline deterministic rule engine grounded in live telemetry, with an optional hybrid Gemini LLM mode when an API key is provided.
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: Guarantees zero-configuration reliability while preserving the option for natural language generation when credentials exist.
- **Consequences**:
  - Positive: Fully functional offline with zero setup.
  - Positive: Seamless fallback upon LLM network failure or timeout.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-007: Bounded Ring Buffers for Telemetry and Event Streams

- **Context**: Long-running simulations with continuous ticking risk unbounded memory growth if history arrays grow indefinitely.
- **Decision**: Implement FIFO trimming on in-memory collections: `telemetryHistory` capped at 100 points, `logs` capped at 300 entries, `trail` capped at 300 coordinates.
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: Prevents memory leaks and maintains stable memory usage during extended simulation sessions.
- **Consequences**:
  - Positive: Stable heap memory usage over multi-hour runs.
  - Negative: Telemetry older than 100 ticks is pruned from the active REST response.
- **Current Status**: `Accepted & Implemented`.

---

## ADR-008: Subsystem Telemetry Normalization on Fault Clearance

- **Context**: Clearing an active fault scenario previously reset the scenario ID but left physical telemetry variables degraded (e.g. battery at 18.5%, motor temp at 74°C), contaminating subsequent tests.
- **Decision**: Update `RoverSimulationModel.clearFaults()` to restore nominal subsystem values (`batteryPct = 85.0%`, `motorTempC = 28.2°C`, `dustPct = 12.0%`) and transition operational mode back to `AUTONOMOUS_TRANSIT`.
- **Alternatives Considered**: `Undocumented decision — rationale to be confirmed`.
- **Reasoning**: Ensures that operator-directed fault clears return the rover to a clean, healthy baseline without requiring a complete mission reset.
- **Consequences**:
  - Positive: Clean state isolation between sequential scenario demonstrations.
  - Positive: Verified across live HTTP audit scripts.
- **Current Status**: `Accepted & Implemented`.
