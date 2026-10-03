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
