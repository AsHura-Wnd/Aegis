import { DetectedHazard, HazardType } from '../types/hazard';
import { LogEntry } from '../types/log';
import { RiskAssessment } from '../types/risk';
import { OperationalMode, RoverTelemetry } from '../types/telemetry';

export interface AutonomousDecision {
  id: string;
  tick: number;
  time: string;
  triggerHazard?: string;
  operationalMode: OperationalMode;
  recommendedMode: OperationalMode;
  actionTaken: string;
  rationale: string;
  confidencePercent: number;
}

export class AutonomousDecisionEngine {
  private lastActiveHazardIds: Set<string> = new Set();
  private lastRiskLevel: string = 'LOW';
  private lastMode: OperationalMode = 'AUTONOMOUS_TRANSIT';
  private recentDecision: AutonomousDecision | null = null;

  public evaluateDecisions(
    telemetry: RoverTelemetry,
    activeHazards: DetectedHazard[],
    risk: RiskAssessment
  ): { newLogs: LogEntry[]; decision: AutonomousDecision | null; modeOverride?: OperationalMode } {
    const newLogs: LogEntry[] = [];
    let decision: AutonomousDecision | null = null;
    let modeOverride: OperationalMode | undefined = undefined;

    const currentHazardIds = new Set(activeHazards.map((h) => h.hazardType));

    // Check for newly triggered hazards
    for (const h of activeHazards) {
      if (!this.lastActiveHazardIds.has(h.hazardType)) {
        newLogs.push({
          id: `LOG-HAZ-${h.hazardType}-${telemetry.tick}`,
          tick: telemetry.tick,
          time: telemetry.formattedTime,
          timestamp: Date.now(),
          category: 'HAZARD',
          severity: h.severity,
          title: `HAZARD DETECTED: ${h.hazardName}`,
          description: h.reason,
          recommendedAction: h.recommendedAction,
          telemetrySnapshot: h.relevantTelemetry.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {} as Record<string, string | number>),
          source: 'HAZARD_ENGINE',
        });
      }
    }

    // Check for cleared hazards
    for (const prevType of this.lastActiveHazardIds) {
      if (!currentHazardIds.has(prevType as HazardType)) {
        newLogs.push({
          id: `LOG-CLEAR-${prevType}-${telemetry.tick}`,
          tick: telemetry.tick,
          time: telemetry.formattedTime,
          timestamp: Date.now(),
          category: 'SYSTEM',
          severity: 'LOW',
          title: `HAZARD CLEARED: ${prevType.replace('_', ' ')}`,
          description: `Subsystem telemetry recovered back to nominal operating threshold.`,
          source: 'HAZARD_ENGINE',
        });
      }
    }

    // Check for Risk Level Escalation
    if (risk.riskLevel !== this.lastRiskLevel) {
      newLogs.push({
        id: `LOG-RISK-${telemetry.tick}`,
        tick: telemetry.tick,
        time: telemetry.formattedTime,
        timestamp: Date.now(),
        category: 'DECISION',
        severity: risk.riskLevel === 'CRITICAL' ? 'CRITICAL' : risk.riskLevel === 'HIGH' ? 'HIGH' : 'LOW',
        title: `RISK LEVEL TRANSITION: ${this.lastRiskLevel} -> ${risk.riskLevel} (${risk.currentScore}/100)`,
        description: risk.reasonForChange,
        source: 'RISK_ENGINE',
      });
      this.lastRiskLevel = risk.riskLevel;
    }

    // Evaluate Mode Shifts & Autonomous Action recommendations
    if (activeHazards.some((h) => h.hazardType === 'ROVER_STUCK')) {
      if (telemetry.operationalMode !== 'EMERGENCY_RECOVERY') {
        modeOverride = 'EMERGENCY_RECOVERY';
        decision = {
          id: `DEC-STUCK-${telemetry.tick}`,
          tick: telemetry.tick,
          time: telemetry.formattedTime,
          triggerHazard: 'ROVER_STUCK',
          operationalMode: telemetry.operationalMode,
          recommendedMode: 'EMERGENCY_RECOVERY',
          actionTaken: 'Engage Rocker-Bogie Peristaltic Crab-Walk extraction protocol',
          rationale: 'Zero displacement with high motor current indicates sand sinkage. Peristaltic chassis articulation redistributes weight away from bogged drive wheels.',
          confidencePercent: 96,
        };
      }
    } else if (activeHazards.some((h) => h.hazardType === 'LOW_BATTERY' && h.severity === 'CRITICAL')) {
      if (telemetry.operationalMode !== 'RECHARGE_STANDBY') {
        modeOverride = 'RECHARGE_STANDBY';
        decision = {
          id: `DEC-BATT-${telemetry.tick}`,
          tick: telemetry.tick,
          time: telemetry.formattedTime,
          triggerHazard: 'LOW_BATTERY',
          operationalMode: telemetry.operationalMode,
          recommendedMode: 'RECHARGE_STANDBY',
          actionTaken: 'Abort science mission transit; steer toward Solis Ridge Solar Haven',
          rationale: `Battery state of charge at ${telemetry.batteryLevel}% is insufficient for continued traverse. Diverting to optimal solar recharge coordinates.`,
          confidencePercent: 98,
        };
      }
    } else if (activeHazards.some((h) => h.hazardType === 'WEAK_COMMUNICATION' && h.severity === 'CRITICAL')) {
      if (telemetry.operationalMode !== 'SAFE_HOLD') {
        modeOverride = 'SAFE_HOLD';
        decision = {
          id: `DEC-COMM-${telemetry.tick}`,
          tick: telemetry.tick,
          time: telemetry.formattedTime,
          triggerHazard: 'WEAK_COMMUNICATION',
          operationalMode: telemetry.operationalMode,
          recommendedMode: 'SAFE_HOLD',
          actionTaken: 'Switch to Full Autonomous Safeguard Mode (ASM); cease teleoperation dependency',
          rationale: `Downlink carrier lost (${telemetry.signalStrengthDbm} dBm). Ground commands cannot reach rover. Preserving local autonomy safeguards.`,
          confidencePercent: 99,
        };
      }
    } else if (activeHazards.some((h) => h.hazardType === 'DANGEROUS_TERRAIN' || h.hazardType === 'WHEEL_SLIP')) {
      if (telemetry.operationalMode !== 'HAZARD_AVOIDANCE') {
        modeOverride = 'HAZARD_AVOIDANCE';
        decision = {
          id: `DEC-TERR-${telemetry.tick}`,
          tick: telemetry.tick,
          time: telemetry.formattedTime,
          triggerHazard: 'DANGEROUS_TERRAIN',
          operationalMode: telemetry.operationalMode,
          recommendedMode: 'HAZARD_AVOIDANCE',
          actionTaken: 'Throttle drive speed by 50%; execute contour-following detour spline',
          rationale: `Incline of ${telemetry.slopeAngle}° exceeds nominal transit stability. Recomputing local collision-free trajectory.`,
          confidencePercent: 92,
        };
      }
    } else if (activeHazards.length === 0 && telemetry.operationalMode !== 'AUTONOMOUS_TRANSIT') {
      modeOverride = 'AUTONOMOUS_TRANSIT';
      decision = {
        id: `DEC-NOMINAL-${telemetry.tick}`,
        tick: telemetry.tick,
        time: telemetry.formattedTime,
        operationalMode: telemetry.operationalMode,
        recommendedMode: 'AUTONOMOUS_TRANSIT',
        actionTaken: 'Resume standard autonomous waypoint navigation to science destination',
        rationale: 'All 9 hazard vectors verified clear. Environmental and subsystem telemetry within safe limits.',
        confidencePercent: 97,
      };
    }

    if (decision) {
      this.recentDecision = decision;
      newLogs.push({
        id: `LOG-DEC-${decision.id}`,
        tick: telemetry.tick,
        time: telemetry.formattedTime,
        timestamp: Date.now(),
        category: 'DECISION',
        severity: decision.recommendedMode === 'EMERGENCY_RECOVERY' || decision.recommendedMode === 'SAFE_HOLD' ? 'HIGH' : 'LOW',
        title: `AUTONOMOUS DECISION: ${decision.actionTaken}`,
        description: decision.rationale,
        recommendedAction: decision.actionTaken,
        source: 'AUTONOMOUS_EXECUTIVE',
      });
    }

    this.lastActiveHazardIds = currentHazardIds;
    return { newLogs, decision, modeOverride };
  }

  public getRecentDecision(): AutonomousDecision | null {
    return this.recentDecision;
  }

  public reset(): void {
    this.lastActiveHazardIds.clear();
    this.lastRiskLevel = 'LOW';
    this.lastMode = 'AUTONOMOUS_TRANSIT';
    this.recentDecision = null;
  }
}
