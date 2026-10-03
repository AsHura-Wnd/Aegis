# AEGIS — Operational Fault Scenarios Catalog

This document specifies the operational fault scenarios implemented in the AEGIS simulation catalog ([`src/simulation/scenarioDefinitions.ts`](file:///d:/Projects/Aegis/src/simulation/scenarioDefinitions.ts)). Each scenario represents a high-risk operational anomaly encountered during Mars surface exploration.

---

## Scenario Summary Matrix

| Scenario ID | Name | Primary Hazard | Injected Fault | Expected Risk | Automated Mode Shift |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`LOW_BATTERY`** | Depleted Battery Emergency | Low Battery Reserve | `batteryPct <= 18.5%` | **HIGH / CRITICAL** | `RECHARGE_STANDBY` |
| **`ROVER_STUCK`** | Loose Dune Sand Entrapment | Locomotion Entrapment | `roverStuck: true` | **CRITICAL (100/100)**| `EMERGENCY_RECOVERY` |
| **`COMM_LOSS`** | Orbiter Loss-of-Signal | Weak Communication Link | `commLoss: true` | **CRITICAL (83/100)** | `SAFE_HOLD` |
| **`EXTREME_TEMP`**| Drive Actuator Runaway | Subsystem Thermal Overheat | `motorTempC >= 70°C` | **CRITICAL (83/100)** | `SAFE_HOLD` / Louvers |
| **`SOLAR_DUST`** | Dust Storm Deposition | Solar Panel Dust Deposition | `dustPct >= 78%` | **HIGH (52/100)** | Gimbal Realignment |
| **`HAZARDOUS_TERRAIN`**| Belva Crater Scarp Incline| Hazardous Terrain | `slope >= 27.8°` | **CRITICAL (100/100)**| `HAZARD_AVOIDANCE` |

---

## 1. Scenario: `LOW_BATTERY` (Depleted Battery Emergency)

- **Scenario ID**: `LOW_BATTERY`
- **Context**: High power draw from continuous science drilling or extended night transit depletes energy reserves below safety contingency margins.
- **Initial Conditions**: Rover in `AUTONOMOUS_TRANSIT`, battery at ~88%.
- **Trigger Conditions**: Injected `lowBattery: true` forces `batteryPct = 18.5%` (below critical threshold of 25%).
- **Expected Hazards**:
  - `LOW_BATTERY` (Severity: `HIGH` at 18.5%, `CRITICAL` if `< 15%`).
- **Expected Risk**: Escalates to `HIGH (59/100)` or `CRITICAL`.
- **Mode Shift & Autonomous Decision**:
  - Shift to `RECHARGE_STANDBY`.
  - Decision: *"Abort science mission transit; steer toward Solis Ridge Solar Haven."*
- **Recovery Behavior**:
  - Halts night locomotion; suspends high-draw spectrometers.
  - Diverts to nearest recharge plateau coordinates via `findNearestRechargeZone()`.
- **Reproduction Command**:
  ```bash
  curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "LOW_BATTERY"}'
  ```
- **Associated Tests**: `backend.test.ts`, `aegis.test.ts`, `testAudit.mjs`.

---

## 2. Scenario: `ROVER_STUCK` (Loose Dune Sand Entrapment)

- **Scenario ID**: `ROVER_STUCK`
- **Context**: Rover drives into uncompacted drift sand dunes in the Neretva Sand Sea. Drive wheels sink into the regolith with 88% slip, resulting in zero forward displacement despite high motor torque.
- **Initial Conditions**: Rover traversing at ~0.15 m/s, motor current at ~2.5A.
- **Trigger Conditions**: Injected `roverStuck: true` locks speed to 0.0 m/s, elevates wheel slip to ~88%, and spikes stall current to ~10.5A for $\ge 3$ consecutive ticks.
- **Expected Hazards**:
  - `ROVER_STUCK` (Severity: `CRITICAL`).
  - `WHEEL_SLIP` (Severity: `CRITICAL`).
- **Expected Risk**: Escalates to `CRITICAL (100/100)` due to compounding stuck condition and stall current draw.
- **Mode Shift & Autonomous Decision**:
  - Shift to `EMERGENCY_RECOVERY`.
  - Decision: *"Engage Rocker-Bogie Peristaltic Crab-Walk extraction protocol."*
- **Recovery Behavior**:
  - Invokes `POST /api/missions/:id/mitigate`.
  - Actuates rocker-bogie differential linkage, oscillates drive hub directions, and extricates vehicle backwards 2.0 meters onto solid regolith.
- **Reproduction Command**:
  ```bash
  curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "ROVER_STUCK"}'
  ```
- **Associated Tests**: `backend.test.ts`, `aegis.test.ts`, `testAudit.mjs`.

---

## 3. Scenario: `COMM_LOSS` (Orbiter Loss-of-Signal)

- **Context**: Entry into a steep canyon or antenna misalignment causes severe RF attenuation and 98% packet loss, cutting off ground teleoperation.
- **Initial Conditions**: Signal strength nominal (-74.5 dBm), carrier locked.
- **Trigger Conditions**: Injected `commLoss: true` drops RSSI to -116 dBm with carrier disconnect (`relayConnected: false`).
- **Expected Hazards**:
  - `WEAK_COMMUNICATION` (Severity: `CRITICAL`).
- **Expected Risk**: Escalates to `CRITICAL (83/100)`.
- **Mode Shift & Autonomous Decision**:
  - Shift to `SAFE_HOLD`.
  - Decision: *"Switch to Full Autonomous Safeguard Mode (ASM); cease teleoperation dependency."*
- **Recovery Behavior**:
  - Buffers high-resolution science telemetry into local non-volatile flash RAM.
  - Automatically executes local hazard avoidance without waiting for Earth uplinks.
- **Reproduction Command**:
  ```bash
  curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "COMM_LOSS"}'
  ```

---

## 4. Scenario: `EXTREME_TEMP` (Drive Actuator Thermal Runaway)

- **Context**: Heavy mechanical friction in drive gearbox during uphill climb elevates motor winding temperatures above allowable limits.
- **Initial Conditions**: Motor temperature nominal (28°C).
- **Trigger Conditions**: Injected `extremeTemp: 'HOT'` spikes `motorTempC` to 74°C (exceeding critical threshold of 68°C).
- **Expected Hazards**:
  - `OVERHEATING` (Severity: `CRITICAL`).
- **Expected Risk**: Escalates to `CRITICAL (83/100)`.
- **Mode Shift & Autonomous Decision**:
  - Decision: *"Halt drive motors; deploy auxiliary thermal louvers; suspend non-critical computing cores."*
- **Recovery Behavior**:
  - Locomotion idled; auxiliary thermal radiators deployed until internal temperature falls below 45°C.
- **Reproduction Command**:
  ```bash
  curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "EXTREME_TEMP"}'
  ```

---

## 5. Scenario: `SOLAR_DUST` (Martian Dust Storm Deposition)

- **Context**: A localized dust devil deposits a layer of ferric dust over photovoltaic panels, reducing conversion efficiency.
- **Initial Conditions**: Solar array clean (`dustPct: 12%`, solar efficiency 88%).
- **Trigger Conditions**: Injected `solarDust: true` sets `dustPct` to 78% (dropping photovoltaic conversion to 22%).
- **Expected Hazards**:
  - `SOLAR_PANEL_DEGRADATION` (Severity: `HIGH`).
- **Expected Risk**: Escalates to `HIGH (52/100)`.
- **Mode Shift & Autonomous Decision**:
  - Decision: *"Optimize solar array tilt angle to sun vector; schedule wind clearing window."*
- **Recovery Behavior**:
  - Panels gimbaled toward maximum diurnal solar incidence; high-draw spectral instruments queued for daytime passes.
- **Reproduction Command**:
  ```bash
  curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "SOLAR_DUST"}'
  ```

---

## 6. Scenario: `HAZARDOUS_TERRAIN` (Belva Crater Scarp Incline)

- **Context**: Rover traverses the rim of Belva Crater with scree slopes reaching 27.8° and high rollover probability.
- **Initial Conditions**: Nominal regolith slope (~3.5°).
- **Trigger Conditions**: Injected `hazardousTerrain: true` forces slope to 27.8°, roughness to 0.92, and slip multiplier to 2.8x.
- **Expected Hazards**:
  - `DANGEROUS_TERRAIN` (Severity: `CRITICAL`).
  - `WHEEL_SLIP` (Severity: `HIGH`).
- **Expected Risk**: Escalates to `CRITICAL (100/100)` with compounding slope and slip risk.
- **Mode Shift & Autonomous Decision**:
  - Shift to `HAZARD_AVOIDANCE`.
  - Decision: *"Throttle drive speed by 50%; execute contour-following detour spline."*
- **Recovery Behavior**:
  - Mechanical brakes applied; 3D DEM mesh evaluated; trajectory replanned around crater perimeter.
- **Reproduction Command**:
  ```bash
  curl -X POST http://localhost:3001/api/missions/primary-mission/scenarios \
    -H "Content-Type: application/json" \
    -d '{"scenarioId": "HAZARDOUS_TERRAIN"}'
  ```

---

## Non-Cataloged Hazard Vectors (Configurable via API)

In addition to the 6 catalog scenarios, the `HazardDetectionEngine` actively monitors:
1. **`EXTREME_COLD`**: Triggered when ambient/chassis drops below -50°C. Activates survival heaters.
2. **`RAPID_POWER_DRAIN`**: Triggered when subsystem draw exceeds 450W. Isolates auxiliary power bus.
3. **`WHEEL_SLIP`**: Continuous odometry-visual slip ratio tracking between 0.35 and 0.60.
