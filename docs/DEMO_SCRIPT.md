# AEGIS — Hackathon Demonstration Script & Walkthrough

This document provides a minute-by-minute walkthrough for demonstrating AEGIS to hackathon judges, technical evaluators, and mission operations audiences.

---

## ⏱️ Demo Timing Overview (5–7 Minutes)

```
0:00 - 0:45 | 1. The Mars Problem (The 14-Minute Teleoperation Trap)
0:45 - 1:30 | 2. System Launch & Mission Control HUD Overview
1:30 - 2:30 | 3. Fault Injection: Loose Dune Sand Entrapment & Compounding Risk
2:30 - 3:30 | 4. Edge Autonomy: Peristaltic Rocker-Bogie Extrication
3:30 - 4:30 | 5. Fault Injection: Comm Loss & Full Autonomous Safeguard Mode
4:30 - 5:30 | 6. Quantitative Proof: Headless Monte Carlo Benchmark (1417x Speedup)
5:30 - 6:30 | 7. AI Mission Assistant & Explainable Decision Log
6:30 - 7:00 | 8. Q&A & Technical Architecture Summary
```

---

## Act 1: The Mars Problem (0:00 – 0:45)

**Presenter Pitch:**
> *"In 2009, NASA's Spirit rover drove into a hidden Martian sand trap at Troy. Because commands from Earth take 14 to 45 minutes round-trip, ground engineers could not react in time. By the time Earth saw the telemetry, Spirit was hopelessly bogged down, ending a multi-million-dollar mission.*
>
> *Today, planetary rovers still rely on conservative ground teleoperation. AEGIS solves this. AEGIS is an autonomous planetary rover mission-intelligence and safety executive that runs on-board the rover. It detects hazards across 9 continuous vectors, calculates multi-fault compounding risk, and executes real-time extrication and safe hold at the edge—without waiting for Earth."*

---

## Act 2: System Launch & Architecture (0:45 – 1:30)

### 1. Launch Services
Ensure backend and frontend are running in separate terminal windows:

```bash
# Terminal 1: Backend REST Service (Port 3001)
npm run server

# Terminal 2: Frontend Mission Control Dashboard (Port 5173)
npm run dev
```

### 2. Verify Health
Open browser to `http://localhost:5173/` or run:
```bash
curl http://localhost:3001/api/health
```
**Expected Output**: `{"status": "HEALTHY", "activeMissionsCount": 1}`.

### 3. Highlight Mission Control HUD
Point out key telemetry panels:
- **Vehicle Mode**: `AUTONOMOUS_TRANSIT` (Green badge).
- **Risk Score**: `5/100 (LOW)` with 0 active hazards.
- **Subsystem Metrics**: Battery at 88.5%, Internal Temp at 21.4°C, Motor Temp at 28.2°C, Comm Link at -74.5 dBm.
- **Tactical 2D DEM Surface Map**: Shows Jezero Crater Sector 4 with waypoints WP-0 through WP-5, elevation contours, and hazard zones.

---

## Act 3: Fault Injection — Sand Entrapment (1:30 – 2:30)

### 1. Inject Loose Dune Sand Entrapment
In the **Scenario Controls** panel, click **"Loose Dune Sand Entrapment"** (or execute via terminal):

```bash
curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "ROVER_STUCK"}'
```

### 2. Highlight Autonomous Reaction
Show the judges what just happened instantaneously:
- **Active Hazards**:
  - `Locomotion Entrapment (Rover Stuck)` — `CRITICAL`.
  - `Excessive Wheel Slip` (88% slip) — `CRITICAL`.
- **Dynamic Risk Score**: Spikes from **5/100 to 100/100 (CRITICAL)**.
- **Compounding Multiplier**: Point out the compounding note: *"Drive actuator stall current causing rapid motor thermal runaway (+35% risk multiplier)"*.
- **Automatic Mode Shift**: Mode transitions immediately from `AUTONOMOUS_TRANSIT` to **`EMERGENCY_RECOVERY`**.

---

## Act 4: Autonomous Recovery Protocol (2:30 – 3:30)

### 1. Show Explainable Decision Log
Point to the **Autonomous Decision Stream**:
> *"Notice that AEGIS didn't just panic—it logged an explainable engineering rationale: 'Zero forward displacement with high motor current indicates sand sinkage. Engaging Rocker-Bogie Peristaltic Crab-Walk protocol.'"*

### 2. Trigger Autonomous Mitigation
Click **"Execute Autonomous Mitigation"** (or execute via terminal):

```bash
curl -X POST http://localhost:3001/api/missions/primary-mission/mitigate \
  -H "Content-Type: application/json" \
  -d '{"hazardType": "ROVER_STUCK"}'
```

### 3. Observe Vehicle Extrication
- The chassis articulates its rocker-bogie differential linkage, reverses drive hubs 2.0 meters, and redistributes weight.
- Operational mode returns to **`AUTONOMOUS_TRANSIT`**.
- Risk score returns to **5/100 (LOW)**.
- Telemetry normalizes back to nominal travel.

---

## Act 5: Comm Loss & Full Autonomous Safeguard Mode (3:30 – 4:30)

### 1. Inject Comm Loss
Click **"Orbiter Loss-of-Signal (LOS)"**:

```bash
curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "COMM_LOSS"}'
```

### 2. Key Speaking Point
> *"In a traditional teleoperated rover, losing the orbiter comm link is an emergency freeze. But watch AEGIS: it shifts immediately into `SAFE_HOLD` (Autonomous Safeguard Mode), preserves local obstacle avoidance, buffers science telemetry to non-volatile flash RAM, and continues safe autonomous operations."*

Clear the fault to restore nominal operations:
```bash
curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios/clear
```

---

## Act 6: Headless Monte Carlo Benchmark (4:30 – 5:30)

**Presenter Pitch:**
> *"Judges often ask: 'How do you prove autonomy is actually better than teleoperation?' We built a Headless Monte Carlo Benchmark engine into the backend that simulates dozens of Mars missions with randomized fault injections."*

### 1. Trigger Benchmark Run
Click **"Run Headless Benchmark"** on the dashboard (or execute via API):

```bash
curl -X POST http://localhost:3001/api/benchmark \
  -H "Content-Type: application/json" \
  -d '{"numMissions": 15, "ticksPerMission": 25}'
```

### 2. Explain Empirical Results
Present the live calculated numbers:
- **Total Ticks Simulated**: 375 real ticks evaluated in under 300ms.
- **Incident Resolution Speedup**: **1417x faster** (1.8 seconds autonomous edge resolution vs 42.5 minutes of Earth ground round-trip delay).
- **Survival Rate**: **100% on AEGIS** vs **93.3% on Ground Teleoperation** (where stall sinkage leads to vehicle loss).
- **Traverse Velocity Increase**: **+275%** due to elimination of ground halt cycles.
- **Power Saved**: **16.4% reduction** in wasted stall battery drain.

---

## Act 7: AI Mission Assistant & Decision Stream (5:30 – 6:30)

### 1. Ask Live Natural Language Question
Switch to the **AI Intelligence Tab** in the dashboard and type:
> *"Is the rover safe right now?"*

Show the response:
- The assistant evaluates live telemetry and active hazards.
- If nominal: returns green clearance with battery SoC, internal temperatures, and current objective.
- If in a fault state: highlights exact primary concern, active hazards, and specific mitigation commands.

---

## 🛠️ Fallback & Troubleshooting Procedures

| Issue During Demo | Cause | Immediate Fallback Action |
| :--- | :--- | :--- |
| **Backend port 3001 in use** | Stray node process running | Run `npx kill-port 3001` or restart terminal, then run `npm run server`. |
| **Frontend HUD shows disconnected** | Backend was started after Vite | Refresh browser tab at `http://localhost:5173/`. |
| **Scenario doesn't trigger visually** | Simulation paused | Click **"Resume / Play"** or POST to `/api/missions/primary-mission/start`. |
| **Residual degraded telemetry** | Prior scenario not cleared | Execute `POST /api/missions/primary-mission/scenarios/clear` or click **"Reset Mission"**. |
