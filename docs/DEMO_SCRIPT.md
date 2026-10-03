# AEGIS — Hackathon Demonstration Script & Walkthrough

This document provides a concise, repeatable **3–5 minute live demonstration walkthrough** for presenting AEGIS to hackathon judges, technical evaluators, and mission operations audiences.

---

## ⏱️ Live Demo Timing Overview (3–5 Minutes)

```
0:00 - 0:45 | 1. The Mars Autonomy Challenge (14-min Comm Trap vs. Edge Autonomy)
0:45 - 1:30 | 2. System Launch & Clean State Verification (Backend Port 3001 & Frontend 5173)
1:30 - 3:00 | 3. Live 6-Scenario Fault Walkthrough & Autonomous Edge Mitigations
3:00 - 3:45 | 4. Empirical Validation: Headless Monte Carlo Benchmark Engine
3:45 - 4:30 | 5. Explainable Decision Stream & Grounded AI Assistant
4:30 - 5:00 | 6. Resilient Architecture & Fallback Demonstration (Zero-Crash Guarantee)
```

---

## Act 1: The Mars Problem (0:00 – 0:45)

**Presenter Pitch:**
> *"In 2009, NASA's Spirit rover was permanently lost in a hidden sand trap at Troy. Because commands from Earth take 14 to 45 minutes round-trip, ground engineers could not intervene in time. By the time ground telemetry arrived, the wheels were hopelessly bogged down.*
>
> *AEGIS (Autonomous Exploration & Ground Intelligence System) replaces slow ground loops with an autonomous edge safety executive. It continuously evaluates 9 hazard vectors, calculates compounding risk, shifts operational modes dynamically, and executes extrication protocols in milliseconds—without waiting for Earth."*

---

## Act 2: Clean Launch & Health Check (0:45 – 1:30)

### 1. Launch Services
Start the application from a clean state:

```bash
# Terminal 1: Backend REST Service (Port 3001)
npm run server

# Terminal 2: Frontend Mission Control Dashboard (Port 5173)
npm run dev
```

### 2. Verify Health
Open browser to `http://localhost:5173/`. Verify:
- Top Header Badge: **`API 3001: ONLINE`** (confirmed connection to Express REST backend).
- Active Mission Selector: **`primary-mission`** (Jezero Primary Exploration).
- Subsystem Telemetry Cards: Battery (88.5%), Motor Temp (28.2°C), Solar (87.5%), Relay Link (-74.5 dBm).
- 2D Tactical Reconnaissance Map: Jezero Crater Sector 4 with path trail and waypoints.
- Overall Risk Banner: **`LOW RISK (5/100)`** with 0 active hazards.

---

## Act 3: Walkthrough of All 6 Fault Scenarios (1:30 – 3:00)

Walk through each fault scenario in the **Scenario Simulator & Fault Injection** panel:

### 1. Depleted Battery Emergency (`LOW_BATTERY`)
- **Click**: `Depleted Battery Emergency`
- **Observe**: Battery drops below 15%, risk escalates to `CRITICAL (80/100)`, mode shifts to `RECHARGE_STANDBY`.
- **Decision Stream**: Logs `Cut power to scientific instruments, orient toward Solis Plateau Recharge Station`.
- **Click**: `Clear All Faults / Recover` (restores nominal transit).

### 2. Loose Dune Sand Entrapment (`ROVER_STUCK`)
- **Click**: `Loose Dune Sand Entrapment`
- **Observe**: 6-Wheel slip escalates to 88%, forward speed drops to 0.0 m/s, mode shifts to **`EMERGENCY_RECOVERY`** (pulsing red).
- **Hazard Panel**: Shows `Locomotion Entrapment (Rover Stuck)` with compounding risk multiplier (+35%).
- **Edge Mitigation**: Click **`Execute Mitigation`** on the hazard card.
- **Observe**: Rocker-bogie peristaltic crab-walk triggers, extricating the rover; mode returns to `AUTONOMOUS_TRANSIT`.
- **Click**: `Clear All Faults / Recover`.

### 3. Orbiter Loss-of-Signal (`COMM_LOSS`)
- **Click**: `Orbiter Loss-of-Signal (LOS)`
- **Observe**: Signal attenuates to -116 dBm, packet loss spikes to 98%, mode transitions to **`SAFE_HOLD`**.
- **Key Point**: Teleoperation freezes; AEGIS holds safe station and buffers telemetry autonomously.
- **Click**: `Clear All Faults / Recover`.

### 4. Drive Actuator Thermal Runaway (`EXTREME_TEMP`)
- **Click**: `Drive Actuator Thermal Runaway`
- **Observe**: Motor temp rises to 74°C, triggering `Subsystem Thermal Overheating` hazard.
- **Click**: `Clear All Faults / Recover`.

### 5. Martian Dust Storm Deposition (`SOLAR_DUST`)
- **Click**: `Martian Dust Storm Deposition`
- **Observe**: Photovoltaic efficiency plummets to 22%, triggering `Solar Panel Dust Deposition`.
- **Click**: `Clear All Faults / Recover`.

### 6. Belva Crater Scarp Incline (`HAZARDOUS_TERRAIN`)
- **Click**: `Belva Crater Scarp Incline`
- **Observe**: Slope reaches 27° with high roughness, triggering `Hazardous Terrain (Slope / Roughness)` and emergency brake.
- **Click**: `Clear All Faults / Recover`.

---

## Act 4: Headless Monte Carlo Benchmark (3:00 – 3:45)

**Presenter Pitch:**
> *"How do we prove autonomy outperforms traditional teleoperation? We run a headless Monte Carlo benchmark engine directly on the backend simulating dozens of missions under identical hazard distributions."*

1. Click **`Benchmark`** in the top header.
2. Click **`Run Benchmark`** in the modal.
3. Observe live calculation over 25 seeded missions:
   - **Incident Resolution**: **1.8s (AEGIS Edge)** vs **42.5 min (Ground Teleoperation)** (~1400x speedup).
   - **Mission Survival**: **98–100% (AEGIS)** vs **64–75% (Teleoperation)**.
   - **Power Conserved**: **+17% to +31%** through early stall avoidance.
   - **Traverse Velocity**: **+166% to +275%** by eliminating ground stop-and-wait cycles.
4. Close modal.

---

## Act 5: Explainable AI Assistant & Mission Controls (3:45 – 4:30)

1. Click the **`AEGIS-Core AI`** tab.
2. Click the quick prompt: **`"Is the rover safe right now?"`**
3. Observe the response: Context-grounded assessment using live vehicle telemetry and active hazards without hallucination.
4. Click the **`Rules (9)`** button in the header: Inspect the 9-vector threshold matrix (Power, Thermal, Mobility, Communication, Terrain).
5. Demonstrate mission controls:
   - Click **`Pause`** -> MET clock halts.
   - Click **`Start`** -> MET clock resumes.
   - Click **`Reset Simulation`** -> MET resets to `00:00:00` (Seed 1337).

---

## Act 6: Fallback Plan & Live Failure Recovery (4:30 – 5:00)

If any unexpected glitch occurs during the live demonstration:

| Failure Mode | Root Cause | Instant Recovery Action |
| :--- | :--- | :--- |
| **Backend dies or restarted** | Server killed or terminal closed | **Zero UI crash**: Frontend gracefully displays `API: LOCAL` and continues running local physics simulation in browser. When backend restarts, it auto-reconnects to `API 3001: ONLINE`. |
| **Port 3001 conflict** | Old process lingering on port | Run `npx kill-port 3001 && npm run server`. |
| **Browser tab frozen** | High-frequency animation tab backgrounded | Refresh `http://localhost:5173/` — state auto-syncs from backend `primary-mission`. |
| **Live UI fails entirely** | Display / projector issue | Run headless validation CLI script: `node scripts/validateBackend.mjs` to output full 22-endpoint JSON proof to the terminal. |
