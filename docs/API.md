# AEGIS — REST API Reference Specification

The AEGIS backend provides a high-performance RESTful API operating by default at `http://localhost:3001/api`. All endpoints use standard JSON payloads and return strict HTTP status codes.

---

## Global Headers & Error Handling

- **Request Content-Type**: `application/json`
- **CORS**: Enabled (`origin: *`, methods: `GET, POST, PUT, DELETE, OPTIONS`)
- **Global Error Schema**:
  ```json
  {
    "error": "Error description message"
  }
  ```
- **Standard HTTP Status Codes**:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource successfully initialized.
  - `400 Bad Request`: Input validation failed (invalid seed, unknown scenario, empty query).
  - `404 Not Found`: Target mission or hazard type not found.
  - `500 Internal Server Error`: Unhandled server exception.

---

## 1. System Health & Infrastructure

### `GET /api/health`
Retrieves backend operational health, uptime, and active mission count.

- **Request**: No parameters.
- **Response** (`200 OK`):
  ```json
  {
    "status": "HEALTHY",
    "service": "AEGIS Autonomous Planetary Rover Intelligence Backend",
    "version": "1.0.0",
    "uptimeSeconds": 142,
    "timestamp": "2026-10-03T13:20:00.000Z",
    "activeMissionsCount": 1
  }
  ```

---

## 2. Mission Lifecycle & Management

### `GET /api/missions`
Lists metadata for all active mission instances.

- **Request**: No parameters.
- **Response** (`200 OK`):
  ```json
  {
    "missions": [
      {
        "id": "primary-mission",
        "name": "Jezero Primary Exploration",
        "seed": 1337,
        "createdAt": 1791012000000,
        "status": "PAUSED",
        "speedMultiplier": 1,
        "activeScenarioId": null,
        "tickCount": 0,
        "missionTimeSeconds": 0,
        "formattedTime": "MET 00:00:00"
      }
    ]
  }
  ```

### `POST /api/missions`
Spawns a new isolated mission instance with a designated PRNG seed.

- **Request Body**:
  ```json
  {
    "name": "Neretva Traverse Beta",
    "seed": 4242,
    "id": "mission-beta"
  }
  ```
  *Validation: `seed` must be a valid integer if provided (defaults to 1337). If `id` already exists, previous instance is cleanly disposed.*
- **Response** (`201 Created`):
  ```json
  {
    "message": "Mission created successfully",
    "mission": {
      "id": "mission-beta",
      "name": "Neretva Traverse Beta",
      "seed": 4242,
      "createdAt": 1791012050000,
      "status": "PAUSED",
      "speedMultiplier": 1,
      "activeScenarioId": null,
      "tickCount": 0,
      "missionTimeSeconds": 0,
      "formattedTime": "MET 00:00:00"
    }
  }
  ```
- **Error Response** (`400 Bad Request`):
  ```json
  {
    "error": "Invalid 'seed' provided; must be a valid number"
  }
  ```

### `GET /api/missions/:id`
Retrieves metadata for a specific mission instance.

- **Parameters**: `id` (string, required) — Mission ID.
- **Response** (`200 OK`):
  ```json
  {
    "mission": {
      "id": "primary-mission",
      "name": "Jezero Primary Exploration",
      "seed": 1337,
      "status": "RUNNING",
      "speedMultiplier": 2,
      "tickCount": 45
    }
  }
  ```
- **Error Response** (`404 Not Found`):
  ```json
  {
    "error": "Mission not found",
    "missionId": "unknown-mission",
    "availableMissions": ["primary-mission"]
  }
  ```

### `DELETE /api/missions/:id`
Stops background interval timers, releases memory, and deletes the mission.

- **Parameters**: `id` (string, required).
- **Response** (`200 OK`):
  ```json
  {
    "message": "Mission deleted",
    "missionId": "mission-beta"
  }
  ```
- **Error Response** (`404 Not Found`):
  ```json
  {
    "error": "Mission not found",
    "missionId": "mission-beta"
  }
  ```

---

## 3. Simulation Stepping & Execution Control

### `POST /api/missions/:id/step`
Manually advances the simulation by $N$ discrete ticks without starting background intervals.

- **Parameters**: `id` (string, required).
- **Request Body** (optional):
  ```json
  {
    "count": 5,
    "dt": 1.0
  }
  ```
  *Validation: `count` is clamped between 1 and 100. `dt` defaults to 1.0 second.*
- **Response** (`200 OK`):
  ```json
  {
    "message": "Advanced simulation by 5 tick(s)",
    "ticksExecuted": 5,
    "telemetry": { "tick": 5, "batteryLevel": 88.4, "speed": 0.15 },
    "risk": { "currentScore": 5, "riskLevel": "LOW" },
    "activeHazards": []
  }
  ```

### `POST /api/missions/:id/start`
Starts a continuous background ticking loop at a specified speed multiplier.

- **Parameters**: `id` (string, required).
- **Request Body** (optional):
  ```json
  {
    "speedMultiplier": 2.0
  }
  ```
  *Validation: `speedMultiplier` clamped between 0.2x and 10x (interval: 1000ms / speed).*
- **Response** (`200 OK`):
  ```json
  {
    "message": "Mission running at 2x speed",
    "mission": { "id": "primary-mission", "status": "RUNNING", "speedMultiplier": 2 }
  }
  ```

### `POST /api/missions/:id/pause`
Stops background ticking. Halts simulation progression.

- **Parameters**: `id` (string, required).
- **Response** (`200 OK`):
  ```json
  {
    "message": "Mission paused",
    "mission": { "id": "primary-mission", "status": "PAUSED" }
  }
  ```

### `POST /api/missions/:id/reset`
Resets rover position, kinematics, engines, and logs to initial state (`MET 00:00:00`).

- **Request Body** (optional):
  ```json
  {
    "seed": 9999
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "message": "Mission reset successfully",
    "mission": { "id": "primary-mission", "seed": 9999, "status": "PAUSED", "tickCount": 0 },
    "telemetry": { "tick": 0, "batteryLevel": 88.5, "position": { "x": 70, "y": 430 } },
    "risk": { "currentScore": 5, "riskLevel": "LOW" }
  }
  ```

### `POST /api/missions/:id/replay`
Resets the mission to initial seed and automatically resumes playback from tick 0.

- **Response** (`200 OK`):
  ```json
  {
    "message": "Mission replaying from tick 0",
    "mission": { "id": "primary-mission", "status": "RUNNING" }
  }
  ```

---

## 4. Telemetry, Hazards & Dynamic Risk

### `GET /api/missions/:id/telemetry`
Returns current 60+ parameter telemetry snapshot and ring buffer history (last 100 points).

- **Response** (`200 OK`):
  ```json
  {
    "current": {
      "tick": 18,
      "missionTimeSeconds": 18,
      "formattedTime": "MET 00:00:18",
      "position": { "x": 73.4, "y": 429.2 },
      "heading": 38,
      "speed": 0.15,
      "batteryLevel": 88.3,
      "batteryVoltage": 31.8,
      "netPowerWatts": 28.5,
      "internalTemp": 21.4,
      "motorAverageTemp": 28.2,
      "wheelSlipAverage": 0.08,
      "signalStrengthDbm": -74.5,
      "relayConnected": true,
      "slopeAngle": 3.8,
      "roughnessIndex": 0.28,
      "terrainType": "NORMAL_REGOLITH",
      "operationalMode": "AUTONOMOUS_TRANSIT"
    },
    "history": [
      { "tick": 17, "battery": 88.3, "temperature": 28.2, "solar": 85.0, "riskScore": 5 }
    ]
  }
  ```

### `GET /api/missions/:id/hazards`
Lists currently detected active hazards and full configurations for all 9 hazard rules.

- **Response** (`200 OK`):
  ```json
  {
    "activeCount": 0,
    "active": [],
    "configs": {
      "LOW_BATTERY": { "lowThreshold": 35, "moderateThreshold": 25, "criticalThreshold": 15, "enabled": true },
      "OVERHEATING": { "moderateThreshold": 50, "criticalThreshold": 68, "enabled": true },
      "EXTREME_COLD": { "moderateThreshold": -35, "criticalThreshold": -50, "enabled": true },
      "WHEEL_SLIP": { "moderateThreshold": 0.35, "criticalThreshold": 0.60, "enabled": true },
      "ROVER_STUCK": { "criticalThreshold": 3, "enabled": true },
      "SOLAR_PANEL_DEGRADATION": { "moderateThreshold": 60, "criticalThreshold": 35, "enabled": true },
      "WEAK_COMMUNICATION": { "moderateThreshold": -92, "criticalThreshold": -108, "enabled": true },
      "DANGEROUS_TERRAIN": { "moderateThreshold": 18, "criticalThreshold": 24, "enabled": true },
      "RAPID_POWER_DRAIN": { "moderateThreshold": 380, "criticalThreshold": 450, "enabled": true }
    }
  }
  ```

### `PUT /api/missions/:id/hazards/:type`
Updates safety thresholds or toggles enabled state for a specific hazard rule.

- **Parameters**: `id` (string), `type` (HazardType, e.g. `LOW_BATTERY`).
- **Request Body**:
  ```json
  {
    "criticalThreshold": 20,
    "enabled": true
  }
  ```
  *Validation: `type` must be one of the 9 defined hazard types.*
- **Response** (`200 OK`):
  ```json
  {
    "message": "Updated hazard config for LOW_BATTERY",
    "hazards": { "active": [], "configs": { "LOW_BATTERY": { "criticalThreshold": 20 } } }
  }
  ```
- **Error Response** (`400 Bad Request`):
  ```json
  {
    "error": "Unknown hazard rule type: 'INVALID_TYPE'",
    "validTypes": ["LOW_BATTERY", "OVERHEATING", "EXTREME_COLD", "WHEEL_SLIP", "ROVER_STUCK", "SOLAR_PANEL_DEGRADATION", "WEAK_COMMUNICATION", "DANGEROUS_TERRAIN", "RAPID_POWER_DRAIN"]
  }
  ```

### `GET /api/missions/:id/risk`
Returns dynamic composite risk score (0–100), active drivers, and compounding factors.

- **Response** (`200 OK`):
  ```json
  {
    "risk": {
      "currentScore": 5,
      "previousScore": 5,
      "scoreDelta": 0,
      "riskLevel": "LOW",
      "primaryConcern": "All hazard vectors nominal",
      "reasonForChange": "Subsystem and environmental telemetry are within safe operating limits.",
      "activeDrivers": [],
      "compoundingFactors": []
    }
  }
  ```

---

## 5. Scenario Injections & Autonomous Mitigation

### `GET /api/missions/:id/scenarios`
Returns catalog of the 6 pre-configured operational fault scenarios.

- **Response** (`200 OK`):
  ```json
  {
    "scenarios": [
      { "id": "LOW_BATTERY", "name": "Depleted Battery Emergency", "expectedRiskLevel": "CRITICAL" },
      { "id": "ROVER_STUCK", "name": "Loose Dune Sand Entrapment", "expectedRiskLevel": "CRITICAL" },
      { "id": "COMM_LOSS", "name": "Orbiter Loss-of-Signal (LOS)", "expectedRiskLevel": "HIGH" },
      { "id": "EXTREME_TEMP", "name": "Drive Actuator Thermal Runaway", "expectedRiskLevel": "CRITICAL" },
      { "id": "SOLAR_DUST", "name": "Martian Dust Storm Deposition", "expectedRiskLevel": "MODERATE" },
      { "id": "HAZARDOUS_TERRAIN", "name": "Belva Crater Scarp Incline", "expectedRiskLevel": "HIGH" }
    ]
  }
  ```

### `POST /api/missions/:id/scenarios`
Injects an operational scenario into the active rover simulation.

- **Request Body**:
  ```json
  {
    "scenarioId": "ROVER_STUCK"
  }
  ```
  *Validation: `scenarioId` must match one of the 6 catalog keys.*
- **Response** (`200 OK`):
  ```json
  {
    "message": "Scenario 'ROVER_STUCK' successfully injected",
    "activeScenario": { "id": "ROVER_STUCK", "name": "Loose Dune Sand Entrapment" },
    "telemetry": { "operationalMode": "EMERGENCY_RECOVERY", "wheelSlipAverage": 0.88, "speed": 0.0 },
    "risk": { "currentScore": 100, "riskLevel": "CRITICAL", "primaryConcern": "Locomotion Entrapment (Rover Stuck)" },
    "activeHazards": [
      { "hazardType": "ROVER_STUCK", "severity": "CRITICAL", "hazardName": "Locomotion Entrapment (Rover Stuck)" }
    ]
  }
  ```

### `POST /api/missions/:id/scenarios/clear`
Clears active scenario fault injections and restores physical telemetry to nominal operational profiles.

- **Response** (`200 OK`):
  ```json
  {
    "message": "All faults cleared. Subsystems commanded to nominal.",
    "telemetry": { "batteryLevel": 85.0, "motorAverageTemp": 28.2, "operationalMode": "AUTONOMOUS_TRANSIT" },
    "risk": { "currentScore": 5, "riskLevel": "LOW" },
    "activeHazards": []
  }
  ```

### `POST /api/missions/:id/mitigate`
Triggers immediate execution of the autonomous safety mitigation protocol.

- **Request Body** (optional):
  ```json
  {
    "hazardType": "ROVER_STUCK"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "message": "Autonomous mitigation executed",
    "actionTaken": "Engaged peristaltic rocker-bogie articulation; extricated drive wheels from loose sand.",
    "telemetry": { "operationalMode": "AUTONOMOUS_TRANSIT" },
    "risk": { "currentScore": 5, "riskLevel": "LOW" },
    "activeHazards": []
  }
  ```

---

## 6. Decision Stream & AI Mission Assistant

### `GET /api/missions/:id/decisions`
Retrieves chronological audit trail of autonomous mode shifts and safety events (max 300 entries).

- **Query Parameters**: `category` (optional, filter by `HAZARD`, `DECISION`, `SYSTEM`, `SCENARIO`, or `ALL`).
- **Response** (`200 OK`):
  ```json
  {
    "recentDecision": {
      "id": "DEC-STUCK-12",
      "tick": 12,
      "time": "MET 00:00:12",
      "triggerHazard": "ROVER_STUCK",
      "operationalMode": "AUTONOMOUS_TRANSIT",
      "recommendedMode": "EMERGENCY_RECOVERY",
      "actionTaken": "Engage Rocker-Bogie Peristaltic Crab-Walk extraction protocol",
      "rationale": "Zero displacement with high motor current indicates sand sinkage.",
      "confidencePercent": 96
    },
    "totalLogs": 24,
    "logs": [
      {
        "id": "LOG-HAZ-ROVER_STUCK-12",
        "tick": 12,
        "category": "HAZARD",
        "severity": "CRITICAL",
        "title": "HAZARD DETECTED: Locomotion Entrapment (Rover Stuck)",
        "source": "HAZARD_ENGINE"
      }
    ]
  }
  ```

### `POST /api/missions/:id/assistant`
Queries the context-aware mission assistant grounded in live telemetry.

- **Request Body**:
  ```json
  {
    "query": "Is the rover safe right now?",
    "apiKey": "optional-gemini-key"
  }
  ```
  *Validation: `query` must be a non-empty string. If `apiKey` is provided, hybrid LLM is engaged.*
- **Response** (`200 OK`):
  ```json
  {
    "query": "Is the rover safe right now?",
    "response": {
      "id": "MSG-DET-1791012100",
      "sender": "assistant",
      "text": "🟢 ALL SYSTEMS NOMINAL — ROVER IS SAFE (5/100 LOW RISK).\n\nAll 9 hazard detection vectors are cleared...",
      "timestamp": "MET 00:00:18",
      "sourceType": "DETERMINISTIC_RULES"
    }
  }
  ```

---

## 7. Headless Benchmark Engine

### `POST /api/benchmark`
Runs an automated batch Monte Carlo simulation comparing AEGIS edge autonomy against Earth teleoperation.

- **Request Body** (optional):
  ```json
  {
    "numMissions": 20,
    "ticksPerMission": 30
  }
  ```
  *Validation: `numMissions` clamped between 5 and 100; `ticksPerMission` clamped between 10 and 100.*
- **Response** (`200 OK`):
  ```json
  {
    "message": "Headless benchmark executed across 20 seeded Mars rover missions",
    "results": {
      "missionCount": 20,
      "totalTicksSimulated": 600,
      "aegis": {
        "survivalRatePercent": 100.0,
        "averageIncidentResolutionSeconds": 1.8,
        "averageTraverseSpeedMps": 0.150,
        "averagePowerConsumedWatts": 196.4,
        "batteryRemainingAveragePercent": 87.2,
        "totalHazardsEncountered": 20,
        "totalHazardsMitigatedAutonomously": 20,
        "rolloversAvoided": 8
      },
      "baselineTeleoperation": {
        "survivalRatePercent": 90.0,
        "averageIncidentResolutionSeconds": 2550,
        "averageTraverseSpeedMps": 0.040,
        "averagePowerConsumedWatts": 234.8,
        "batteryRemainingAveragePercent": 59.2,
        "totalHazardsEncountered": 20,
        "totalGroundHaltCycles": 280,
        "rolloversOrStallFailures": 2
      },
      "improvementDeltas": {
        "survivalRateBoostPercent": 10.0,
        "resolutionSpeedupFactor": 1417,
        "traverseSpeedIncreasePercent": 275.0,
        "powerSavedPercent": 16.4
      }
    }
  }
  ```
