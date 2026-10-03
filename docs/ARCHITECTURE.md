# AEGIS — System Architecture Specification

The **Autonomous Exploration & Ground Intelligence System (AEGIS)** is designed as an edge-autonomous, server-orchestrated rover safety and mission-intelligence architecture for simulated planetary surface operations (Mars Jezero Crater Sector 4).

---

## 1. High-Level Architecture Overview

AEGIS employs a decoupled full-stack architecture:
1. **Core Autonomy & Simulation Backend** ([`src/server/`](file:///d:/Projects/Aegis/src/server/)): A standalone Node.js + Express + TypeScript service that manages mission lifecycles, runs deterministic kinematic physics, evaluates continuous hazard vectors, calculates compounding risk, and executes autonomous mitigations.
2. **Mission Control Frontend Dashboard** ([`src/components/`](file:///d:/Projects/Aegis/src/components/)): A high-performance React 19 + TypeScript + Tailwind mission dashboard that polls and renders telemetry HUDs, dynamic tactical 2D DEM canvas maps, 9-rule matrix configurations, live hazard streams, and benchmark visualizations.

```mermaid
flowchart TB
    subgraph Frontend["Frontend Mission Control (Port 5173)"]
        UI_HUD["Telemetry HUD & Charts"]
        UI_MAP["2D Tactical Surface DEM Map"]
        UI_SCEN["Fault Injection & Mitigation Panel"]
        UI_AI["AI Mission Assistant Interface"]
        UI_BENCH["Headless Benchmark Modal"]
    end

    subgraph Backend["AEGIS Backend REST Service (Port 3001)"]
        direction TB
        ROUTER["Express API Router\n(/api/missions, /api/benchmark, /api/health)"]

        subgraph MissionService["Mission Lifecycle & Isolation Manager"]
            MAP_STORE[("In-Memory Mission Store\nMap<id, MissionInstance>")]
            INST_ALPHA["MissionInstance: primary-mission"]
            INST_BETA["MissionInstance: mission-N"]
        end

        subgraph MissionCore["MissionInstance Runtime Core"]
            SIM["RoverSimulationModel\n(Seeded PRNG Physics)"]
            HAZ["HazardDetectionEngine\n(9 Deterministic Rules)"]
            RISK["DynamicRiskEngine\n(Additive & Compounding Risk)"]
            DEC["AutonomousDecisionEngine\n(Mode Shift & Mitigation Executive)"]
            AI["AegisAIAssistant\n(Rule Fallback + Optional LLM)"]
        end

        BENCH["HeadlessBenchmarkEngine\n(N-Mission Monte Carlo Runner)"]
    end

    UI_HUD <-->|GET /api/missions/:id/telemetry| ROUTER
    UI_MAP <-->|GET /api/missions/:id/telemetry| ROUTER
    UI_SCEN <-->|POST /api/missions/:id/scenarios| ROUTER
    UI_AI <-->|POST /api/missions/:id/assistant| ROUTER
    UI_BENCH <-->|POST /api/benchmark| ROUTER

    ROUTER --> MAP_STORE
    MAP_STORE --> INST_ALPHA
    INST_ALPHA --- MissionCore
    ROUTER --> BENCH
    BENCH -.->|Spawns headless instances| SIM
```

---

## 2. Backend Component Responsibilities

| Component | Source File | Core Responsibility |
| :--- | :--- | :--- |
| **Server Entrypoint** | [`src/server/server.ts`](file:///d:/Projects/Aegis/src/server/server.ts) | Binds HTTP listener (Port 3001), handles process signals (SIGINT/SIGTERM), triggers graceful cleanup. |
| **Express Application** | [`src/server/app.ts`](file:///d:/Projects/Aegis/src/server/app.ts) | Configures CORS, JSON parsers, route middleware, request logging, 404 handler, and global error handling. |
| **Mission Service** | [`src/server/services/missionService.ts`](file:///d:/Projects/Aegis/src/server/services/missionService.ts) | Manages multi-mission map, generates IDs, ensures unique mission isolation, creates default Jezero mission. |
| **Mission Instance** | [`src/server/models/missionInstance.ts`](file:///d:/Projects/Aegis/src/server/models/missionInstance.ts) | Owns dedicated simulation, hazard, risk, and decision engine instances. Coordinates background interval timers. |
| **Benchmark Service** | [`src/server/services/benchmarkService.ts`](file:///d:/Projects/Aegis/src/server/services/benchmarkService.ts) | Headless Monte Carlo engine simulating N missions to measure survival rates and edge autonomy speedup. |
| **Simulation Model** | [`src/simulation/roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts) | Seeded PRNG kinematic physics, 6-wheel rocker-bogie slip, solar diurnal cycles, and thermal exchange. |
| **Hazard Engine** | [`src/engines/hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Real-time threshold evaluation across 9 continuous telemetry vectors. |
| **Risk Engine** | [`src/engines/riskEngine.ts`](file:///d:/Projects/Aegis/src/engines/riskEngine.ts) | 0–100 risk scoring with additive points, floor guarantees, and 5 compounding interaction multipliers. |
| **Decision Engine** | [`src/engines/decisionEngine.ts`](file:///d:/Projects/Aegis/src/engines/decisionEngine.ts) | Mode transition logic, peristaltic extraction command triggers, and chronological audit event logging. |
| **AI Assistant** | [`src/engines/aiAssistantEngine.ts`](file:///d:/Projects/Aegis/src/engines/aiAssistantEngine.ts) | Natural language query engine grounded in live telemetry, with offline deterministic rules and Gemini fallback. |

---

## 3. Telemetry-to-Decision Pipeline

Every simulation step (`dtSeconds >= 0`) executes a strict sequential pipeline:

```mermaid
flowchart TD
    A["1. Tick Trigger\n(API POST /step or Background Timer)"] --> B["2. RoverSimulationModel.step(dt)"]
    
    subgraph SimModel["Simulation Kinematics"]
        B --> B1["Terrain Sampling at (X, Y)\n(Slope, Roughness, DEM Attenuation)"]
        B1 --> B2["Wheel Slip & Motor Current Calculations\n(6 Rocker-Bogie Hubs: FL, FR, ML, MR, RL, RR)"]
        B2 --> B3["Thermal Balance Engine\n(Atmospheric Radiative Dissipation vs Drive Friction)"]
        B3 --> B4["Diurnal Solar & Dust Accumulation\n(Sun Elevation Angle, Dust Factor, Net Watts)"]
        B4 --> B5["Displacement & Heading Trajectory Integration\n(Waypoints WP-0 to WP-5)"]
    end

    B5 --> C["3. HazardDetectionEngine.evaluate(telemetry)"]
    
    subgraph HazardEval["9-Vector Hazard Detection"]
        C --> C1["Evaluate Battery, Overheating, Cold"]
        C --> C2["Evaluate Slip, Locomotion Stuck, Power Drain"]
        C --> C3["Evaluate Dust Deposition, Comm Loss, Steep Terrain"]
    end

    C3 --> D["4. DynamicRiskEngine.calculateRisk(telemetry, hazards)"]
    
    subgraph RiskCalc["Dynamic Compounding Risk"]
        D --> D1["Base Environmental Risk (Slope, Roughness, SoC)"]
        D1 --> D2["Additive Severity Points (Low: +12, Mod: +24, High: +46, Crit: +78)"]
        D2 --> D3["Compounding Interaction Multipliers (+25% to +40%)"]
        D3 --> D4["Enforce Severity Floor & Clamp to [0, 100]"]
    end

    D4 --> E["5. AutonomousDecisionEngine.evaluateDecisions(telemetry, hazards, risk)"]
    
    subgraph DecisionExec["Autonomous Safety Executive"]
        E --> E1{"Active Critical Hazards?"}
        E1 -->|ROVER_STUCK| E2["Override Mode: EMERGENCY_RECOVERY\n(Engage Rocker-Bogie Peristaltic Crab-Walk)"]
        E1 -->|LOW_BATTERY| E3["Override Mode: RECHARGE_STANDBY\n(Divert to Solis Plateau Haven)"]
        E1 -->|COMM_LOSS| E4["Override Mode: SAFE_HOLD\n(Switch to Autonomous Safeguard Mode ASM)"]
        E1 -->|DANGEROUS_TERRAIN| E5["Override Mode: HAZARD_AVOIDANCE\n(Generate Detour Spline)"]
        E1 -->|None / Cleared| E6["Override Mode: AUTONOMOUS_TRANSIT\n(Resume Science Waypoint Navigation)"]
    end

    E2 --> F["6. Telemetry History & Event Stream Update"]
    E3 --> F
    E4 --> F
    E5 --> F
    E6 --> F
```

---

## 4. Operational Modes & State Transitions

The rover operates under a 5-mode safety executive state machine:

```mermaid
stateDiagram-v2
    [*] --> AUTONOMOUS_TRANSIT: Mission Initialized (Seed N)

    AUTONOMOUS_TRANSIT --> EMERGENCY_RECOVERY: Zero displacement & Stall Current > 9A (ROVER_STUCK)
    AUTONOMOUS_TRANSIT --> RECHARGE_STANDBY: Battery Reserve < 15% (LOW_BATTERY)
    AUTONOMOUS_TRANSIT --> SAFE_HOLD: Comm RSSI < -108 dBm (COMM_LOSS)
    AUTONOMOUS_TRANSIT --> HAZARD_AVOIDANCE: Incline > 20° or Roughness > 0.85 (DANGEROUS_TERRAIN)

    EMERGENCY_RECOVERY --> AUTONOMOUS_TRANSIT: Crab-walk extrication successful / Fault cleared
    RECHARGE_STANDBY --> AUTONOMOUS_TRANSIT: Solar charge recovered > 70% / Fault cleared
    SAFE_HOLD --> AUTONOMOUS_TRANSIT: Telemetry link restored / Autonomous override cleared
    HAZARD_AVOIDANCE --> AUTONOMOUS_TRANSIT: Obstacle circumnavigated / Regolith slope nominal
```

| Mode | Trigger Conditions | Automated Actions |
| :--- | :--- | :--- |
| **`AUTONOMOUS_TRANSIT`** | All 9 hazard vectors nominal; regolith slope `< 18°`. | Standard waypoint navigation (speed: 0.12–0.18 m/s, forward heading locked). |
| **`EMERGENCY_RECOVERY`** | `ROVER_STUCK` (0 m/s for 3 ticks with stall amps > 9.5A). | Locks steering, activates rocker-bogie peristaltic crab-walk, reverses wheel torque. |
| **`SAFE_HOLD`** | `COMM_LOSS` (`< -108 dBm`). | Halts locomotion, buffers telemetry to flash RAM, enters low-power safeguard. |
| **`HAZARD_AVOIDANCE`** | `DANGEROUS_TERRAIN` (slope `> 24°`), `WHEEL_SLIP > 0.60`. | Throttles speed by 50%, brakes, samples local DEM mesh, generates detour spline. |
| **`RECHARGE_STANDBY`** | `LOW_BATTERY` (`< 15%`), photovoltaic dust deposition (`> 75%`). | Suspends science payloads, halts night transit, diverts to Solis Plateau Solar Haven. |

---

## 5. Hazard Response & Autonomous Recovery Workflow

When a critical fault occurs, the system responds within 1–2 execution ticks without waiting for Earth intervention:

```mermaid
sequenceDiagram
    autonumber
    participant Rover as RoverSimulationModel
    participant HazEng as HazardDetectionEngine
    participant RiskEng as DynamicRiskEngine
    participant DecEng as AutonomousDecisionEngine
    participant Mission as MissionInstance
    participant Ground as Operator / Dashboard

    Rover->>HazEng: Telemetry (Slip: 88%, Speed: 0 m/s, Current: 10.4A)
    HazEng->>HazEng: Match Rule 'ROVER_STUCK' (Threshold: 3 ticks stall)
    HazEng-->>RiskEng: Active Hazard: Locomotion Entrapment (CRITICAL)
    RiskEng->>RiskEng: Compound Risk: Stuck + Stall Current Draw (+35%)
    RiskEng-->>DecEng: Risk Score: 100/100 (CRITICAL)
    DecEng->>DecEng: Evaluate State: Trigger EMERGENCY_RECOVERY
    DecEng->>Rover: Set Mode: EMERGENCY_RECOVERY
    DecEng-->>Mission: Generate Decision Log: "Engage Rocker-Bogie Crab-Walk"
    Mission-->>Ground: Broadcast Telemetry & Decision Event
    Note over Ground,Rover: In Baseline Teleoperation, rover would wait 14-45 mins.<br/>AEGIS executes recovery at the edge immediately.
    Ground->>Mission: POST /api/missions/:id/mitigate
    Mission->>Rover: Execute Peristaltic Articulation & Extricate Wheels
    Mission->>Rover: Clear Faults & Restore Nominal Transit Mode
    Rover-->>Ground: Telemetry Normalized (Mode: AUTONOMOUS_TRANSIT, Risk: 5/100)
```

---

## 6. Mission Isolation & Lifecycle Management

Missions are isolated within [`MissionService`](file:///d:/Projects/Aegis/src/server/services/missionService.ts) via an in-memory dictionary:
- **Unique Instances**: Each mission instantiates its own `RoverSimulationModel` (with independent PRNG seed), `HazardDetectionEngine` (with configurable rule thresholds), `DynamicRiskEngine`, `AutonomousDecisionEngine`, and `AegisAIAssistant`.
- **Timer Quarantine**: Background simulation loops run on independent `setInterval` timers. The `start()`, `pause()`, `reset()`, and `cleanup()` methods invoke `stopTimer()`, preventing timer collisions or cross-mission leakage.
- **Garbage Collection**: Calling `DELETE /api/missions/:id` stops all active interval timers and removes the instance from the lookup map.

---

## 7. Headless Benchmark Architecture

The [`HeadlessBenchmarkEngine`](file:///d:/Projects/Aegis/src/server/services/benchmarkService.ts) runs Monte Carlo batch simulations without HTTP overhead or DOM rendering:
- Simulates $N$ independent rover missions across varying pseudo-random seeds ($1000 + m \times 37$).
- Simulates realistic mid-traverse fault injections (stuck, low battery, overheating).
- Measures empirical survival rates, power consumption, traverse velocity, and resolution times between:
  1. **AEGIS Edge Autonomy**: Resolves incidents autonomously within 1.8 seconds (1–2 ticks).
  2. **Baseline Ground Teleoperation**: Stalls during the 14–45 minute Earth round-trip light-delay window (modeled as 2550 seconds per incident with a 35% stall failure risk).
- Metrics are calculated dynamically from actual accumulated simulation ticks—never hardcoded.
