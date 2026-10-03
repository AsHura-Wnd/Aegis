# AEGIS — Autonomous Planetary Rover Mission-Intelligence & Safety System
**IndustrySolve Hackathon — IIIT Delhi**

AEGIS is an aerospace-grade planetary rover mission-intelligence and autonomous safety system designed for simulated Mars surface exploration (Jezero Crater Sector 4). It features:
- **Full-Stack Architecture**: React 19 + TypeScript + Tailwind frontend mission dashboard and an independent Node.js + Express + TypeScript REST API backend.
- **Server-Side Mission State Management**: Isolated mission instances with deterministic seeded simulation, background ticking, and replay.
- **9-Vector Hazard Detection Engine**: Continuous automated telemetry evaluation across power, thermal, mobility, communication, and terrain.
- **Dynamic Compounding Risk Assessment**: 0–100 scale with explicit change reasoning and multi-fault compounding risk multipliers.
- **Explainable Decision Engine**: Automated mode shifts, peristaltic crab-walk extraction, and full chronological decision & event stream.
- **Context-Aware AI Assistant**: Offline deterministic rule-based intelligence grounded in live simulation numbers, with optional Gemini 1.5 hybrid mode.
- **Headless Benchmark Engine**: Quantitative comparison of AEGIS on-board autonomy vs traditional 14-minute Earth ground teleoperation.

---

## 🚀 Quick Start Commands

```bash
# 1. Install all dependencies
npm install

# 2. Run complete test suite (33 unit & integration tests)
npm test

# 3. Run backend tests specifically
npm run test:backend

# 4. Start the Node.js + Express backend server (Port 3001)
npm run server

# 5. Start the Vite React frontend dashboard (Port 5173)
npm run dev

# 6. Production build check
npm run build
```

- **Frontend Dashboard**: [http://localhost:5173/](http://localhost:5173/)
- **Backend REST API**: [http://localhost:3001/](http://localhost:3001/)
- **API Health Check**: [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 🛰️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FRONTEND MISSION DASHBOARD (Port 5173)               │
│ - HUD Telemetry Monitors  - 2D Canvas Map  - Scenario Controls         │
│ - AI Intelligence Tab     - Rules Matrix   - Benchmark Modal           │
└────────────────────────────────────────────────────────────────────────┘
                                    ▲
                         REST APIs  │  JSON Payloads
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               NODE.JS + EXPRESS BACKEND SERVER (Port 3001)             │
│  [MissionService] ────► [MissionInstance: id, seed, isolated state]    │
│  [BenchmarkService] ──► Headless evaluation across N seeded missions   │
└────────────────────────────────────────────────────────────────────────┘
          │                                              │
          ▼                                              ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│     ROVER SIMULATION MODEL   │              │   9-VECTOR HAZARD ENGINE     │
│ - Bounded realistic physics  │ ──Telemetry─►│ 1. Low Battery Reserve       │
│ - 6-Wheel rocker-bogie slip  │              │ 2. Subsystem Overheating     │
│ - Diurnal solar & dust flux  │              │ 3. Extreme Cryogenic Cold    │
│ - Thermal balance (-100..80) │              │ 4. Excessive Wheel Slip      │
│ - Terrain digital elevation  │              │ 5. Locomotion Entrapment     │
└──────────────────────────────┘              │ 6. Solar Dust Deposition     │
               │                              │ 7. Weak Comm / LOS           │
               ▼                              │ 8. Dangerous Terrain Slope   │
┌──────────────────────────────┐              │ 9. Rapid Power Drain         │
│     2D TACTICAL SURFACE MAP  │              └──────────────────────────────┘
│ - Jezero Crater Sector 4 DEM │                              │
│ - Dynamic elevation contours │                              ▼
│ - Directional rover + LiDAR  │              ┌──────────────────────────────┐
│ - Color-coded trail & zones  │              │     DYNAMIC RISK ENGINE      │
└──────────────────────────────┘              │ - 0-100 score (LOW..CRITICAL)│
                                              │ - Compounding multipliers    │
                                              │ - "Why score changed" driver │
                                              └──────────────────────────────┘
                                                              │
    ┌─────────────────────────────────────────────────────────┴─────────────┐
    ▼                                                                       ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│  AUTONOMOUS DECISION ENGINE  │              │     AEGIS-CORE AI ASSISTANT  │
│ - Mode transition executive  │              │ - Grounded in live telemetry │
│ - Peristaltic extraction     │              │ - Deterministic rule engine  │
│ - Decision & event stream log│              │ - Optional Gemini 1.5 hybrid │
└──────────────────────────────┘              └──────────────────────────────┘
```

---

## 📡 Backend REST API Reference

All mission endpoints support multiple isolated missions using `:id` (e.g. `primary-mission`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend service health, uptime, and active mission count |
| `GET` | `/api/missions` | List all active mission instances |
| `POST` | `/api/missions` | Create a new isolated mission (`{ name, seed, id }`) |
| `GET` | `/api/missions/:id` | Get mission metadata and execution state |
| `DELETE` | `/api/missions/:id` | Delete mission instance and clean up background timers |
| `POST` | `/api/missions/:id/step` | Advance simulation by N ticks (`{ count?: number, dt?: number }`) |
| `POST` | `/api/missions/:id/start` | Start server-side continuous ticking (`{ speedMultiplier?: number }`) |
| `POST` | `/api/missions/:id/pause` | Pause server-side ticking |
| `GET` | `/api/missions/:id/telemetry`| Get current telemetry snapshot and historical buffer |
| `GET` | `/api/missions/:id/hazards` | Get active hazards and rule configurations |
| `PUT` | `/api/missions/:id/hazards/:type` | Update hazard rule thresholds or enable/disable (`{ moderateThreshold, criticalThreshold, enabled }`) |
| `GET` | `/api/missions/:id/risk` | Get dynamic risk score, level, drivers, and compounding reasoning |
| `GET` | `/api/missions/:id/scenarios`| List all 6 demonstration scenarios in catalog |
| `POST` | `/api/missions/:id/scenarios`| Inject fault scenario (`{ scenarioId: "ROVER_STUCK" \| "LOW_BATTERY" \| ... }`) |
| `POST` | `/api/missions/:id/scenarios/clear` | Clear all active faults and return subsystems to nominal |
| `POST` | `/api/missions/:id/mitigate` | Execute autonomous mitigation protocol (`{ hazardType?: string }`) |
| `GET` | `/api/missions/:id/decisions`| Get most recent autonomous decision and event stream logs (filterable by `category`) |
| `POST` | `/api/missions/:id/assistant`| Context-aware AI assistant query (`{ query: string, apiKey?: string }`) |
| `POST` | `/api/missions/:id/reset` | Reset mission to initial state with seed (`{ seed?: number }`) |
| `POST` | `/api/missions/:id/replay`| Replay mission from tick 0 with identical seed |
| `POST` | `/api/benchmark` | Run headless benchmark across N seeded missions comparing AEGIS vs teleoperation |

---

## 🛡️ The 9 Monitored Hazard Vectors

| # | Hazard Name | Subsystem | Warning Threshold | Critical Threshold | Automated Mitigation Protocol |
|---|-------------|-----------|-------------------|--------------------|--------------------------------|
| 1 | **Low Battery Reserve** | Power | SOC ≤ 25% | SOC ≤ 15% | Engage Low-Power Safeguard; suspend science operations; reroute to Solis Plateau Solar Haven. |
| 2 | **Subsystem Overheating** | Thermal | Motors ≥ 50°C | Motors ≥ 68°C | Halt drive motors; deploy radiator louvers; idle compute cores until < 45°C. |
| 3 | **Extreme Cryogenic Cold** | Thermal | Core ≤ -35°C | Core ≤ -50°C | Activate electric heating coils; orient solar array towards sun vector; enter thermal hibernation. |
| 4 | **Excessive Wheel Slip** | Mobility | Slip ≥ 35% | Slip ≥ 60% | Modulate wheel torque by -40%; engage differential slip control; reverse track 1.5m. |
| 5 | **Locomotion Entrapment** | Mobility | Stall > 2 ticks | Stall ≥ 3 ticks | Lock steering actuators; engage autonomous peristaltic rocker-bogie crab-walk sequence. |
| 6 | **Solar Dust Deposition** | Power | Efficiency ≤ 60%| Efficiency ≤ 35% | Gimbal solar arrays toward direct sun vector; recalculate diurnal budget; wait for wind event. |
| 7 | **Weak Comm Link / LOS** | Comm | Link ≤ -92 dBm | Link ≤ -108 dBm | Switch to Full Autonomous Safeguard Mode (ASM); buffer data locally; steer to high vantage. |
| 8 | **Dangerous Terrain** | Environment | Incline ≥ 18° | Incline ≥ 24° | Apply mechanical parking brake; synthesize 3D stereo point cloud; compute detour spline. |
| 9 | **Rapid Power Drain** | Power | Draw ≥ 380 W | Draw ≥ 450 W | Isolate auxiliary science bus; sequentially diagnose motor inverters; low quiescent state. |

---

## 🎮 The 6 Demonstration Scenarios

1. **Depleted Battery Emergency (`LOW_BATTERY`)**: Injects accelerated discharge, dropping battery below 18%. Forces operational mode to `RECHARGE_STANDBY` and recalculates trajectory to the nearest solar haven.
2. **Loose Dune Sand Entrapment (`ROVER_STUCK`)**: Simulates drift sand sinkage in the Neretva Sand Sea. Wheel slip reaches 88%, actual speed drops to 0.00 m/s despite motor torque, current spikes to 11A. Autonomous decision engine commands peristaltic crab-walk.
3. **Orbiter Loss-of-Signal (`COMM_LOSS`)**: Simulates canyon obstruction. Signal strength attenuates to -116 dBm with 98% packet loss. Proves the rover immediately transitions to `SAFE_HOLD` / ASM autonomy without requiring Earth intervention.
4. **Drive Actuator Thermal Runaway (`EXTREME_TEMP`)**: Spikes motor temperatures to 70°C+, triggering radiator deployment and automated motor cooling idle.
5. **Martian Dust Storm (`SOLAR_DUST`)**: Deposits regolith dust on photovoltaic panels, dropping solar efficiency to 22%.
6. **Belva Crater Scarp Incline (`HAZARDOUS_TERRAIN`)**: Simulates encountering a 27° scree slope, triggering emergency traverse braking and contour-following detour planning.

---

## 🧪 Verification & Test Results

The automated test suite runs with `npm test` (`vitest`):
- **33 Unit & Integration Tests**: 100% passing across 3 test files.
  - **`src/__tests__/backend.test.ts` (11 tests)**:
    - Service health endpoint
    - Multi-mission creation, listing, retrieval, deletion, and complete state isolation
    - Stepping simulation, telemetry and risk updates
    - Start and pause controls
    - Hazard retrieval and threshold updates
    - Dynamic risk score calculation and change reasoning
    - Complete scenario-to-decision pipeline for `ROVER_STUCK` (injection -> CRITICAL risk -> hazard detection -> mode shift -> autonomous peristaltic decision -> mitigation execution -> recovery)
    - Fault injection for all remaining 5 scenarios
    - Context-aware AI assistant queries grounded in live simulation numbers
    - Seeded reset and replay
    - Headless benchmark execution comparing AEGIS vs teleoperation
  - **`src/__tests__/aegis.test.ts` (18 tests)**:
    - Bounded telemetry physics and deterministic pseudo-random replayability
    - All 9 hazard vector thresholds and detection logic
    - Dynamic risk score computation and compounding multiplier combinations
    - Autonomous decision engine mode transitions and event logging
    - Deterministic AI assistant response accuracy
  - **`src/__tests__/app.integration.test.tsx` (4 tests)**:
    - Frontend component tree mounting, tab navigation, scenario injection, and modal dialogs

---

## 🎬 Step-by-Step Live Demo Script

1. **Verify Backend Service**:
   - Query `http://localhost:3001/api/health` to confirm the backend is running.
2. **Launch Mission Control**:
   - Open dashboard at `http://localhost:5173/`.
   - Point out the live Mission Elapsed Time (`MET`), nominal telemetry tiles, green `LOW RISK (5/100)` banner, and the rover navigating along waypoints on the 2D Jezero Crater map.
3. **Inject Fault via API or UI (Scenario: Loose Dune Sand Entrapment)**:
   - Click **Loose Dune Sand Entrapment** (or send `POST /api/missions/primary-mission/scenarios` with `{"scenarioId": "ROVER_STUCK"}`).
   - Point out the instant reactions:
     - 6-wheel slip status jumps to **85%** with red indicators; speed drops to **0.00 m/s** with **11A** motor stall current.
     - Risk banner escalates to **`CRITICAL RISK (100/100)`** with clear compounding reasoning.
     - Hazard panel displays `Locomotion Entrapment (Rover Stuck)`.
     - Decision stream logs `AUTONOMOUS DECISION: Engage Rocker-Bogie Peristaltic Crab-Walk extraction protocol`.
4. **Execute Autonomous Mitigation**:
   - Click **Execute Mitigation** (or send `POST /api/missions/primary-mission/mitigate`).
   - Watch the rover stabilize, slip return to 9%, mode return to `AUTONOMOUS_TRANSIT`, and risk drop back to `LOW`.
5. **Communication Blackout & Autonomy Handover**:
   - Click **Orbiter Loss-of-Signal (LOS)**.
   - Signal drops to -116 dBm; operational mode switches automatically to `SAFE_HOLD` (Autonomous Safeguard Mode), demonstrating zero dependency on Earth ground commands.
6. **Consult AI Assistant**:
   - Switch to the **AEGIS-Core AI** tab.
   - Click prompt chip *"Why is the battery dropping?"* or *"What should the rover do next?"*.
   - Point out how the assistant cites exact live numbers (battery SOC, net watt deficit, high draw components) and recommends routing to **Solis Plateau Solar Haven**.
7. **Run Headless Benchmark**:
   - Click **Benchmark** (or send `POST /api/benchmark`).
   - Present the quantitative benchmark: 1400x faster incident resolution, +280% traverse speedup, and 100% survival rate vs traditional 14-min Earth ground teleoperation.
8. **Reset & Replay**:
   - Click the **Reset** button in the playback bar.
   - Show that all states, coordinates, and telemetry reset cleanly to `MET 00:00:00` at the landing site, ready to repeat.
