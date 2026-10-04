/**
 * AEGIS Unified Hardware Telemetry Contract
 * Standardized telemetry packet format transmitted by physical rovers (ESP32 / Raspberry Pi).
 */

export interface HardwarePowerMeasurements {
  batteryVoltage: number;        // Pack voltage in Volts (e.g. 10.0V - 12.6V)
  currentAmps: number;           // Bus current in Amperes
  batteryPercent?: number;       // Estimated State of Charge (0 - 100%)
  solarVoltage?: number;         // Aux solar / secondary bus voltage in Volts
  solarCurrent?: number;         // Aux solar / secondary bus current in Amperes
}

export interface HardwareKinematicsMeasurements {
  pitchDeg: number;              // IMU pitch in degrees (-90 to +90)
  rollDeg: number;               // IMU roll in degrees (-90 to +90)
  yawDeg?: number;               // IMU yaw/heading in degrees (0 to 360)
  speedMps?: number;             // Ground speed from wheel encoders (m/s)
  wheelSlipRatio?: number;       // Calculated wheel slip (0.0 to 1.0)
  tiltAngleDeg?: number;         // Derived compound tilt angle (degrees)
}

export interface HardwareThermalMeasurements {
  ambientTempC?: number;         // Ambient temperature in °C (-50 to +80)
  motorTempC?: number;           // Drive motor chassis temp in °C (-20 to +120)
  mcuTempC?: number;             // Microcontroller internal temp in °C (-20 to +100)
}

export interface HardwareEnvironmentMeasurements {
  forwardDistanceCm?: number;    // Forward ToF / Ultrasonic clearance (cm)
  obstacleDetected?: boolean;    // Hardware proximity switch / sensor threshold
  opticalLux?: number;           // Ambient light level (Lux)
}

export interface HardwareCommsMeasurements {
  rssiDbm: number;               // WiFi / LoRa / RF RSSI in dBm (-120 to -20)
  packetLossPercent?: number;    // Measured link loss (%)
  roundTripLatencyMs?: number;   // Round-trip ping to base (ms)
}

export interface HardwareStatusFlags {
  systemHealth: 'OK' | 'DEGRADED' | 'FAULT';
  faultFlags?: string[];         // Hardware error strings (e.g. 'IMU_CALIBRATION_PENDING')
}

export interface HardwareTelemetryPacket {
  roverId: string;               // Unique hardware device ID (e.g. 'aegis-rover-01')
  missionId: string;             // Associated mission instance ID (e.g. 'primary-mission')
  timestamp: number;             // UTC epoch timestamp in milliseconds
  sequence: number;              // Monotonically increasing sequence number

  power: HardwarePowerMeasurements;
  kinematics: HardwareKinematicsMeasurements;
  thermal?: HardwareThermalMeasurements;
  environment?: HardwareEnvironmentMeasurements;
  comms: HardwareCommsMeasurements;
  status?: HardwareStatusFlags;
}

export interface IngestionSuccessResponse {
  status: 'ACCEPTED';
  roverId: string;
  missionId: string;
  sequence: number;
  processedAt: number;
  telemetrySource: 'HARDWARE';
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  activeHazardsCount: number;
  recommendations: string[];
}

export interface IngestionErrorResponse {
  error: string;
  code: 'UNAUTHORIZED' | 'INVALID_SCHEMA' | 'OUT_OF_RANGE' | 'MISSION_NOT_FOUND' | 'STALE_PACKET';
  details?: any;
}
