# AEGIS — Testing & Verification Strategy

This document details the test framework, test suites, execution procedures, actual test results, requirements traceability matrix, and coverage analysis for AEGIS.

---

## 1. Test Framework & Environment

The test suite runs under **Vitest v5.0.3** paired with **JSDOM** and **Supertest v7.3.1**:

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Test Runner** | Vitest | `^5.0.3` | Multi-threaded ESM unit & integration test runner. |
| **DOM Environment** | JSDOM | `^30.1.1` | Simulates browser canvas and DOM for frontend tests. |
| **Component Testing**| `@testing-library/react` | `^16.3.3` | Renders and interacts with React dashboard components. |
| **API Integration** | Supertest | `^7.3.1` | Direct HTTP assertion against Express `app`. |
| **TypeScript Typecheck** | TypeScript `tsc` | `~6.0.2` | Compile-time strict type enforcement (`tsc -b`). |
| **Linter** | Oxlint | `^1.81.0` | High-speed static analysis for code quality. |

---

## 2. Test Execution Commands

```bash
# 1. Run all 33 unit, integration, and backend tests
npm test

# 2. Run backend API tests only (isolated Supertest execution)
npm run test:backend

# 3. Run live HTTP determinism, scenario pipeline, and benchmark audit
node scripts/testAudit.mjs

# 4. Run TypeScript type check and production bundle build
npm run build

# 5. Run static linting
npm run lint
```

---

## 3. Actual Test Results

### 3.1 Vitest Full Suite (`npm test`)
```text
> aegis@0.0.0 test
> vitest run

 RUN  v5.0.3 D:/Projects/Aegis

 ✓ src/__tests__/aegis.test.ts (18 tests) 23ms
 ✓ src/__tests__/backend.test.ts (13 tests) 467ms
 ✓ src/__tests__/app.integration.test.tsx (4 tests) 1583ms
   ✓ AEGIS Mission Control Dashboard Integration Tests (4)
     ✓ renders the complete mission control dashboard without throwing errors 376ms
     ✓ navigates seamlessly across operational views 358ms
     ✓ opens and closes the Baseline Comparison and 9 Rules Matrix modals 578ms

 Test Files  3 passed (3)
      Tests  35 passed (35)
   Duration  4.51s
```

### 3.2 Live Backend Audit Script (`node scripts/testAudit.mjs`)
```text
====================================================
🧪 STARTING COMPREHENSIVE AEGIS BACKEND AUDIT
====================================================

✅ 1. Health Check: HEALTHY (Uptime: 12s)

--- 2. AUDITING DETERMINISTIC REPLAY WITH SEED 9999 ---
Deterministic Replay Verification:
  • Battery % match:      true (88.5% vs 88.5%)
  • Position (X, Y) match: true (73.1, 429.8 vs 73.1, 429.8)
  • Internal Temp match:  true (21.3°C vs 21.3°C)
  • Signal Link match:    true (-74.5 dBm vs -74.5 dBm)
  • Risk Score match:     true (5/100 vs 5/100)
✅ Determinism Audit PASSED: 100% Bit-accurate state reproducibility.

--- 3. AUDITING ALL 6 FAULT SCENARIO PIPELINES ---
[SCENARIO: LOW_BATTERY]      Hazard: Low Battery Reserve        Risk: HIGH (59/100)    Mitigation: VERIFIED
[SCENARIO: ROVER_STUCK]      Hazard: Locomotion Entrapment      Risk: CRIT (100/100)   Mitigation: VERIFIED
[SCENARIO: COMM_LOSS]        Hazard: Weak Communication Link    Risk: CRIT (83/100)    Mitigation: VERIFIED
[SCENARIO: EXTREME_TEMP]     Hazard: Subsystem Thermal Overheat Risk: CRIT (83/100)    Mitigation: VERIFIED
[SCENARIO: SOLAR_DUST]       Hazard: Solar Dust Deposition      Risk: HIGH (52/100)    Mitigation: VERIFIED
[SCENARIO: HAZARDOUS_TERRAIN]Hazard: Hazardous Terrain          Risk: CRIT (100/100)   Mitigation: VERIFIED
✅ All 6 Scenarios PASSED: Full Telemetry -> Hazard -> Risk -> Decision -> Mitigation verified.

--- 4. AUDITING MISSION ISOLATION ---
  • Mission Alpha tick count: 12 (expected 12)
  • Mission Beta tick count:  0  (expected 0)
  • Mission Alpha Risk: CRITICAL (100/100)
  • Mission Beta Risk:  LOW (5/100)
✅ Mission Isolation PASSED: Concurrent missions are 100% quarantined.

--- 5. AUDITING HEADLESS BENCHMARK CALCULATIONS ---
Benchmark Result:
  • Missions Simulated:     15
  • Total Ticks Simulated:  375
  • AEGIS Survival Rate:    100%
  • Baseline Teleoperation: 93.3%
  • Resolution Speedup:     1417x
  • Traverse Speedup:       275%
  • Power Saved:            16.4%
✅ Benchmark PASSED: Strictly evaluated across real simulated ticks.
```

---

## 4. Test Suite Breakdown

### 4.1 Unit Test Suite (`src/__tests__/aegis.test.ts` — 18 Tests)
Focuses on pure mathematical and algorithmic correctness of simulation physics, hazard engines, and risk scoring:
- **Rover Simulation Model**: Verifies step advancements, bounded terrain sampling, PRNG determinism, and 6-wheel slip calculations.
- **Hazard Detection Engine**: Tests threshold triggers and severity classifications for each of the 9 hazard vectors independently.
- **Dynamic Risk Engine**: Asserts 0–100 clamping, base environmental scoring, additive hazard weights, and 5 multi-fault compounding multipliers.
- **Autonomous Decision Engine**: Verifies mode transitions to `EMERGENCY_RECOVERY`, `SAFE_HOLD`, and `HAZARD_AVOIDANCE`.

### 4.2 Backend API Integration Suite (`src/__tests__/backend.test.ts` — 13 Tests)
Tests Express routes using Supertest:
1. `GET /api/health`: Confirms `status: HEALTHY` and uptime.
2. `GET /api/missions`: Lists active missions including default `primary-mission`.
3. `POST /api/missions`: Creates isolated mission with designated seed.
4. `POST /api/missions/:id/step`: Advances discrete simulation ticks.
5. `GET /api/missions/:id/telemetry`: Returns current snapshot and history array.
6. `GET /api/missions/:id/hazards`: Returns active hazards and rule configurations.
7. `GET /api/missions/:id/risk`: Asserts dynamic risk calculation structure.
8. `POST /api/missions/:id/scenarios`: Injects `ROVER_STUCK` and asserts CRITICAL risk.
9. `POST /api/missions/:id/mitigate`: Executes mitigation and restores nominal mode.
10. `POST /api/benchmark`: Executes headless Monte Carlo run across 5 missions.
11. `POST /api/missions/:id/assistant`: Queries AI assistant and receives grounded answer.
12. `GET /api/benchmark`: Returns default 20-mission baseline benchmark metrics.
13. `POST /api/missions/:id/scenarios (LOW_BATTERY)`: Regression test verifying mode shift to `RECHARGE_STANDBY` and battery normalization on clear.

### 4.3 Frontend Integration Suite (`src/__tests__/app.integration.test.tsx` — 4 Tests)
Tests full user interface and user interaction flows:
1. Complete dashboard rendering without runtime exceptions.
2. Real-time telemetry HUD card updates on scenario injection.
3. Tab navigation between HUD, Tactical Surface Map, and AI Assistant.
4. Modal dialog controls for Baseline Comparison and 9 Rules Matrix.

---

## 5. Requirements to Test Traceability Matrix

| Requirement ID | System Requirement | Primary Test File | Specific Test Case | Verified |
| :--- | :--- | :--- | :--- | :---: |
| **REQ-TEL-01** | Deterministic Seeded Physics | `aegis.test.ts` | `produces identical deterministic telemetry runs with the same seed` | ✅ |
| **REQ-TEL-02** | Telemetry Stepping & History Ring Buffer | `backend.test.ts` | `POST /api/missions/:id/step advances ticks and updates telemetry and risk` | ✅ |
| **REQ-HAZ-01** | Low Battery Detection | `aegis.test.ts` | `detects Hazard 1: LOW_BATTERY` | ✅ |
| **REQ-HAZ-02** | Subsystem Overheat Detection | `aegis.test.ts` | `detects Hazard 2: OVERHEATING` | ✅ |
| **REQ-HAZ-04** | Wheel Slip & Entrapment | `aegis.test.ts` | `detects Hazard 5: ROVER_STUCK` | ✅ |
| **REQ-RSK-01** | Compounding Risk Multipliers | `aegis.test.ts` | `applies compounding multiplier when Low Battery + Comm Loss coincide` | ✅ |
| **REQ-MOD-01** | Mode Shift to Emergency Recovery | `aegis.test.ts` | `switches to EMERGENCY_RECOVERY when ROVER_STUCK hazard triggers` | ✅ |
| **REQ-MOD-02** | Mode Shift to Safe Hold | `aegis.test.ts` | `switches to SAFE_HOLD during critical comms loss` | ✅ |
| **REQ-REC-01** | Rocker-Bogie Extraction Pipeline | `backend.test.ts` | `executes the full scenario-to-decision pipeline for ROVER_STUCK` | ✅ |
| **REQ-ISO-01** | Multi-Mission State Quarantine | `testAudit.mjs` | `AUDITING MISSION ISOLATION (Alpha vs Beta)` | ✅ |
| **REQ-BNK-01** | Dynamic Headless Benchmark | `backend.test.ts` | `POST /api/benchmark executes headless benchmark comparing AEGIS vs teleoperation` | ✅ |
| **REQ-API-01** | Multi-Mission REST API Lifecycle | `backend.test.ts` | `supports creating, listing, retrieving, and isolating multiple missions` | ✅ |

---

## 6. Known Coverage Gaps & Weakly Tested Edges

1. **Long-Duration Continuous Ticking**: Background intervals are verified up to several minutes. Multi-day long-soak stability tests (e.g. 100,000 continuous ticks) have not been run.
2. **Network Interruption during Gemini LLM Calls**: Live Gemini calls are tested with valid keys and mocked fallbacks; intermittent network dropouts during streaming responses require additional automated mocking.
3. **Concurrent Multi-Client Read/Write**: Race conditions under 50+ simultaneous write requests to the same mission instance have not been stress-tested under load tools (e.g. Autocannon / k6).
