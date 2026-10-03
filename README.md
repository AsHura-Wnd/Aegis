# AEGIS — Autonomous Planetary Rover Mission-Intelligence & Safety Dashboard
**IndustrySolve Hackathon — IIIT Delhi**

AEGIS is an aerospace-grade, software-only planetary rover mission-intelligence and autonomous safety system designed for simulated Mars exploration (Jezero Crater Sector 4). It provides real-time telemetry monitoring, a 9-vector rule-based hazard detection engine, dynamic compounding risk assessment, an explainable decision stream, an interactive 2D tactical surface map, 6 reproducible scenario injection controls, and a context-aware AI mission assistant that functions with 100% deterministic fidelity without requiring external APIs or hardware.

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (22 unit & integration tests)
npm test

# 3. Start local mission control dashboard
npm run dev

# 4. Production build
npm run build
```

Open your browser to `http://localhost:5173/` (or `http://127.0.0.1:5173/`).

---

## 🛰️ Architecture & Core Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                          AEGIS MISSION CONTROL                         │
│  [Mission Clock: MET]  [Operational Mode: ASM/TRANSIT]  [Seed: 1337]   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
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

1. **Depleted Battery Emergency (`LOW_BATTERY`)**: Injects accelerated discharge, dropping battery below 15%. Forces operational mode to `RECHARGE_STANDBY` and recalculates trajectory to the nearest solar haven.
2. **Loose Dune Sand Entrapment (`ROVER_STUCK`)**: Simulates drift sand sinkage in the Neretva Sand Sea. Wheel slip reaches 88%, actual speed drops to 0.00 m/s despite motor torque, current spikes to 11A. Autonomous decision engine commands peristaltic crab-walk.
3. **Orbiter Loss-of-Signal (`COMM_LOSS`)**: Simulates canyon obstruction. Signal strength attenuates to -116 dBm with 98% packet loss. Proves the rover immediately transitions to `SAFE_HOLD` / ASM autonomy without requiring Earth intervention.
4. **Drive Actuator Thermal Runaway (`EXTREME_TEMP`)**: Spikes motor temperatures to 74°C, triggering radiator deployment and automated motor cooling idle.
5. **Martian Dust Storm (`SOLAR_DUST`)**: Deposits regolith dust on photovoltaic panels, dropping solar efficiency to 22%.
6. **Belva Crater Scarp Incline (`HAZARDOUS_TERRAIN`)**: Simulates encountering a 27° scree slope, triggering emergency traverse braking and contour-following detour planning.

---

## 🤖 Context-Aware AI Mission Assistant

- **100% Offline Deterministic Rules Engine**: Evaluates live telemetry values, active hazard vectors, risk scores, and operational modes to generate grounded answers without hallucinating numbers.
- **Pre-configured Demo Prompts**:
  - *"Is the rover safe right now?"*
  - *"Why is the battery dropping?"*
  - *"What should the rover do next?"*
  - *"Explain current risk score and top hazards."*
  - *"What is recommended for stuck state or high slip?"*
- **Optional Gemini 1.5 Hybrid Integration**: Users can paste an optional Google AI API key via the modal for LLM synthesis; automatically falls back to deterministic rules if offline or key is omitted.
- **Safety Disclaimer**: Prominently displays *"Simulated Autonomous Mission Intelligence Protocol — No hardware commands issued."*

---

## 🧪 Verification & Test Results

The test suite runs with `npm test` (`vitest`):
- **22 Unit & Integration Tests**: 100% passing.
- Test coverage includes:
  - Bounded telemetry physics and deterministic pseudo-random replayability.
  - All 9 hazard vector thresholds and detection logic.
  - Dynamic risk score computation and compounding multiplier combinations.
  - Autonomous decision engine mode transitions and event logging.
  - Context-grounded deterministic AI assistant responses.
  - UI mounting, tab navigation, scenario injection, and modal dialogs.

---

## 🎬 Step-by-Step Live Demo Script

1. **Mission Start**:
   - Open dashboard at `http://localhost:5173/`.
   - Point out the live Mission Elapsed Time (`MET`), nominal telemetry tiles, green `LOW RISK (8/100)` banner, and the rover navigating along waypoints on the 2D Jezero Crater map.
2. **Inject Terrain Fault (Scenario: Loose Dune Sand Entrapment)**:
   - In the Scenario Simulator panel, click **Loose Dune Sand Entrapment**.
   - Note the immediate transition:
     - 6-wheel slip status jumps to 85% with red indicators.
     - Actual speed drops to 0.00 m/s with 11A motor stall current.
     - Risk banner turns crimson: `CRITICAL RISK (82/100)`.
     - Hazard panel displays `Locomotion Entrapment (Rover Stuck)`.
     - Decision stream logs `AUTONOMOUS DECISION: Engage Rocker-Bogie Peristaltic Crab-Walk extraction protocol`.
3. **Execute Mitigation**:
   - Click **Execute Mitigation** on the active hazard card or **Clear All Faults / Recover**.
   - Watch the rover stabilize, slip return to 8%, and risk drop back to `LOW`.
4. **Inject Communication Blackout (Scenario: Orbiter Loss-of-Signal)**:
   - Click **Orbiter Loss-of-Signal (LOS)**.
   - Signal drops to -116 dBm; operational mode switches automatically to `SAFE_HOLD` (Autonomous Safeguard Mode).
   - Point out that AEGIS continues autonomous local navigation decisions without Earth ground link.
5. **Inject Battery Emergency & Consult AI**:
   - Click **Depleted Battery Emergency**.
   - Switch to the **AEGIS-Core AI** tab.
   - Click the prompt chip: *"Why is the battery dropping?"*.
   - Show how AEGIS cites the exact live telemetry (e.g. current battery %, net power deficit, stall draw) and recommends diverting to the **Solis Plateau Solar Haven**.
   - Click *"What should the rover do next?"* to show actionable mitigation steps.
6. **Review Mission Timeline & Rules Matrix**:
   - Switch to the **Decision Stream** tab to show the chronological event log and export it as JSON.
   - Click **Rules (9)** in the header to show the full configurable threshold matrix.
   - Click **Benchmark** to show the quantitative comparison of AEGIS Autonomy vs Traditional 14-min Earth ground teleoperation (+166% speed, 98.6% survival).
7. **Reset & Replay**:
   - Click the **Reset** button in the playback bar.
   - Show that all states, coordinates, and telemetry reset cleanly to `MET 00:00:00` at the landing site, ready to repeat.
