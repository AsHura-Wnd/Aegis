export type OperationalMode =
  | 'AUTONOMOUS_TRANSIT'
  | 'TELEOPERATION'
  | 'HAZARD_AVOIDANCE'
  | 'SAFE_HOLD'
  | 'RECHARGE_STANDBY'
  | 'EMERGENCY_RECOVERY';

export type TerrainType =
  | 'NORMAL_REGOLITH'
  | 'ROCKY_BEDROCK'
  | 'LOOSE_SAND_DUNE'
  | 'CRATER_SLOPE'
  | 'RECHARGE_PLATEAU'
  | 'COMM_SHADOW_CANYON';

export interface WheelTelemetry {
  id: string; // 'FL', 'FR', 'ML', 'MR', 'RL', 'RR'
  label: string;
  rpm: number;
  torque: number; // Nm
  slipRatio: number; // 0.0 to 1.0 (0% to 100%)
  motorCurrent: number; // Amperes
  motorTemp: number; // °C
  tractionGood: boolean;
}

export interface RoverTelemetry {
  tick: number;
  missionTimeSeconds: number;
  formattedTime: string; // "MET 04:12:35"
  
  // Power subsystem
  batteryLevel: number; // 0 to 100 %
  batteryVoltage: number; // Volts (nominal ~28V - 32V)
  batteryDischargeRate: number; // Watts
  solarEfficiency: number; // 0 to 100 %
  solarGenerationWatts: number; // Watts
  netPowerWatts: number; // Generation - Consumption
  powerConsumptionWatts: number; // Watts
  dustAccumulation: number; // 0 to 100 %
  
  // Thermal subsystem
  internalTemp: number; // °C (-50 to +80)
  motorAverageTemp: number; // °C
  ambientTemp: number; // °C (-100 to +25)
  heatersActive: boolean;
  radiatorDeployed: boolean;
  
  // Communication
  signalStrengthDbm: number; // -120 dBm (none) to -60 dBm (strong)
  signalQualityPercent: number; // 0 to 100 %
  commLatencyMs: number; // ms to orbiter
  packetLossPercent: number;
  relayConnected: boolean;
  
  // Mobility & Navigation
  speed: number; // m/s (nominal 0.04 to 0.15 m/s)
  commandedSpeed: number; // m/s
  wheelSlipAverage: number; // 0.0 to 1.0
  isStuck: boolean;
  stuckCounter: number;
  wheels: WheelTelemetry[];
  
  // Kinematics & Coordinates
  position: { x: number; y: number };
  heading: number; // degrees 0-360
  pitch: number; // degrees
  roll: number; // degrees
  slopeAngle: number; // degrees
  roughnessIndex: number; // 0.0 to 1.0
  currentTerrain: TerrainType;
  
  // Mission Progress & Source
  distanceTraveledMeters: number;
  distanceToTargetMeters: number;
  progressPercent: number;
  currentObjective: string;
  operationalMode: OperationalMode;

  // Data Source & Hardware Identification
  telemetrySource?: 'SIMULATION' | 'HARDWARE';
  roverId?: string;
  sequenceNumber?: number;
  forwardDistanceCm?: number;
  lastHardwareContact?: number;
}

export interface TelemetryHistoryPoint {
  tick: number;
  timestamp: string;
  battery: number;
  temperature: number;
  solar: number;
  signal: number;
  speed: number;
  power: number;
  wheelSlip: number;
  riskScore: number;
}
