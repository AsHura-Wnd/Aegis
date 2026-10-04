# AEGIS — Physical Rover Hardware Integration Plan

## Document Metadata
- **Status:** Approved Architecture & Implementation Specification
- **Version:** 1.0.0
- **Authors:** AEGIS Core Engineering Team
- **Target Subsystem:** Express Backend, Intelligence Layer, Hardware Ingestion Pipeline, React Flight Deck
- **Core Principle:** Hardware provides the measurements; AEGIS provides the mission intelligence.

---

## 1. Executive Summary & Objective

The objective of the **AEGIS Hardware Integration Pipeline** is to bridge physical rover hardware (sensors, microcontroller, motor controllers, and wireless transceivers on an RC chassis) into the existing AEGIS Mission-Intelligence & Flight Safety platform. 

The integration allows physical rover telemetry to be:
1. Ingested over a secure, authenticated, low-overhead HTTP API.
2. Validated against strict physical bounds, sequence counters, and timestamp freshness.
3. Normalized into standardized telemetry structures without corrupting or fabricating unmeasured physical phenomena.
4. Processed through the existing **9-Vector Hazard Detection Engine**, **Dynamic Compounding Risk Engine**, and **Autonomous Decision & Recovery Engine**.
5. Streamed to the AEGIS Mission Control Dashboard in real-time, clearly distinguishing real physical sensor readings from simulated values.

Crucially, **the existing deterministic simulation environment remains 100% operational**, enabling side-by-side benchmarking, synthetic scenario fault injection, and offline development.

---

## 2. Phase 0 — Existing Codebase Audit

Before modifying or adding code, a comprehensive audit of the active AEGIS repository was performed:

### 2.1 Telemetry Data Models & Types (`src/types/telemetry.ts`)
- **Structure:** `RoverTelemetry` contains ~30 scalar metrics grouped into Power, Thermal, Communication, Mobility, Kinematics, and Mission Progress subsystems.
- **Assumptions in Current Simulation:**
  - High fidelity 6-wheel odometry (`wheels: WheelTelemetry[]` with individual motor current, torque, slip ratio, and RPM).
  - Digital Elevation Model (DEM) terrain slope and roughness sampling.
  - Solar dust accumulation and atmospheric attenuation calculations.
- **Hardware Realities:**
  - An entry-to-mid level physical RC rover typically measures a subset of these parameters:
    - **Power:** Battery pack voltage (V), discharge current (A), bus power (W) via an INA219 / INA226 I2C sensor or resistive divider.
    - **Kinematics:** 3-axis acceleration ($a_x, a_y, a_z$) and 3-axis angular rates ($\omega_x, \omega_y, \omega_z$) via an MPU6050, LSM6DSOX, or BNO055 IMU, from which pitch, roll, and tilt slope angle are derived.
    - **Thermal:** Microcontroller junction temperature, ambient thermistor (DS18B20 or DHT22), and motor driver heat sink temperature.
    - **Range / Clearance:** Forward optical ToF distance (VL53L0X) or ultrasonic echo (HC-SR04) for obstacle proximity.
    - **Mobility:** Optical wheel encoders / Hall-effect sensors measuring pulse frequency (RPM, linear ground speed).
    - **Communication:** WiFi RSSI (dBm), round-trip latency (ms), packet sequence loss.
- **Architectural Requirement:** The contract must accept available physical sensors, validate their physical units, and mark unmeasured fields as unavailable or unobserved—never silently fabricating synthetic certainty.

### 2.2 Mission Lifecycle & Isolation (`src/server/models/missionInstance.ts`)
- **Instance Model:** `MissionInstance` encapsulates the complete state of a single mission:
  - Simulation model (`RoverSimulationModel`),
  - Hazard engine (`HazardDetectionEngine`),
  - Risk engine (`DynamicRiskEngine`),
  - Decision executive (`AutonomousDecisionEngine`),
  - Telemetry history buffer (`TelemetryHistoryPoint[]` up to 100 points),
  - Event log (`LogEntry[]` up to 300 entries).
- **Mission Service:** `src/server/services/missionService.ts` maintains an in-memory `Map<string, MissionInstance>`. Missions are strictly isolated by ID (e.g. `primary-mission`, `recon-alpha`). Stepping or modifying one mission has zero side effects on other active missions.
- **Hardware Integration Point:** `MissionInstance` must support two telemetry intake modes:
  1. `mode: 'SIMULATION'` (driven by `simModel.step(dt)` and timers).
  2. `mode: 'HARDWARE'` (driven by external telemetry packets ingested via `ingestHardwareTelemetry(packet)`).

### 2.3 Intelligence Layer Integration
- **Hazard Detection (`src/engines/hazardEngine.ts`):** Evaluates 9 deterministic hazard vectors. Configurable thresholds exist for battery percentage, motor temperature, signal loss, wheel slip, slope angle, etc.
- **Dynamic Risk (`src/engines/riskEngine.ts`):** Computes compound risk scores ($0 - 100$) based on severity tiers (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), parameter margins, and compounding multipliers.
- **Decision Engine (`src/engines/decisionEngine.ts`):** Evaluates state transitions (`AUTONOMOUS_TRANSIT`, `TELEOPERATION`, `HAZARD_AVOIDANCE`, `SAFE_HOLD`, `RECHARGE_STANDBY`, `EMERGENCY_RECOVERY`).
- **Audit Finding:** The intelligence layer is already decoupled from simulation generation. It takes standard telemetry and returns decisions. Connecting hardware readings to this layer requires only normalized input adaptation.

### 2.4 Existing API Surface (`src/server/routes/missionRoutes.ts`)
- Express router with 22 validated endpoints covering telemetry, hazards, risk, decisions, scenario injection, and replay.
- JSON-based REST APIs with CORS enabled and centralized error handling.
- Missing: A dedicated ingestion route for device telemetry and device health monitoring.

### 2.5 In-Memory Storage Limitations
- Current mission state resides entirely in Node.js process memory.
- Restarting the backend resets the missions to default state.
- **Mitigation:** A persistent storage interface (supporting file-based JSONL append logs or SQLite) must be introduced for hardware testing sessions so physical test runs are permanently archived.

---

## 3. Architecture & Telemetry Contract

### 3.1 Data Flow Pipeline

```
┌────────────────────────────┐
│ Physical RC Rover (ESP32)  │
│ - INA219 (Voltage/Current) │
│ - MPU6050 (Pitch/Roll IMU) │
│ - VL53L0X (ToF Obstacle)   │
│ - Hall Encoder (Speed)     │
└─────────────┬──────────────┘
              │ HTTP POST /api/telemetry/ingest
              │ Header: Authorization: Bearer <device-key>
              ▼
┌────────────────────────────────────────────────────────┐
│ AEGIS Backend Ingestion Pipeline                      │
│ 1. Device Authentication & Association                │
│ 2. Schema Validation (types, ranges, NaN checks)      │
│ 3. Sequence & Stale Packet Verification               │
│ 4. Measurement Normalization Engine                   │
└─────────────┬──────────────────────────────────────────┘
              ▼
┌────────────────────────────────────────────────────────┐
│ Mission Instance State & Intelligence Processing       │
│ - Update RoverTelemetry (tagged source='hardware')    │
│ - Evaluate 9-Vector Hazard Detection Engine            │
│ - Calculate Dynamic Compounding Risk Assessment       │
│ - Trigger Autonomous Decision & Mitigation Logic       │
│ - Update Device Heartbeat & Connectivity Registry     │
└─────────────┬──────────────────────────────────────────┘
              ▼
┌────────────────────────────────────────────────────────┐
│ Flight Deck Dashboard (Vite / React)                   │
│ - Displays Live Telemetry with Source Indicator        │
│ - Highlights Rover Online / Stale / Disconnected status│
│ - Visualizes Real-Time Hazard Warnings & Decisions    │
└────────────────────────────────────────────────────────┘
```

---

## 4. Phase-by-Phase Implementation Specifications

### Phase 1 — Unified Telemetry Contract (`src/types/hardwareTelemetry.ts`)

Define a strict, strongly-typed JSON schema for hardware transmissions:

```typescript
export interface HardwareTelemetryPacket {
  roverId: string;                    // Unique identifier (e.g. 'aegis-rover-01')
  missionId: string;                  // Associated mission ID (e.g. 'primary-mission')
  timestamp: number;                  // UTC epoch milliseconds of measurement
  sequence: number;                   // Monotonically increasing sequence number
  
  // Subsystem Measurements
  power: {
    batteryVoltage: number;           // Volts (e.g. 10.5V - 12.6V for 3S LiPo)
    currentAmps: number;              // Amperes (instantaneous bus draw)
    batteryPercent?: number;          // Estimated State of Charge (0-100%)
  };

  kinematics: {
    pitchDeg: number;                 // Degrees (-90° to +90°)
    rollDeg: number;                  // Degrees (-90° to +90°)
    yawDeg?: number;                  // Degrees (0° to 360°)
    speedMps?: number;                // Ground speed in m/s from wheel encoders
    tiltAngleDeg?: number;            // Total terrain inclination angle
  };

  thermal: {
    ambientTempC?: number;            // Ambient environment temp in °C
    motorTempC?: number;              // Drive motor chassis temp in °C
    mcuTempC?: number;                // Onboard processor internal temp in °C
  };

  environment?: {
    forwardDistanceCm?: number;       // ToF / Ultrasonic forward distance
    opticalLux?: number;              // Ambient illuminance
  };

  comms: {
    rssiDbm: number;                  // WiFi / RF signal strength (-110 to -30 dBm)
    txPackets?: number;               // Transmitted packet count from MCU
  };

  status: {
    systemHealth: 'OK' | 'DEGRADED' | 'FAULT';
    faultFlags?: string[];            // Low-level hardware error codes
  };
}
```

### Phase 2 — Hardware Telemetry Ingestion API (`POST /api/telemetry/ingest`)

#### Endpoint Specifications:
- **Route:** `POST /api/telemetry/ingest`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <AEGIS_ROVER_API_KEY>` or `X-Device-Token: <token>`
- **Response Status Codes:**
  - `200 OK`: Telemetry accepted, validated, and processed into mission state.
  - `400 Bad Request`: Schema validation failure, out-of-range sensor readings, or invalid types.
  - `401 Unauthorized`: Missing or invalid device authentication token.
  - `404 Not Found`: Associated `missionId` not found in mission registry.
  - `409 Conflict`: Stale timestamp or out-of-sequence duplicate packet.
  - `500 Internal Server Error`: Safe failure without crashing the service.

#### Success Response Body:
```json
{
  "status": "ACCEPTED",
  "roverId": "aegis-rover-01",
  "missionId": "primary-mission",
  "sequence": 142,
  "processedAt": 1728042180000,
  "telemetrySource": "HARDWARE",
  "risk": {
    "currentScore": 14,
    "riskLevel": "LOW"
  },
  "activeHazardsCount": 0,
  "recommendations": []
}
```

### Phase 3 — Telemetry Normalization & Mission State Integration

When hardware telemetry arrives at `MissionInstance.ingestHardwareTelemetry(packet)`:
1. **Source Tagging:** Set `telemetry.source = 'HARDWARE'` and update `telemetry.missionTimeSeconds` based on packet timestamp.
2. **Kinematic Mapping:**
   - Map `kinematics.pitchDeg` and `kinematics.rollDeg` to telemetry attitude.
   - Calculate `slopeAngle = Math.hypot(pitch, roll)`. If `tiltAngleDeg` is provided by hardware IMU fusion, prioritize that measurement.
3. **Power Mapping:**
   - Map `power.batteryVoltage` to `telemetry.batteryVoltage`.
   - Calculate `telemetry.powerConsumptionWatts = batteryVoltage * currentAmps`.
   - Estimate `telemetry.batteryLevel` using a standard LiPo discharge curve lookup if not explicitly computed by the rover's battery gauge.
4. **Thermal Mapping:**
   - Map `thermal.motorTempC` to `telemetry.motorAverageTemp`.
   - Map `thermal.ambientTempC` to `telemetry.ambientTemp`.
5. **Comms Mapping:**
   - Map `comms.rssiDbm` to `telemetry.signalStrengthDbm`.
   - Derive `signalQualityPercent` using normalized logarithmic decibel scale.
6. **Intelligence Layer Execution:**
   - Execute `hazardEngine.evaluate(normalizedTelemetry)`.
   - Execute `riskEngine.calculateRisk(normalizedTelemetry, hazards)`.
   - Execute `decisionEngine.evaluateDecisions(normalizedTelemetry, hazards, risk)`.

### Phase 4 — Device Connectivity & Stale Telemetry Monitoring (`src/server/services/deviceRegistry.ts`)

A connected physical rover must be actively tracked for heartbeat health:
- **`ONLINE`**: Received valid telemetry packet within the last 3.0 seconds.
- **`STALE`**: No packet received for 3.0 to 10.0 seconds (triggers `COMM_ATTENUATED` caution).
- **`DISCONNECTED`**: No packet received for > 10.0 seconds (triggers `COMM_LOSS` hazard and sets dashboard to disconnected indicator).

---

## 5. Security & Device Authentication

1. **Token Authentication:** Hardware devices authenticate using pre-shared bearer tokens stored in the backend environment (`AEGIS_DEVICE_AUTH_TOKENS` or `AEGIS_ROVER_API_KEY`).
2. **Replay Protection:** The backend rejects packets with timestamps older than 60 seconds or sequence numbers less than or equal to the last recorded sequence number for that `roverId`.
3. **Sensor Range Clamping & Sanitization:** All incoming numeric fields are checked against physical sanity limits (e.g. voltage $0 - 50\text{V}$, temperature $-50 - 150^\circ\text{C}$, speed $0 - 10\text{m/s}$) to prevent NaN injection or arithmetic corruption.

---

## 6. Implementation Task Breakdown

| Phase | Component | File Path | Action |
|---|---|---|---|
| **Phase 1** | Unified Telemetry Contract | `src/types/hardwareTelemetry.ts` | **Create** |
| **Phase 2** | Device Authentication & Security | `src/server/middleware/deviceAuth.ts` | **Create** |
| **Phase 2** | Telemetry Ingestion Validation | `src/server/validators/telemetryValidator.ts` | **Create** |
| **Phase 2** | Telemetry Ingestion Endpoint | `src/server/routes/ingestionRoutes.ts` | **Create** |
| **Phase 2** | Route Registration | `src/server/app.ts` | **Modify** |
| **Phase 3** | Hardware Intake in Mission Instance | `src/server/models/missionInstance.ts` | **Modify** |
| **Phase 4** | Device Connectivity & Health Service | `src/server/services/deviceService.ts` | **Create** |
| **Phase 4** | Device Status Route | `src/server/routes/deviceRoutes.ts` | **Create** |
| **Phase 8** | Integration Test Suite | `src/__tests__/hardwareIngestion.test.ts` | **Create** |

---

## 7. Acceptance Criteria for Initial Milestone

1. **Ingestion Endpoint (`POST /api/telemetry/ingest`):**
   - Successfully ingests valid hardware packets and updates the mission state.
   - Rejects unauthenticated requests with HTTP 401.
   - Rejects malformed requests or out-of-range sensor readings with HTTP 400.
   - Detects out-of-order and duplicate packets.
2. **Intelligence Processing:**
   - Real sensor values trigger genuine hazard detection (e.g. battery voltage $< 10.5\text{V}$ triggers `LOW_BATTERY`; motor temperature $> 65^\circ\text{C}$ triggers `OVERHEATING`; tilt angle $> 18^\circ$ triggers `DANGEROUS_TERRAIN`).
   - Risk score and operational mode update automatically.
3. **Simulation Continuity:**
   - All existing 37 tests continue to pass with zero regressions.
   - Synthetic scenarios and benchmark comparisons remain fully operational.
