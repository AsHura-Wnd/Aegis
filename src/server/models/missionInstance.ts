import { AegisAIAssistant } from '../../engines/aiAssistantEngine';
import { AutonomousDecision, AutonomousDecisionEngine } from '../../engines/decisionEngine';
import { HazardDetectionEngine } from '../../engines/hazardEngine';
import { DynamicRiskEngine } from '../../engines/riskEngine';
import { RoverSimulationModel } from '../../simulation/roverModel';
import { SCENARIO_CATALOG } from '../../simulation/scenarioDefinitions';
import { DetectedHazard, HazardType } from '../../types/hazard';
import { LogEntry } from '../../types/log';
import { RiskAssessment } from '../../types/risk';
import { ScenarioId } from '../../types/scenario';
import { RoverTelemetry, TelemetryHistoryPoint } from '../../types/telemetry';
import { HardwareTelemetryPacket } from '../../types/hardwareTelemetry';

export interface MissionMetadata {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABORTED';
  speedMultiplier: number;
  activeScenarioId: ScenarioId | null;
  tickCount: number;
  missionTimeSeconds: number;
  formattedTime: string;
}

export class MissionInstance {
  public readonly id: string;
  public readonly name: string;
  public seed: number;
  public readonly createdAt: number;
  public status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABORTED' = 'PAUSED';
  public speedMultiplier: number = 1;
  public activeScenarioId: ScenarioId | null = null;

  private simModel: RoverSimulationModel;
  private hazardEngine: HazardDetectionEngine;
  private riskEngine: DynamicRiskEngine;
  private decisionEngine: AutonomousDecisionEngine;
  private assistant: AegisAIAssistant;

  private latestTelemetry: RoverTelemetry;
  private activeHazards: DetectedHazard[] = [];
  private latestRisk: RiskAssessment;
  private recentDecision: AutonomousDecision | null = null;
  private logs: LogEntry[] = [];
  private telemetryHistory: TelemetryHistoryPoint[] = [];

  private timerHandle: NodeJS.Timeout | null = null;

  constructor(id: string, name: string = 'Jezero Delta Exploration', seed: number = 1337) {
    this.id = id;
    this.name = name;
    this.seed = seed;
    this.createdAt = Date.now();

    this.simModel = new RoverSimulationModel(seed);
    this.hazardEngine = new HazardDetectionEngine();
    this.riskEngine = new DynamicRiskEngine();
    this.decisionEngine = new AutonomousDecisionEngine();
    this.assistant = new AegisAIAssistant();

    // Initial state
    this.latestTelemetry = this.simModel.step(0);
    this.activeHazards = this.hazardEngine.evaluate(this.latestTelemetry);
    this.latestRisk = this.riskEngine.calculateRisk(this.latestTelemetry, this.activeHazards);

    const initLog: LogEntry = {
      id: `INIT-${this.id}-${Date.now()}`,
      tick: 0,
      time: 'MET 00:00:00',
      timestamp: Date.now(),
      category: 'SYSTEM',
      severity: 'LOW',
      title: 'MISSION INITIALIZED',
      description: `AEGIS Mission '${this.name}' initialized with Seed ${this.seed}. All 9 hazard vectors nominal.`,
      source: 'SYSTEM',
    };
    this.logs.push(initLog);
  }

  public getMetadata(): MissionMetadata {
    return {
      id: this.id,
      name: this.name,
      seed: this.seed,
      createdAt: this.createdAt,
      status: this.status,
      speedMultiplier: this.speedMultiplier,
      activeScenarioId: this.activeScenarioId,
      tickCount: this.latestTelemetry.tick,
      missionTimeSeconds: this.latestTelemetry.missionTimeSeconds,
      formattedTime: this.latestTelemetry.formattedTime,
    };
  }

  public getTelemetry(): { current: RoverTelemetry; history: TelemetryHistoryPoint[]; trail: { x: number; y: number; tick: number }[] } {
    return {
      current: this.latestTelemetry,
      history: [...this.telemetryHistory],
      trail: this.simModel.getTrail(),
    };
  }

  public getHazards(): { active: DetectedHazard[]; configs: Record<HazardType, any> } {
    return {
      active: [...this.activeHazards],
      configs: this.hazardEngine.getConfigs(),
    };
  }

  public updateHazardConfig(type: HazardType, partial: any): void {
    this.hazardEngine.updateConfig(type, partial);
    this.step(0);
  }

  public getRisk(): RiskAssessment {
    return { ...this.latestRisk };
  }

  public getDecisions(): { recent: AutonomousDecision | null; logs: LogEntry[] } {
    return {
      recent: this.recentDecision,
      logs: [...this.logs],
    };
  }

  public async askAssistant(query: string): Promise<any> {
    return this.assistant.respondToQuery(query, {
      telemetry: this.latestTelemetry,
      activeHazards: this.activeHazards,
      risk: this.latestRisk,
      missionName: this.name,
      lastDecision: this.recentDecision?.actionTaken,
    });
  }

  public setApiKey(key: string): void {
    this.assistant.setApiKey(key);
  }

  public step(dtSeconds: number = 1.0): RoverTelemetry {
    // 1. Advance simulation
    const nextTelemetry = this.simModel.step(dtSeconds);

    // 2. Evaluate all 9 hazard rules
    const hazards = this.hazardEngine.evaluate(nextTelemetry);

    // 3. Dynamic compounding risk calculation
    const risk = this.riskEngine.calculateRisk(nextTelemetry, hazards);

    // 4. Decision & mode executive
    const { newLogs, decision, modeOverride } = this.decisionEngine.evaluateDecisions(
      nextTelemetry,
      hazards,
      risk
    );

    if (modeOverride) {
      this.simModel.setOperationalMode(modeOverride);
      nextTelemetry.operationalMode = modeOverride;
    }

    if (decision) {
      this.recentDecision = decision;
    }

    if (newLogs.length > 0) {
      this.logs = [...newLogs, ...this.logs].slice(0, 300);
    }

    this.latestTelemetry = nextTelemetry;
    this.activeHazards = hazards;
    this.latestRisk = risk;

    if (dtSeconds > 0) {
      this.telemetryHistory.push({
        tick: nextTelemetry.tick,
        timestamp: nextTelemetry.formattedTime,
        battery: nextTelemetry.batteryLevel,
        temperature: nextTelemetry.motorAverageTemp,
        solar: nextTelemetry.solarEfficiency,
        signal: nextTelemetry.signalStrengthDbm,
        speed: nextTelemetry.speed,
        power: nextTelemetry.powerConsumptionWatts,
        wheelSlip: nextTelemetry.wheelSlipAverage,
        riskScore: risk.currentScore,
      });

      if (this.telemetryHistory.length > 100) {
        this.telemetryHistory.shift();
      }
    }

    return this.latestTelemetry;
  }

  public ingestHardwareTelemetry(packet: HardwareTelemetryPacket): RoverTelemetry {
    // Stop simulation timer if running, since real hardware is providing the telemetry stream
    this.stopTimer();
    this.status = 'RUNNING';

    // Calculate mission elapsed time
    const elapsedSeconds = Math.floor((packet.timestamp - this.createdAt) / 1000);
    const missionTimeSeconds = Math.max(this.latestTelemetry.missionTimeSeconds + 1, Math.max(0, elapsedSeconds));
    const hours = Math.floor(missionTimeSeconds / 3600);
    const mins = Math.floor((missionTimeSeconds % 3600) / 60);
    const secs = Math.floor(missionTimeSeconds % 60);
    const formattedTime = `MET ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Subsystem conversions: Power
    const voltage = packet.power.batteryVoltage;
    const current = packet.power.currentAmps;
    const powerConsumptionWatts = Math.round(voltage * current * 10) / 10;

    let batteryLevel: number;
    if (packet.power.batteryPercent !== undefined) {
      batteryLevel = packet.power.batteryPercent;
    } else if (voltage >= 20) {
      batteryLevel = Math.max(0, Math.min(100, Math.round(((voltage - 20.0) / (25.2 - 20.0)) * 100)));
    } else {
      batteryLevel = Math.max(0, Math.min(100, Math.round(((voltage - 10.0) / (12.6 - 10.0)) * 100)));
    }

    const solarVoltage = packet.power.solarVoltage ?? 0;
    const solarCurrent = packet.power.solarCurrent ?? 0;
    const solarGenerationWatts = Math.round(solarVoltage * solarCurrent * 10) / 10;
    const solarEfficiency = packet.power.solarVoltage
      ? Math.max(0, Math.min(100, Math.round((packet.power.solarVoltage / 18.0) * 100)))
      : (this.latestTelemetry.solarEfficiency ?? 85);
    const netPowerWatts = Math.round((solarGenerationWatts - powerConsumptionWatts) * 10) / 10;

    // Subsystem conversions: Kinematics & Mobility
    const pitch = packet.kinematics.pitchDeg;
    const roll = packet.kinematics.rollDeg;
    const slopeAngle = packet.kinematics.tiltAngleDeg ?? Math.round(Math.hypot(pitch, roll) * 10) / 10;
    const speed = packet.kinematics.speedMps ?? (packet.status?.systemHealth === 'OK' ? 0.08 : 0);
    const wheelSlipAverage = packet.kinematics.wheelSlipRatio ?? 0;
    const isStuck = wheelSlipAverage > 0.85 || packet.status?.systemHealth === 'FAULT';

    // Subsystem conversions: Thermal
    const internalTemp = packet.thermal?.mcuTempC ?? this.latestTelemetry.internalTemp ?? 21.0;
    const motorAverageTemp = packet.thermal?.motorTempC ?? this.latestTelemetry.motorAverageTemp ?? 24.0;
    const ambientTemp = packet.thermal?.ambientTempC ?? this.latestTelemetry.ambientTemp ?? 15.0;

    // Subsystem conversions: Communication
    const signalStrengthDbm = packet.comms.rssiDbm;
    const signalQualityPercent = Math.max(0, Math.min(100, Math.round(2 * (signalStrengthDbm + 100))));
    const commLatencyMs = packet.comms.roundTripLatencyMs ?? 18;
    const packetLossPercent = packet.comms.packetLossPercent ?? 0;
    const relayConnected = signalStrengthDbm > -105;

    // Subsystem conversions: Wheels
    const motorCurrentPerWheel = Math.round((current / 6) * 10) / 10;
    const wheels = ['FL', 'FR', 'ML', 'MR', 'RL', 'RR'].map((id, idx) => ({
      id,
      label: ['Front Left', 'Front Right', 'Mid Left', 'Mid Right', 'Rear Left', 'Rear Right'][idx],
      rpm: Math.round(speed * 60),
      torque: 25,
      slipRatio: wheelSlipAverage,
      motorCurrent: motorCurrentPerWheel,
      motorTemp: motorAverageTemp,
      tractionGood: wheelSlipAverage < 0.35,
    }));

    // Construct unified RoverTelemetry
    const nextTelemetry: RoverTelemetry = {
      tick: packet.sequence,
      missionTimeSeconds,
      formattedTime,

      // Power
      batteryLevel,
      batteryVoltage: voltage,
      batteryDischargeRate: powerConsumptionWatts,
      solarEfficiency,
      solarGenerationWatts,
      netPowerWatts,
      powerConsumptionWatts,
      dustAccumulation: this.latestTelemetry.dustAccumulation ?? 8,

      // Thermal
      internalTemp,
      motorAverageTemp,
      ambientTemp,
      heatersActive: ambientTemp < -20,
      radiatorDeployed: motorAverageTemp > 45,

      // Communication
      signalStrengthDbm,
      signalQualityPercent,
      commLatencyMs,
      packetLossPercent,
      relayConnected,

      // Mobility & Navigation
      speed,
      commandedSpeed: this.latestTelemetry.commandedSpeed ?? 0.1,
      wheelSlipAverage,
      isStuck,
      stuckCounter: isStuck ? (this.latestTelemetry.stuckCounter + 1) : 0,
      wheels,

      // Kinematics & Coordinates
      position: { ...this.latestTelemetry.position },
      heading: packet.kinematics.yawDeg ?? this.latestTelemetry.heading,
      pitch,
      roll,
      slopeAngle,
      roughnessIndex: slopeAngle > 20 ? 0.6 : 0.2,
      currentTerrain: slopeAngle > 18 ? 'CRATER_SLOPE' : this.latestTelemetry.currentTerrain,

      // Progress & Objective
      distanceTraveledMeters: this.latestTelemetry.distanceTraveledMeters + Math.max(0, speed * 1.0),
      distanceToTargetMeters: Math.max(0, this.latestTelemetry.distanceToTargetMeters - Math.max(0, speed * 1.0)),
      progressPercent: this.latestTelemetry.progressPercent,
      currentObjective: `[HARDWARE-LINK] Telemetry Packet #${packet.sequence} | Rover: ${packet.roverId}`,
      operationalMode: this.latestTelemetry.operationalMode,

      // Hardware identification & source
      telemetrySource: 'HARDWARE',
      roverId: packet.roverId,
      sequenceNumber: packet.sequence,
      forwardDistanceCm: packet.environment?.forwardDistanceCm,
      lastHardwareContact: packet.timestamp,
    };

    // Evaluate AEGIS intelligence pipeline
    const hazards = this.hazardEngine.evaluate(nextTelemetry);
    const risk = this.riskEngine.calculateRisk(nextTelemetry, hazards);
    const { newLogs, decision, modeOverride } = this.decisionEngine.evaluateDecisions(
      nextTelemetry,
      hazards,
      risk
    );

    if (modeOverride) {
      nextTelemetry.operationalMode = modeOverride;
    }
    if (decision) {
      this.recentDecision = decision;
    }
    if (newLogs.length > 0) {
      this.logs = [...newLogs, ...this.logs].slice(0, 300);
    }

    this.latestTelemetry = nextTelemetry;
    this.activeHazards = hazards;
    this.latestRisk = risk;

    this.telemetryHistory.push({
      tick: nextTelemetry.tick,
      timestamp: nextTelemetry.formattedTime,
      battery: nextTelemetry.batteryLevel,
      temperature: nextTelemetry.motorAverageTemp,
      solar: nextTelemetry.solarEfficiency,
      signal: nextTelemetry.signalStrengthDbm,
      speed: nextTelemetry.speed,
      power: nextTelemetry.powerConsumptionWatts,
      wheelSlip: nextTelemetry.wheelSlipAverage,
      riskScore: risk.currentScore,
    });

    if (this.telemetryHistory.length > 100) {
      this.telemetryHistory.shift();
    }

    return this.latestTelemetry;
  }

  public start(speedMultiplier: number = 1): void {
    this.status = 'RUNNING';
    this.speedMultiplier = speedMultiplier;
    this.stopTimer();

    const intervalMs = Math.max(100, Math.floor(1000 / this.speedMultiplier));
    this.timerHandle = setInterval(() => {
      this.step(1.0);
    }, intervalMs);
  }

  public pause(): void {
    this.status = 'PAUSED';
    this.stopTimer();
  }

  public injectScenario(scenarioId: ScenarioId): { scenario: any; telemetry: RoverTelemetry; risk: RiskAssessment } {
    this.activeScenarioId = scenarioId;
    const scenarioDef = SCENARIO_CATALOG[scenarioId];

    if (!scenarioDef) {
      throw new Error(`Unknown scenario ID: ${scenarioId}`);
    }

    const scLog: LogEntry = {
      id: `SCENARIO-${scenarioId}-${Date.now()}`,
      tick: this.latestTelemetry.tick,
      time: this.latestTelemetry.formattedTime,
      timestamp: Date.now(),
      category: 'SCENARIO',
      severity: scenarioDef.expectedRiskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      title: `SCENARIO INJECTED: ${scenarioDef.name}`,
      description: scenarioDef.fullDesc,
      recommendedAction: scenarioDef.suggestedMitigation,
      source: 'SCENARIO_INJECTOR',
    };
    this.logs.unshift(scLog);

    switch (scenarioId) {
      case 'LOW_BATTERY':
        this.simModel.setFaults({ lowBattery: true });
        break;
      case 'ROVER_STUCK':
        this.simModel.setFaults({ roverStuck: true });
        break;
      case 'COMM_LOSS':
        this.simModel.setFaults({ commLoss: true });
        break;
      case 'EXTREME_TEMP':
        this.simModel.setFaults({ extremeTemp: 'HOT' });
        break;
      case 'SOLAR_DUST':
        this.simModel.setFaults({ solarDust: true });
        break;
      case 'HAZARDOUS_TERRAIN':
        this.simModel.setFaults({ hazardousTerrain: true });
        break;
    }

    this.step(1.0);
    return {
      scenario: scenarioDef,
      telemetry: this.latestTelemetry,
      risk: this.latestRisk,
    };
  }

  public clearFaults(): void {
    this.activeScenarioId = null;
    this.simModel.clearFaults();

    const clearLog: LogEntry = {
      id: `CLEAR-${Date.now()}`,
      tick: this.latestTelemetry.tick,
      time: this.latestTelemetry.formattedTime,
      timestamp: Date.now(),
      category: 'SCENARIO',
      severity: 'LOW',
      title: 'ALL FAULT INJECTIONS CLEARED',
      description: 'Rover subsystems commanded back to nominal operating profiles.',
      source: 'OPERATOR',
    };
    this.logs.unshift(clearLog);
    this.step(1.0);
  }

  public executeMitigation(hazardType?: HazardType): { action: string; telemetry: RoverTelemetry; risk: RiskAssessment } {
    let actionTaken = 'Executed autonomous safety protocol.';

    if (!hazardType && this.activeHazards.length > 0) {
      hazardType = this.activeHazards[0].hazardType;
    }

    if (hazardType === 'ROVER_STUCK' || hazardType === 'WHEEL_SLIP') {
      this.simModel.setFaults({ roverStuck: false });
      this.simModel.setOperationalMode('AUTONOMOUS_TRANSIT');
      this.activeScenarioId = null;
      actionTaken = 'Engaged peristaltic rocker-bogie articulation; extricated drive wheels from loose sand.';
    } else if (hazardType === 'LOW_BATTERY') {
      this.simModel.setOperationalMode('RECHARGE_STANDBY');
      actionTaken = 'Redirected mission trajectory to Solis Plateau Solar Haven; suspended science payloads.';
    } else if (hazardType === 'WEAK_COMMUNICATION') {
      this.simModel.setOperationalMode('SAFE_HOLD');
      actionTaken = 'Switched to Full Autonomous Safeguard Mode (ASM); buffering all telemetry.';
    } else if (hazardType === 'OVERHEATING') {
      this.simModel.setFaults({ extremeTemp: null });
      actionTaken = 'Deployed auxiliary thermal louvers; idled drive motor assembly.';
    } else if (hazardType === 'SOLAR_PANEL_DEGRADATION') {
      this.simModel.setFaults({ solarDust: false });
      actionTaken = 'Optimized solar array tilt angle to sun vector; scheduled wind clearing window.';
    } else if (hazardType === 'DANGEROUS_TERRAIN') {
      this.simModel.setFaults({ hazardousTerrain: false });
      this.simModel.setOperationalMode('HAZARD_AVOIDANCE');
      actionTaken = 'Applied mechanical brakes; generated 3D DEM contour-following detour spline.';
    }

    const mitLog: LogEntry = {
      id: `MIT-${Date.now()}`,
      tick: this.latestTelemetry.tick,
      time: this.latestTelemetry.formattedTime,
      timestamp: Date.now(),
      category: 'DECISION',
      severity: 'LOW',
      title: `AUTONOMOUS MITIGATION EXECUTED: ${hazardType || 'GENERAL'}`,
      description: actionTaken,
      source: 'AUTONOMOUS_EXECUTIVE',
    };
    this.logs.unshift(mitLog);
    this.step(1.0);

    return {
      action: actionTaken,
      telemetry: this.latestTelemetry,
      risk: this.latestRisk,
    };
  }

  public reset(newSeed?: number): void {
    this.stopTimer();
    this.status = 'PAUSED';
    if (newSeed !== undefined) {
      this.seed = newSeed;
    }
    this.simModel.reset(this.seed);
    this.riskEngine.reset();
    this.decisionEngine.reset();
    this.activeScenarioId = null;
    this.telemetryHistory = [];

    this.latestTelemetry = this.simModel.step(0);
    this.activeHazards = this.hazardEngine.evaluate(this.latestTelemetry);
    this.latestRisk = this.riskEngine.calculateRisk(this.latestTelemetry, this.activeHazards);
    this.recentDecision = null;

    const resetLog: LogEntry = {
      id: `RESET-${Date.now()}`,
      tick: 0,
      time: 'MET 00:00:00',
      timestamp: Date.now(),
      category: 'SYSTEM',
      severity: 'LOW',
      title: 'MISSION RESET',
      description: `AEGIS Mission reset to start position (Seed: ${this.seed}). Subsystems nominal.`,
      source: 'SYSTEM',
    };
    this.logs = [resetLog];
  }

  public replay(): void {
    this.reset(this.seed);
    this.start(this.speedMultiplier);
  }

  public cleanup(): void {
    this.stopTimer();
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
