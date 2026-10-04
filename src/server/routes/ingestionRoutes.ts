import { Router, Request, Response } from 'express';
import { deviceAuthMiddleware } from '../middleware/deviceAuth';
import { validateHardwareTelemetryPacket } from '../validators/telemetryValidator';
import { deviceService } from '../services/deviceService';
import { missionService } from '../services/missionService';
import { HardwareTelemetryPacket } from '../../types/hardwareTelemetry';

export const telemetryRouter = Router();
export const deviceRouter = Router();

/**
 * POST /api/telemetry/ingest
 * Ingests physical RC rover telemetry, validates schema and physical bounds,
 * verifies device authorization, updates mission state, evaluates hazards, and calculates dynamic risk.
 */
telemetryRouter.post('/ingest', deviceAuthMiddleware, (req: Request, res: Response): void => {
  const packet = req.body as HardwareTelemetryPacket;

  // 1. Validate payload structure, numeric bounds, identifier formatting, and timestamp freshness
  const validation = validateHardwareTelemetryPacket(packet);
  if (!validation.valid) {
    res.status(400).json({
      error: 'Telemetry packet validation failed',
      code: validation.code || 'INVALID_SCHEMA',
      details: validation.errors,
    });
    return;
  }

  // 2. Enforce rover-scoped token authorization (prevent spoofing another rover)
  const auth = req.deviceAuth;
  if (auth?.boundRoverId && auth.boundRoverId !== packet.roverId) {
    res.status(403).json({
      error: `Forbidden: Authenticated device token is authorized only for rover '${auth.boundRoverId}', but packet claims '${packet.roverId}'`,
      code: 'FORBIDDEN',
      authorizedRoverId: auth.boundRoverId,
      requestedRoverId: packet.roverId,
    });
    return;
  }

  // 3. Verify associated mission exists
  const mission = missionService.getMission(packet.missionId);
  if (!mission) {
    res.status(404).json({
      error: `Mission '${packet.missionId}' not found`,
      code: 'MISSION_NOT_FOUND',
      missionId: packet.missionId,
      availableMissions: missionService.listMissions().map((m) => m.id),
    });
    return;
  }

  // 4. Record in device service to verify monotonic sequence and enforce mission isolation
  const recordResult = deviceService.recordPacket(packet);
  if (!recordResult.accepted) {
    res.status(409).json({
      error: recordResult.error || 'Duplicate or out-of-order sequence packet',
      code: recordResult.code || 'OUT_OF_ORDER',
      roverId: packet.roverId,
      sequence: packet.sequence,
    });
    return;
  }

  // 5. Ingest telemetry into the mission instance intelligence pipeline
  const updatedTelemetry = mission.ingestHardwareTelemetry(packet);
  const risk = mission.getRisk();
  const hazards = mission.getHazards();

  // 6. Gather recommendations from active hazards and autonomous decisions
  const recommendations: string[] = [];
  hazards.active.forEach((h) => {
    if (h.recommendedAction && !recommendations.includes(h.recommendedAction)) {
      recommendations.push(h.recommendedAction);
    }
  });
  const recentDec = mission.getDecisions().recent;
  if (recentDec && recentDec.actionTaken && !recommendations.includes(recentDec.actionTaken)) {
    recommendations.push(recentDec.actionTaken);
  }

  // 7. Respond with acknowledgement, current risk score, active hazards, and recommendations
  res.status(200).json({
    status: 'ACCEPTED',
    roverId: packet.roverId,
    missionId: packet.missionId,
    sequence: packet.sequence,
    processedAt: Date.now(),
    telemetrySource: 'HARDWARE',
    riskScore: risk.currentScore,
    riskLevel: risk.riskLevel,
    activeHazardsCount: hazards.active.length,
    activeHazards: hazards.active.map((h) => ({
      hazardType: h.hazardType,
      severity: h.severity,
      description: h.reason,
      recommendedAction: h.recommendedAction,
    })),
    recommendations,
    subsystems: {
      batteryLevel: updatedTelemetry.batteryLevel,
      powerConsumptionWatts: updatedTelemetry.powerConsumptionWatts,
      motorAverageTemp: updatedTelemetry.motorAverageTemp,
      signalStrengthDbm: updatedTelemetry.signalStrengthDbm,
      operationalMode: updatedTelemetry.operationalMode,
    },
  });
});

/**
 * GET /api/devices
 * Lists all registered rovers, connection states (ONLINE/STALE/DISCONNECTED),
 * and subsystem health indicators.
 */
deviceRouter.get('/', (_req: Request, res: Response): void => {
  const devices = deviceService.listDevices();
  res.json({
    totalDevices: devices.length,
    devices,
  });
});

/**
 * GET /api/devices/:roverId
 * Returns detailed connectivity status and telemetry stats for a single rover.
 */
deviceRouter.get('/:roverId', (req: Request, res: Response): void => {
  const roverId = String(req.params.roverId);
  const status = deviceService.getDeviceStatus(roverId);
  if (!status) {
    res.status(404).json({
      error: `Device '${roverId}' not found in registry`,
      code: 'DEVICE_NOT_FOUND',
      registeredDevices: deviceService.listDevices().map((d) => d.roverId),
    });
    return;
  }
  res.json({ device: status });
});

/**
 * POST /api/devices/:roverId/reset
 * Resets a rover's sequence counter and tracking in registry (e.g. after microcontroller reboot).
 * Protected: Requires device authentication token.
 */
deviceRouter.post('/:roverId/reset', deviceAuthMiddleware, (req: Request, res: Response): void => {
  const roverId = String(req.params.roverId);
  const auth = req.deviceAuth;

  // Prevent token scoped to one rover from resetting a different rover
  if (auth?.boundRoverId && auth.boundRoverId !== roverId) {
    res.status(403).json({
      error: `Forbidden: Device token is authorized only for rover '${auth.boundRoverId}', cannot reset rover '${roverId}'`,
      code: 'FORBIDDEN',
      authorizedRoverId: auth.boundRoverId,
      targetRoverId: roverId,
    });
    return;
  }

  const existed = deviceService.resetDevice(roverId);
  res.json({
    message: existed ? `Device '${roverId}' tracking reset.` : `Device '${roverId}' was not registered; created empty slot.`,
    roverId,
  });
});
