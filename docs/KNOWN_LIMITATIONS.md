# AEGIS — Known Limitations & Technical Constraints

This document outlines the current technical limitations, model approximations, and architectural constraints of the AEGIS prototype.

---

## 1. Simulation & Physics Approximations

### 1.1 Kinematic Empirical Physics vs Multibody Dynamics
- **Confirmed Limitation**: Rover locomotion is modeled using a 2D kinematic point-mass model with empirical wheel slip, stall current scaling, and terrain lookups, rather than a full 6-DOF multibody rigid body physics engine (such as Chrono or Gazebo).
- **Impact**: Dynamic vehicle rollover physics, suspension rocker articulation angles, and regolith terramechanics are mathematically approximated via empirical formulas rather than continuous force/torque ODE integration.

### 1.2 Discretized Digital Elevation Model (DEM)
- **Confirmed Limitation**: Jezero Crater Sector 4 terrain is represented on an $800 \times 500$ pixel grid ($1.5\text{ m/pixel}$) with 6 defined circular hazard zones and procedural sinusoidal noise.
- **Impact**: Fine-grained micro-topography (such as centimeter-scale sharp rocks or micro-crevasses) smaller than the DEM grid scale is approximated via a stochastic roughness coefficient.

### 1.3 Atmospheric & Diurnal Thermal Model
- **Confirmed Limitation**: Diurnal solar irradiance and thermal radiative dissipation are modeled as scalar sinusoidal equations modulated by Martian day/night cycles. Local atmospheric turbulence, dust storm optical depth ($\tau$), and wind gust vectors are simplified into static dust factor coefficients.

---

## 2. Mission State & Storage

### 2.1 In-Memory Ephemeral Storage
- **Confirmed Limitation**: Active missions, telemetry histories, and event logs are stored strictly in memory (`Map<string, MissionInstance>`).
- **Impact**: Terminating or restarting the Node.js backend process clears all user-created missions, custom hazard threshold modifications, and accumulated event history. The default `primary-mission` is re-initialized with seed `1337` upon startup.
- **Remediation Plan**: Integrate a lightweight embedded database (e.g. SQLite via Prisma or Kysely) in Phase 4.

### 2.2 Bounded Historical Ring Buffers
- **Confirmed Limitation**: To prevent memory leaks during long-running sessions, `telemetryHistory` is capped at 100 data points and `logs` is capped at 300 entries.
- **Impact**: Historical trend analysis through the REST API is restricted to the most recent 100 simulation ticks (~1.5 to 10 minutes depending on speed multiplier).

---

## 3. Autonomous Autonomy & Planning Constraints

### 3.1 Waypoint Navigation
- **Confirmed Limitation**: Waypoint routing currently follows a pre-defined 6-point science trajectory (`WP-0` to `WP-5`). When avoiding hazards, the vehicle applies speed throttling and trajectory offsets rather than running a full global A* or RRT* graph search across the entire Jezero basin.

### 3.2 Mitigation Sequences
- **Confirmed Limitation**: Autonomous mitigations (e.g. Rocker-Bogie Peristaltic Crab-Walk, thermal louvers) execute deterministic, parameterized engineering recovery sequences rather than learned reinforcement learning policies.

---

## 4. Benchmark Model Assumptions

### 4.1 Baseline Teleoperation Ground Delay
- **Confirmed Limitation**: The comparison with Earth teleoperation models ground communication delay as 2,550 seconds (~42.5 minutes round-trip) with an empirical 35% stall failure probability based on historical Mars mission incident reports (e.g. Spirit at Troy).
- **Impact**: While grounded in documented NASA mission operational procedures, individual mission ground-in-the-loop response times vary depending on Deep Space Network (DSN) scheduling and orbiter pass geometry.

---

## 5. Security & Hardware Interfacing

### 5.1 Lack of Flight Qualification & Hardware Interfaces
- **Confirmed Limitation**: AEGIS is a software-only hackathon prototype developed for mission simulation. It is **not** flight-qualified software and does not comply with NASA Class A/B flight software standards (NPR 7150.2) or DO-178C.
- **Impact**: The system cannot be directly flashed onto space-grade rad-hardened flight computers (such as BAE RAD750) without a complete RTOS re-architecture (e.g. cFS / VxWorks).

### 5.2 API Authentication & Access Control
- **Confirmed Limitation**: The Express REST API currently operates without authentication, API keys, or role-based access control (RBAC). It binds to `0.0.0.0:3001` with unrestricted CORS (`*`).
- **Impact**: Intended exclusively for local demonstration and evaluation. Should not be exposed to public networks without a reverse proxy or auth middleware.
