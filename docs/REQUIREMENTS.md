# AEGIS — Requirements Traceability Matrix (RTM)

This document maps all high-level mission requirements to implementation source files, verification methods, and automated tests.

---

## 📋 Traceability Matrix

| Req ID | Description | Priority | Status | Source Module | Verification Method | Related Test / Script | Notes / Gaps |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **REQ-TEL-01** | Deterministic Seeded Physics Kinematics | **P0** | **Completed** | [`roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts) | Unit & Audit | `aegis.test.ts`, `testAudit.mjs` | Bit-accurate across identical seeds. |
| **REQ-TEL-02** | 6-Wheel Rocker-Bogie Slip Tracking | **P0** | **Completed** | [`roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts) | Unit Test | `aegis.test.ts` | Individual slip & stall currents for FL, FR, ML, MR, RL, RR. |
| **REQ-TEL-03** | Bounded Telemetry Ring Buffers | **P0** | **Completed** | [`missionInstance.ts`](file:///d:/Projects/Aegis/src/server/models/missionInstance.ts) | Backend API | `backend.test.ts` | Clamped to 100 historical points. |
| **REQ-HAZ-01** | Low Battery Reserve Detection | **P0** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Triggers at 35% (Mod), 25% (High), 15% (Crit). |
| **REQ-HAZ-02** | Subsystem Thermal Overheating | **P0** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Triggers at 50°C (Mod), 68°C (Crit). |
| **REQ-HAZ-03** | Extreme Cryogenic Cold Detection | **P1** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Triggers at -35°C (Mod), -50°C (Crit). |
| **REQ-HAZ-04** | Excessive Wheel Slip Detection | **P0** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Triggers at 0.35 (Mod), 0.60 (Crit). |
| **REQ-HAZ-05** | Locomotion Entrapment (Rover Stuck)| **P0** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit & API | `aegis.test.ts`, `backend.test.ts` | 3 ticks with zero speed & stall amps > 9.5A. |
| **REQ-HAZ-06** | Solar Panel Dust Deposition | **P1** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Triggers when efficiency falls below 60%. |
| **REQ-HAZ-07** | Weak Comm / Loss-of-Signal (LOS) | **P0** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit & API | `aegis.test.ts`, `testAudit.mjs` | Triggers below -92 dBm and -108 dBm. |
| **REQ-HAZ-08** | Dangerous Terrain Slope / Roughness| **P0** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Incline > 18° (Mod), > 24° (Crit). |
| **REQ-HAZ-09** | Anomalous Rapid Power Drain | **P1** | **Completed** | [`hazardEngine.ts`](file:///d:/Projects/Aegis/src/engines/hazardEngine.ts) | Unit Test | `aegis.test.ts` | Total subsystem draw > 380W and > 450W. |
| **REQ-RSK-01** | Dynamic 0–100 Compounding Risk | **P0** | **Completed** | [`riskEngine.ts`](file:///d:/Projects/Aegis/src/engines/riskEngine.ts) | Unit Test | `aegis.test.ts` | Additive points + 5 interaction multipliers. |
| **REQ-MOD-01** | Shift to Emergency Recovery Mode | **P0** | **Completed** | [`decisionEngine.ts`](file:///d:/Projects/Aegis/src/engines/decisionEngine.ts) | Unit & API | `aegis.test.ts`, `testAudit.mjs` | Triggered by `ROVER_STUCK`. |
| **REQ-MOD-02** | Shift to Safe Hold (ASM) Mode | **P0** | **Completed** | [`decisionEngine.ts`](file:///d:/Projects/Aegis/src/engines/decisionEngine.ts) | Unit & API | `aegis.test.ts`, `testAudit.mjs` | Triggered by `COMM_LOSS`. |
| **REQ-MOD-03** | Shift to Hazard Avoidance Mode | **P1** | **Completed** | [`decisionEngine.ts`](file:///d:/Projects/Aegis/src/engines/decisionEngine.ts) | Unit & API | `aegis.test.ts`, `testAudit.mjs` | Triggered by `DANGEROUS_TERRAIN`. |
| **REQ-MOD-04** | Shift to Recharge Standby Mode | **P1** | **Completed** | [`decisionEngine.ts`](file:///d:/Projects/Aegis/src/engines/decisionEngine.ts) | Unit & API | `aegis.test.ts`, `testAudit.mjs` | Triggered by critical `LOW_BATTERY`. |
| **REQ-REC-01** | Peristaltic Crab-Walk Extrication | **P0** | **Completed** | [`missionInstance.ts`](file:///d:/Projects/Aegis/src/server/models/missionInstance.ts) | Backend API | `backend.test.ts`, `testAudit.mjs` | Extricates stuck drive wheels and restores transit. |
| **REQ-REC-02** | Nearest Solar Haven Detour Route | **P1** | **Completed** | [`terrainMap.ts`](file:///d:/Projects/Aegis/src/simulation/terrainMap.ts) | Unit Test | `aegis.test.ts` | Finds Solis Plateau Haven via Euclidean scan. |
| **REQ-REC-03** | Subsystem Baseline Normalization | **P1** | **Completed** | [`roverModel.ts`](file:///d:/Projects/Aegis/src/simulation/roverModel.ts) | Live Audit | `testAudit.mjs` | Restores nominal battery & temp on fault clear. |
| **REQ-ISO-01** | Multi-Mission State Quarantine | **P0** | **Completed** | [`missionService.ts`](file:///d:/Projects/Aegis/src/server/services/missionService.ts) | Live Audit | `testAudit.mjs` | Zero tick or fault leakage between instances. |
| **REQ-ISO-02** | Timer Collision Prevention | **P0** | **Completed** | [`missionInstance.ts`](file:///d:/Projects/Aegis/src/server/models/missionInstance.ts) | Backend API | `backend.test.ts` | Stops previous interval before new interval. |
| **REQ-BNK-01** | Dynamic Headless Monte Carlo | **P1** | **Completed** | [`benchmarkService.ts`](file:///d:/Projects/Aegis/src/server/services/benchmarkService.ts) | Backend API | `backend.test.ts`, `testAudit.mjs` | Metrics calculated from simulated ticks. |
| **REQ-API-01** | REST API Route Surface (22 Routes) | **P0** | **Completed** | [`missionRoutes.ts`](file:///d:/Projects/Aegis/src/server/routes/missionRoutes.ts), [`benchmarkRoutes.ts`](file:///d:/Projects/Aegis/src/server/routes/benchmarkRoutes.ts) | Backend API | `backend.test.ts` | Strict validation, standard error schemas. |
| **REQ-AST-01** | Context-Aware AI Mission Assistant | **P1** | **Completed** | [`aiAssistantEngine.ts`](file:///d:/Projects/Aegis/src/engines/aiAssistantEngine.ts) | Backend API | `backend.test.ts` | Grounded in live telemetry with offline fallback. |
| **REQ-DB-01** | Persistent Database Storage | **P2** | **Not Started** | `src/server/db/` | N/A | None | Planned SQLite/PostgreSQL persistence. |
