export interface ValidationResult {
  valid: boolean;
  errors: string[];
  code?: 'INVALID_SCHEMA' | 'OUT_OF_RANGE' | 'STALE_PACKET';
}

function isNumber(val: any): val is number {
  return typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val);
}

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z0-9_\-\.]+$/;

/**
 * Validates a HardwareTelemetryPacket for structural correctness,
 * valid physical sensor ranges, identifier sanitization, and timestamp sanity.
 */
export function validateHardwareTelemetryPacket(body: any): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object'], code: 'INVALID_SCHEMA' };
  }

  // 1. Identification & Meta
  if (typeof body.roverId !== 'string' || !body.roverId.trim()) {
    errors.push("'roverId' is required and must be a non-empty string");
  } else {
    const trimmedRover = body.roverId.trim();
    if (trimmedRover.length > 64) {
      errors.push("'roverId' exceeds maximum allowed length of 64 characters");
    } else if (!SAFE_IDENTIFIER_REGEX.test(trimmedRover)) {
      errors.push("'roverId' contains invalid characters; must contain only alphanumeric characters, underscores, hyphens, or dots");
    }
  }

  if (typeof body.missionId !== 'string' || !body.missionId.trim()) {
    errors.push("'missionId' is required and must be a non-empty string");
  } else {
    const trimmedMission = body.missionId.trim();
    if (trimmedMission.length > 64) {
      errors.push("'missionId' exceeds maximum allowed length of 64 characters");
    } else if (!SAFE_IDENTIFIER_REGEX.test(trimmedMission)) {
      errors.push("'missionId' contains invalid characters; must contain only alphanumeric characters, underscores, hyphens, or dots");
    }
  }

  if (!isNumber(body.sequence) || !Number.isInteger(body.sequence) || body.sequence < 0) {
    errors.push("'sequence' is required and must be a non-negative integer");
  }

  if (!isNumber(body.timestamp)) {
    errors.push("'timestamp' is required and must be a numeric epoch timestamp (ms)");
  } else {
    const now = Date.now();
    // Allow up to 300 seconds in the past and up to 60 seconds into future clock skew
    if (body.timestamp < now - 300000) {
      errors.push(`Timestamp is too old (${Math.round((now - body.timestamp) / 1000)}s stale, max allowed is 300s)`);
    } else if (body.timestamp > now + 60000) {
      errors.push(`Timestamp is ahead of server time (+${Math.round((body.timestamp - now) / 1000)}s future clock skew, max allowed is 60s)`);
    }
  }

  // 2. Power Subsystem
  if (!body.power || typeof body.power !== 'object' || Array.isArray(body.power)) {
    errors.push("'power' subsystem object is required");
  } else {
    const { batteryVoltage, currentAmps, batteryPercent, solarVoltage, solarCurrent } = body.power;

    if (!isNumber(batteryVoltage)) {
      errors.push("'power.batteryVoltage' is required and must be a number");
    } else if (batteryVoltage < 0 || batteryVoltage > 60) {
      errors.push(`'power.batteryVoltage' (${batteryVoltage}V) outside valid physical bounds [0, 60V]`);
    }

    if (!isNumber(currentAmps)) {
      errors.push("'power.currentAmps' is required and must be a number");
    } else if (currentAmps < 0 || currentAmps > 100) {
      errors.push(`'power.currentAmps' (${currentAmps}A) outside valid physical bounds [0, 100A]`);
    }

    if (batteryPercent !== undefined) {
      if (!isNumber(batteryPercent) || batteryPercent < 0 || batteryPercent > 100) {
        errors.push(`'power.batteryPercent' must be between 0 and 100%`);
      }
    }

    if (solarVoltage !== undefined) {
      if (!isNumber(solarVoltage) || solarVoltage < 0 || solarVoltage > 60) {
        errors.push(`'power.solarVoltage' must be between 0 and 60V`);
      }
    }

    if (solarCurrent !== undefined) {
      if (!isNumber(solarCurrent) || solarCurrent < 0 || solarCurrent > 30) {
        errors.push(`'power.solarCurrent' must be between 0 and 30A`);
      }
    }
  }

  // 3. Kinematics Subsystem
  if (!body.kinematics || typeof body.kinematics !== 'object' || Array.isArray(body.kinematics)) {
    errors.push("'kinematics' subsystem object is required");
  } else {
    const { pitchDeg, rollDeg, yawDeg, speedMps, wheelSlipRatio, tiltAngleDeg } = body.kinematics;

    if (!isNumber(pitchDeg)) {
      errors.push("'kinematics.pitchDeg' is required and must be a number");
    } else if (pitchDeg < -90 || pitchDeg > 90) {
      errors.push(`'kinematics.pitchDeg' (${pitchDeg}°) outside valid bounds [-90°, +90°]`);
    }

    if (!isNumber(rollDeg)) {
      errors.push("'kinematics.rollDeg' is required and must be a number");
    } else if (rollDeg < -90 || rollDeg > 90) {
      errors.push(`'kinematics.rollDeg' (${rollDeg}°) outside valid bounds [-90°, +90°]`);
    }

    if (yawDeg !== undefined) {
      if (!isNumber(yawDeg) || yawDeg < 0 || yawDeg > 360) {
        errors.push(`'kinematics.yawDeg' must be between 0° and 360°`);
      }
    }

    if (speedMps !== undefined) {
      if (!isNumber(speedMps) || speedMps < -10 || speedMps > 30) {
        errors.push(`'kinematics.speedMps' (${speedMps} m/s) outside valid limits [-10, 30]`);
      }
    }

    if (wheelSlipRatio !== undefined) {
      if (!isNumber(wheelSlipRatio) || wheelSlipRatio < 0 || wheelSlipRatio > 1.0) {
        errors.push(`'kinematics.wheelSlipRatio' must be between 0.0 and 1.0`);
      }
    }

    if (tiltAngleDeg !== undefined) {
      if (!isNumber(tiltAngleDeg) || tiltAngleDeg < 0 || tiltAngleDeg > 90) {
        errors.push(`'kinematics.tiltAngleDeg' must be between 0° and 90°`);
      }
    }
  }

  // 4. Thermal Subsystem (Optional)
  if (body.thermal !== undefined) {
    if (typeof body.thermal !== 'object' || body.thermal === null || Array.isArray(body.thermal)) {
      errors.push("'thermal' subsystem must be an object if provided");
    } else {
      const { ambientTempC, motorTempC, mcuTempC } = body.thermal;

      if (ambientTempC !== undefined) {
        if (!isNumber(ambientTempC) || ambientTempC < -100 || ambientTempC > 100) {
          errors.push(`'thermal.ambientTempC' outside physical bounds [-100°C, 100°C]`);
        }
      }

      if (motorTempC !== undefined) {
        if (!isNumber(motorTempC) || motorTempC < -40 || motorTempC > 180) {
          errors.push(`'thermal.motorTempC' outside physical bounds [-40°C, 180°C]`);
        }
      }

      if (mcuTempC !== undefined) {
        if (!isNumber(mcuTempC) || mcuTempC < -40 || mcuTempC > 125) {
          errors.push(`'thermal.mcuTempC' outside physical bounds [-40°C, 125°C]`);
        }
      }
    }
  }

  // 5. Environment Subsystem (Optional)
  if (body.environment !== undefined) {
    if (typeof body.environment !== 'object' || body.environment === null || Array.isArray(body.environment)) {
      errors.push("'environment' subsystem must be an object if provided");
    } else {
      const { forwardDistanceCm, obstacleDetected, opticalLux } = body.environment;

      if (forwardDistanceCm !== undefined) {
        if (!isNumber(forwardDistanceCm) || forwardDistanceCm < 0 || forwardDistanceCm > 3000) {
          errors.push(`'environment.forwardDistanceCm' must be between 0 and 3000 cm`);
        }
      }

      if (obstacleDetected !== undefined && typeof obstacleDetected !== 'boolean') {
        errors.push(`'environment.obstacleDetected' must be a boolean`);
      }

      if (opticalLux !== undefined) {
        if (!isNumber(opticalLux) || opticalLux < 0) {
          errors.push(`'environment.opticalLux' must be non-negative`);
        }
      }
    }
  }

  // 6. Comms Subsystem
  if (!body.comms || typeof body.comms !== 'object' || Array.isArray(body.comms)) {
    errors.push("'comms' subsystem object is required");
  } else {
    const { rssiDbm, packetLossPercent, roundTripLatencyMs } = body.comms;

    if (!isNumber(rssiDbm)) {
      errors.push("'comms.rssiDbm' is required and must be a number");
    } else if (rssiDbm < -130 || rssiDbm > 0) {
      errors.push(`'comms.rssiDbm' (${rssiDbm} dBm) outside physical bounds [-130 dBm, 0 dBm]`);
    }

    if (packetLossPercent !== undefined) {
      if (!isNumber(packetLossPercent) || packetLossPercent < 0 || packetLossPercent > 100) {
        errors.push(`'comms.packetLossPercent' must be between 0% and 100%`);
      }
    }

    if (roundTripLatencyMs !== undefined) {
      if (!isNumber(roundTripLatencyMs) || roundTripLatencyMs < 0 || roundTripLatencyMs > 60000) {
        errors.push(`'comms.roundTripLatencyMs' must be between 0 and 60,000 ms`);
      }
    }
  }

  // 7. Status Flags (Optional)
  if (body.status !== undefined) {
    if (typeof body.status !== 'object' || body.status === null || Array.isArray(body.status)) {
      errors.push("'status' must be an object if provided");
    } else {
      if (body.status.systemHealth && !['OK', 'DEGRADED', 'FAULT'].includes(body.status.systemHealth)) {
        errors.push("'status.systemHealth' must be one of 'OK', 'DEGRADED', 'FAULT'");
      }
      if (body.status.faultFlags !== undefined) {
        if (!Array.isArray(body.status.faultFlags)) {
          errors.push("'status.faultFlags' must be an array of strings");
        } else if (body.status.faultFlags.length > 20) {
          errors.push("'status.faultFlags' exceeds maximum of 20 items");
        } else {
          for (let i = 0; i < body.status.faultFlags.length; i++) {
            const flag = body.status.faultFlags[i];
            if (typeof flag !== 'string' || flag.length > 64) {
              errors.push(`'status.faultFlags[${i}]' must be a string with length <= 64`);
              break;
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    const hasOutOfRange = errors.some((e) => e.includes('outside') || e.includes('between'));
    const hasStale = errors.some((e) => e.includes('Timestamp is too old') || e.includes('future clock skew'));
    const code = hasStale ? 'STALE_PACKET' : hasOutOfRange ? 'OUT_OF_RANGE' : 'INVALID_SCHEMA';
    return { valid: false, errors, code };
  }

  return { valid: true, errors: [] };
}
