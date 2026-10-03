import { DetectedHazard, HazardSeverity } from '../types/hazard';
import { RiskAssessment, RiskDriver, RiskLevel } from '../types/risk';
import { RoverTelemetry } from '../types/telemetry';

export class DynamicRiskEngine {
  private lastScore: number = 8; // nominal base risk
  private lastHazardsKey: string = '';

  public calculateRisk(
    telemetry: RoverTelemetry,
    activeHazards: DetectedHazard[]
  ): RiskAssessment {
    // 1. Base environmental and mission progress risk
    // Factors: terrain slope, roughness, battery level
    let baseScore = 5;
    if (telemetry.slopeAngle > 10) {
      baseScore += (telemetry.slopeAngle - 10) * 0.8;
    }
    if (telemetry.roughnessIndex > 0.5) {
      baseScore += (telemetry.roughnessIndex - 0.5) * 15;
    }
    if (telemetry.batteryLevel < 50) {
      baseScore += (50 - telemetry.batteryLevel) * 0.25;
    }

    // 2. Additive Hazard Points by Severity
    const severityPoints: Record<HazardSeverity, number> = {
      LOW: 12,
      MODERATE: 24,
      HIGH: 46,
      CRITICAL: 78,
    };

    let hazardScoreSum = 0;
    const drivers: RiskDriver[] = [];

    for (const h of activeHazards) {
      const pts = severityPoints[h.severity];
      hazardScoreSum += pts;
      drivers.push({
        hazardType: h.hazardType,
        hazardName: h.hazardName,
        severity: h.severity,
        contributionPoints: pts,
        description: h.reason,
      });
    }

    // 3. Compounding Interactions
    const compoundingFactors: string[] = [];
    let compoundingMultiplier = 1.0;

    const hazardTypes = new Set(activeHazards.map((h) => h.hazardType));

    // Interaction 1: Low Battery + Weak Communication (Loss of autonomy coordination & telemetry blackout)
    if (hazardTypes.has('LOW_BATTERY') && hazardTypes.has('WEAK_COMMUNICATION')) {
      compoundingMultiplier += 0.35;
      compoundingFactors.push('Compound Risk: Low Battery + Comm Blackout prevents Earth ground advisory.');
    }

    // Interaction 2: Extreme Cold + Low Battery (Severe degradation of battery discharge capacity in freeze)
    if (hazardTypes.has('EXTREME_COLD') && hazardTypes.has('LOW_BATTERY')) {
      compoundingMultiplier += 0.40;
      compoundingFactors.push('Compound Risk: Cryogenic cold accelerates battery cell collapse.');
    }

    // Interaction 3: Wheel Slip + Dangerous Terrain (Imminent slope rollover / slip into ravine)
    if (hazardTypes.has('WHEEL_SLIP') && hazardTypes.has('DANGEROUS_TERRAIN')) {
      compoundingMultiplier += 0.30;
      compoundingFactors.push('Compound Risk: Traction loss on steep slope significantly elevates rollover probability.');
    }

    // Interaction 4: Rover Stuck + Overheating or Rapid Power Drain (High motor stall currents boiling actuator coils)
    if (hazardTypes.has('ROVER_STUCK') && (hazardTypes.has('OVERHEATING') || hazardTypes.has('RAPID_POWER_DRAIN'))) {
      compoundingMultiplier += 0.35;
      compoundingFactors.push('Compound Risk: Drive actuator stall current causing rapid motor thermal runaway.');
    }

    // Interaction 5: Solar Degradation + Low Battery (Net negative energy deficit without replenishment capability)
    if (hazardTypes.has('SOLAR_PANEL_DEGRADATION') && hazardTypes.has('LOW_BATTERY')) {
      compoundingMultiplier += 0.25;
      compoundingFactors.push('Compound Risk: Dust deposition prevents solar recharging while battery reserve is depleted.');
    }

    // 4. Total Score Calculation
    let rawScore = baseScore + (hazardScoreSum > 0 ? hazardScoreSum * compoundingMultiplier : 0);
    // If critical hazard present, score must be at least 76
    if (activeHazards.some((h) => h.severity === 'CRITICAL')) {
      rawScore = Math.max(78, rawScore);
    } else if (activeHazards.some((h) => h.severity === 'HIGH')) {
      rawScore = Math.max(52, rawScore);
    } else if (activeHazards.some((h) => h.severity === 'MODERATE')) {
      rawScore = Math.max(28, rawScore);
    }

    const currentScore = Math.min(100, Math.max(0, Math.round(rawScore)));
    const delta = currentScore - this.lastScore;

    // 5. Determine Risk Level
    let riskLevel: RiskLevel = 'LOW';
    if (currentScore >= 76) riskLevel = 'CRITICAL';
    else if (currentScore >= 51) riskLevel = 'HIGH';
    else if (currentScore >= 26) riskLevel = 'MODERATE';
    else riskLevel = 'LOW';

    // 6. Primary Concern & Reason for Change
    let primaryConcern = 'All subsystems operating within nominal safety envelopes.';
    if (drivers.length > 0) {
      // Sort drivers by contribution descending
      drivers.sort((a, b) => b.contributionPoints - a.contributionPoints);
      const topDriver = drivers[0];
      primaryConcern = `${topDriver.hazardName} (${topDriver.severity} severity)`;
    }

    let reasonForChange = '';
    const currentHazardsKey = activeHazards.map((h) => `${h.hazardType}:${h.severity}`).sort().join('|');

    if (delta > 0) {
      if (activeHazards.length > 0) {
        reasonForChange = `Risk increased by +${delta} pts due to ${activeHazards.length} active hazard vector(s), driven predominantly by ${drivers[0]?.hazardName || 'telemetry shifts'}.`;
      } else {
        reasonForChange = `Risk shifted upward by +${delta} pts due to unfavorable terrain slope (${telemetry.slopeAngle}°) and roughness.`;
      }
    } else if (delta < 0) {
      reasonForChange = `Risk reduced by ${Math.abs(delta)} pts following hazard mitigation and favorable telemetry stabilization.`;
    } else {
      if (currentScore <= 25) {
        reasonForChange = 'Risk steady at nominal baseline; telemetry parameters stable.';
      } else {
        reasonForChange = `Risk steady at elevated level (${currentScore}/100) pending resolution of active hazards.`;
      }
    }

    if (compoundingFactors.length > 0) {
      reasonForChange += ` [Compounding multiplier applied: ${(compoundingMultiplier).toFixed(2)}x]`;
    }

    this.lastScore = currentScore;
    this.lastHazardsKey = currentHazardsKey;

    return {
      currentScore,
      previousScore: this.lastScore - delta,
      delta,
      riskLevel,
      primaryConcern,
      reasonForChange,
      compoundingFactors,
      drivers,
      updatedAtTick: telemetry.tick,
      updatedAtTime: telemetry.formattedTime,
    };
  }

  public reset(): void {
    this.lastScore = 8;
    this.lastHazardsKey = '';
  }
}
