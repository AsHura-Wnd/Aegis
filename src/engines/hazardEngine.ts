import {
  DetectedHazard,
  HazardRuleConfig,
  HazardSeverity,
  HazardType,
} from '../types/hazard';
import { RoverTelemetry } from '../types/telemetry';

export const DEFAULT_HAZARD_CONFIGS: Record<HazardType, HazardRuleConfig> = {
  LOW_BATTERY: {
    hazardType: 'LOW_BATTERY',
    hazardName: 'Low Battery Reserve',
    description: 'Battery State-of-Charge fallen below mission safety contingency margins.',
    category: 'POWER',
    lowThreshold: 35,
    moderateThreshold: 25,
    criticalThreshold: 15,
    enabled: true,
    defaultAction: 'Engage Low-Power Safeguard; suspend science operations; reroute to nearest solar recharge zone.',
  },
  OVERHEATING: {
    hazardType: 'OVERHEATING',
    hazardName: 'Subsystem Thermal Overheating',
    description: 'Drive motor or internal electronics core temperature exceeding maximum operational tolerances.',
    category: 'THERMAL',
    moderateThreshold: 50,
    criticalThreshold: 68,
    enabled: true,
    defaultAction: 'Halt drive motors; deploy auxiliary thermal louvers; suspend non-critical computing cores.',
  },
  EXTREME_COLD: {
    hazardType: 'EXTREME_COLD',
    hazardName: 'Extreme Cryogenic Cold',
    description: 'Ambient/internal chassis temperature dropping below survival thresholds.',
    category: 'THERMAL',
    moderateThreshold: -35,
    criticalThreshold: -50,
    enabled: true,
    defaultAction: 'Activate secondary survival electric heating loops; orient solar array towards diurnal sun vector; enter thermal hibernation.',
  },
  WHEEL_SLIP: {
    hazardType: 'WHEEL_SLIP',
    hazardName: 'Excessive Wheel Slip',
    description: 'Traction loss detected via odometry-visual mismatch indicating soft regolith or slope slippage.',
    category: 'MOBILITY',
    moderateThreshold: 0.35,
    criticalThreshold: 0.60,
    enabled: true,
    defaultAction: 'Reduce torque by 40%; activate independent differential slip regulation; reverse traverse 1.5m.',
  },
  ROVER_STUCK: {
    hazardType: 'ROVER_STUCK',
    hazardName: 'Locomotion Entrapment (Rover Stuck)',
    description: 'Zero forward displacement despite active motor command and elevated stall currents.',
    category: 'MOBILITY',
    criticalThreshold: 3, // ticks with stall & no progress
    enabled: true,
    defaultAction: 'Initiate autonomous rocker-bogie peristaltic crab-walk extraction protocol; lock steering actuators.',
  },
  SOLAR_PANEL_DEGRADATION: {
    hazardType: 'SOLAR_PANEL_DEGRADATION',
    hazardName: 'Solar Panel Dust Deposition',
    description: 'Photovoltaic conversion efficiency severely degraded due to Martian dust deposition.',
    category: 'POWER',
    moderateThreshold: 60,
    criticalThreshold: 35,
    enabled: true,
    defaultAction: 'Gimbal panels toward optimum solar incidence; recalculate diurnal power budget; stand by for wind clearing event.',
  },
  WEAK_COMMUNICATION: {
    hazardType: 'WEAK_COMMUNICATION',
    hazardName: 'Weak Communication Link / Comm Loss',
    description: 'Orbiter relay downlink RF attenuation or elevated packet loss threatening teleoperation safety.',
    category: 'COMMUNICATION',
    moderateThreshold: -92,
    criticalThreshold: -108,
    enabled: true,
    defaultAction: 'Switch operational mode to FULL AUTONOMOUS SAFEGUARD (ASM); log telemetry to non-volatile memory; steer towards elevated crest.',
  },
  DANGEROUS_TERRAIN: {
    hazardType: 'DANGEROUS_TERRAIN',
    hazardName: 'Hazardous Terrain (Slope / Roughness)',
    description: 'Traverse incline angle or rock roughness index exceeds chassis mechanical stability limit.',
    category: 'ENVIRONMENT',
    moderateThreshold: 18,
    criticalThreshold: 24,
    enabled: true,
    defaultAction: 'Apply mechanical parking brakes; generate local 3D DEM mesh; compute collision-free detour spline.',
  },
  RAPID_POWER_DRAIN: {
    hazardType: 'RAPID_POWER_DRAIN',
    hazardName: 'Anomalous Rapid Power Drain',
    description: 'Total subsystem electrical power draw rate exceeds normal operating baseline significantly.',
    category: 'POWER',
    moderateThreshold: 380,
    criticalThreshold: 450,
    enabled: true,
    defaultAction: 'Isolate auxiliary scientific bus; sequentially diagnose motor drive inverters; enter low-quiescent diagnostic state.',
  },
};

export class HazardDetectionEngine {
  private configs: Record<HazardType, HazardRuleConfig>;

  constructor(customConfigs?: Partial<Record<HazardType, HazardRuleConfig>>) {
    this.configs = {
      ...DEFAULT_HAZARD_CONFIGS,
      ...(customConfigs || {}),
    };
  }

  public updateConfig(hazardType: HazardType, partial: Partial<HazardRuleConfig>): void {
    if (this.configs[hazardType]) {
      this.configs[hazardType] = { ...this.configs[hazardType], ...partial };
    }
  }

  public getConfigs(): Record<HazardType, HazardRuleConfig> {
    return { ...this.configs };
  }

  /**
   * Evaluates rover telemetry against all 9 hazard rules.
   * Returns list of currently active hazards.
   */
  public evaluate(telemetry: RoverTelemetry): DetectedHazard[] {
    const activeHazards: DetectedHazard[] = [];

    // 1. LOW_BATTERY
    const battCfg = this.configs.LOW_BATTERY;
    if (battCfg.enabled) {
      if (telemetry.batteryLevel <= (battCfg.criticalThreshold ?? 15)) {
        activeHazards.push({
          id: `HAZ-BATT-${telemetry.tick}`,
          hazardType: 'LOW_BATTERY',
          hazardName: battCfg.hazardName,
          severity: 'CRITICAL',
          reason: `Battery reserve at critical ${telemetry.batteryLevel}% (threshold: <= ${battCfg.criticalThreshold}%). Depletion imminent under current draw.`,
          relevantTelemetry: [
            { key: 'batteryLevel', label: 'Battery Reserve', value: `${telemetry.batteryLevel}%`, threshold: `<= ${battCfg.criticalThreshold}%` },
            { key: 'batteryVoltage', label: 'Bus Voltage', value: `${telemetry.batteryVoltage} V`, threshold: '< 29.0 V' },
            { key: 'netPowerWatts', label: 'Net Power', value: `${telemetry.netPowerWatts} W`, threshold: '< 0 W' },
          ],
          recommendedAction: battCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (telemetry.batteryLevel <= (battCfg.moderateThreshold ?? 25)) {
        activeHazards.push({
          id: `HAZ-BATT-${telemetry.tick}`,
          hazardType: 'LOW_BATTERY',
          hazardName: battCfg.hazardName,
          severity: 'HIGH',
          reason: `Battery reserve dropped to ${telemetry.batteryLevel}%, entering caution zone below safe navigation reserve.`,
          relevantTelemetry: [
            { key: 'batteryLevel', label: 'Battery Reserve', value: `${telemetry.batteryLevel}%`, threshold: `<= ${battCfg.moderateThreshold}%` },
            { key: 'netPowerWatts', label: 'Net Power', value: `${telemetry.netPowerWatts} W`, threshold: '< 0 W' },
          ],
          recommendedAction: battCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 2. OVERHEATING
    const heatCfg = this.configs.OVERHEATING;
    if (heatCfg.enabled) {
      const maxMotorTemp = Math.max(...telemetry.wheels.map((w) => w.motorTemp), telemetry.motorAverageTemp);
      const isCritical = maxMotorTemp >= (heatCfg.criticalThreshold ?? 68) || telemetry.internalTemp >= 55;
      const isModerate = maxMotorTemp >= (heatCfg.moderateThreshold ?? 50) || telemetry.internalTemp >= 45;

      if (isCritical) {
        activeHazards.push({
          id: `HAZ-HEAT-${telemetry.tick}`,
          hazardType: 'OVERHEATING',
          hazardName: heatCfg.hazardName,
          severity: 'CRITICAL',
          reason: `Motor drive assembly temperature reached ${maxMotorTemp}°C (crit limit: ${heatCfg.criticalThreshold}°C). Imminent coil varnish breakdown.`,
          relevantTelemetry: [
            { key: 'motorAverageTemp', label: 'Peak Motor Temp', value: `${maxMotorTemp}°C`, threshold: `>= ${heatCfg.criticalThreshold}°C` },
            { key: 'internalTemp', label: 'Internal Core Temp', value: `${telemetry.internalTemp}°C`, threshold: '>= 55°C' },
          ],
          recommendedAction: heatCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (isModerate) {
        activeHazards.push({
          id: `HAZ-HEAT-${telemetry.tick}`,
          hazardType: 'OVERHEATING',
          hazardName: heatCfg.hazardName,
          severity: 'MODERATE',
          reason: `Elevated thermal telemetry: motor temperature at ${maxMotorTemp}°C. Thermal dissipation restricted.`,
          relevantTelemetry: [
            { key: 'motorAverageTemp', label: 'Motor Temp', value: `${maxMotorTemp}°C`, threshold: `>= ${heatCfg.moderateThreshold}°C` },
          ],
          recommendedAction: 'Limit continuous drive bursts; monitor radiator deployment status.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 3. EXTREME_COLD
    const coldCfg = this.configs.EXTREME_COLD;
    if (coldCfg.enabled) {
      if (telemetry.internalTemp <= (coldCfg.criticalThreshold ?? -50)) {
        activeHazards.push({
          id: `HAZ-COLD-${telemetry.tick}`,
          hazardType: 'EXTREME_COLD',
          hazardName: coldCfg.hazardName,
          severity: 'CRITICAL',
          reason: `Internal electronics bay chilled to ${telemetry.internalTemp}°C (crit: ${coldCfg.criticalThreshold}°C). Risk of battery freeze and crystal cracking.`,
          relevantTelemetry: [
            { key: 'internalTemp', label: 'Internal Temp', value: `${telemetry.internalTemp}°C`, threshold: `<= ${coldCfg.criticalThreshold}°C` },
            { key: 'ambientTemp', label: 'Martian Ambient', value: `${telemetry.ambientTemp}°C`, threshold: '< -80°C' },
          ],
          recommendedAction: coldCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (telemetry.internalTemp <= (coldCfg.moderateThreshold ?? -35)) {
        activeHazards.push({
          id: `HAZ-COLD-${telemetry.tick}`,
          hazardType: 'EXTREME_COLD',
          hazardName: coldCfg.hazardName,
          severity: 'MODERATE',
          reason: `Internal core bay temperature fell to ${telemetry.internalTemp}°C. Approaching minimum battery operational range.`,
          relevantTelemetry: [
            { key: 'internalTemp', label: 'Internal Temp', value: `${telemetry.internalTemp}°C`, threshold: `<= ${coldCfg.moderateThreshold}°C` },
            { key: 'heatersActive', label: 'Survival Heaters', value: telemetry.heatersActive ? 'ACTIVE' : 'OFF', threshold: 'Expected ON' },
          ],
          recommendedAction: 'Engage electric heating coils; curtail payload power to conserve heat.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 4. WHEEL_SLIP
    const slipCfg = this.configs.WHEEL_SLIP;
    if (slipCfg.enabled && !telemetry.isStuck) {
      const avgSlip = telemetry.wheelSlipAverage;
      if (avgSlip >= (slipCfg.criticalThreshold ?? 0.60)) {
        activeHazards.push({
          id: `HAZ-SLIP-${telemetry.tick}`,
          hazardType: 'WHEEL_SLIP',
          hazardName: slipCfg.hazardName,
          severity: 'HIGH',
          reason: `Severe wheel slip ratio at ${(avgSlip * 100).toFixed(0)}% (threshold: >= ${(slipCfg.criticalThreshold! * 100)}%). Excessive traction loss on unconsolidated slope.`,
          relevantTelemetry: [
            { key: 'wheelSlipAverage', label: 'Slip Ratio', value: `${(avgSlip * 100).toFixed(0)}%`, threshold: `>= ${(slipCfg.criticalThreshold! * 100)}%` },
            { key: 'slopeAngle', label: 'Terrain Slope', value: `${telemetry.slopeAngle}°`, threshold: '> 15°' },
          ],
          recommendedAction: slipCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (avgSlip >= (slipCfg.moderateThreshold ?? 0.35)) {
        activeHazards.push({
          id: `HAZ-SLIP-${telemetry.tick}`,
          hazardType: 'WHEEL_SLIP',
          hazardName: slipCfg.hazardName,
          severity: 'MODERATE',
          reason: `Moderate wheel slippage detected at ${(avgSlip * 100).toFixed(0)}%. Visual odometry detects drift on sand dune surface.`,
          relevantTelemetry: [
            { key: 'wheelSlipAverage', label: 'Slip Ratio', value: `${(avgSlip * 100).toFixed(0)}%`, threshold: `>= ${(slipCfg.moderateThreshold! * 100)}%` },
          ],
          recommendedAction: 'Modulate wheel torque; steer towards high-traction bedrock outcrop.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 5. ROVER_STUCK
    const stuckCfg = this.configs.ROVER_STUCK;
    if (stuckCfg.enabled) {
      if (telemetry.isStuck || (telemetry.commandedSpeed > 0 && telemetry.speed < 0.01 && telemetry.stuckCounter >= 3)) {
        activeHazards.push({
          id: `HAZ-STUCK-${telemetry.tick}`,
          hazardType: 'ROVER_STUCK',
          hazardName: stuckCfg.hazardName,
          severity: 'CRITICAL',
          reason: `Chassis entrapment confirmed. Rover commanded to traverse at ${telemetry.commandedSpeed} m/s but actual displacement is 0.00 m/s with ${(telemetry.wheelSlipAverage * 100).toFixed(0)}% wheel slip.`,
          relevantTelemetry: [
            { key: 'speed', label: 'Actual Speed', value: `${telemetry.speed} m/s`, threshold: '< 0.01 m/s' },
            { key: 'commandedSpeed', label: 'Command Speed', value: `${telemetry.commandedSpeed} m/s`, threshold: '> 0 m/s' },
            { key: 'wheelSlipAverage', label: 'Slip Ratio', value: `${(telemetry.wheelSlipAverage * 100).toFixed(0)}%`, threshold: '> 75%' },
            { key: 'stuckCounter', label: 'Stall Duration', value: `${telemetry.stuckCounter} ticks`, threshold: '>= 3' },
          ],
          recommendedAction: stuckCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 6. SOLAR_PANEL_DEGRADATION
    const solarCfg = this.configs.SOLAR_PANEL_DEGRADATION;
    if (solarCfg.enabled) {
      if (telemetry.solarEfficiency <= (solarCfg.criticalThreshold ?? 35)) {
        activeHazards.push({
          id: `HAZ-SOLAR-${telemetry.tick}`,
          hazardType: 'SOLAR_PANEL_DEGRADATION',
          hazardName: solarCfg.hazardName,
          severity: 'HIGH',
          reason: `Solar photovoltaic conversion down to ${telemetry.solarEfficiency}% due to heavy Martian regolith dust fouling (${telemetry.dustAccumulation}% dust layer).`,
          relevantTelemetry: [
            { key: 'solarEfficiency', label: 'Solar Efficiency', value: `${telemetry.solarEfficiency}%`, threshold: `<= ${solarCfg.criticalThreshold}%` },
            { key: 'solarGenerationWatts', label: 'Solar Output', value: `${telemetry.solarGenerationWatts} W`, threshold: '< 90 W' },
            { key: 'dustAccumulation', label: 'Dust Layer', value: `${telemetry.dustAccumulation}%`, threshold: '> 60%' },
          ],
          recommendedAction: solarCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (telemetry.solarEfficiency <= (solarCfg.moderateThreshold ?? 60)) {
        activeHazards.push({
          id: `HAZ-SOLAR-${telemetry.tick}`,
          hazardType: 'SOLAR_PANEL_DEGRADATION',
          hazardName: solarCfg.hazardName,
          severity: 'MODERATE',
          reason: `Degraded solar efficiency (${telemetry.solarEfficiency}%). Atmospheric dust deposition reducing daily energy replenishment.`,
          relevantTelemetry: [
            { key: 'solarEfficiency', label: 'Solar Efficiency', value: `${telemetry.solarEfficiency}%`, threshold: `<= ${solarCfg.moderateThreshold}%` },
          ],
          recommendedAction: 'Optimize solar pointing angle; trim non-essential heating budget.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 7. WEAK_COMMUNICATION
    const commCfg = this.configs.WEAK_COMMUNICATION;
    if (commCfg.enabled) {
      if (telemetry.signalStrengthDbm <= (commCfg.criticalThreshold ?? -108) || !telemetry.relayConnected || telemetry.packetLossPercent > 80) {
        activeHazards.push({
          id: `HAZ-COMM-${telemetry.tick}`,
          hazardType: 'WEAK_COMMUNICATION',
          hazardName: commCfg.hazardName,
          severity: 'CRITICAL',
          reason: `UHF Orbiter relay link disconnected or severely attenuated (${telemetry.signalStrengthDbm} dBm, packet loss: ${telemetry.packetLossPercent}%). Teleoperation control compromised.`,
          relevantTelemetry: [
            { key: 'signalStrengthDbm', label: 'Signal Strength', value: `${telemetry.signalStrengthDbm} dBm`, threshold: `<= ${commCfg.criticalThreshold} dBm` },
            { key: 'packetLossPercent', label: 'Packet Drop', value: `${telemetry.packetLossPercent}%`, threshold: '> 80%' },
            { key: 'relayConnected', label: 'Relay Carrier', value: telemetry.relayConnected ? 'LOCKED' : 'UNLOCKED', threshold: 'LOCKED' },
          ],
          recommendedAction: commCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (telemetry.signalStrengthDbm <= (commCfg.moderateThreshold ?? -92)) {
        activeHazards.push({
          id: `HAZ-COMM-${telemetry.tick}`,
          hazardType: 'WEAK_COMMUNICATION',
          hazardName: commCfg.hazardName,
          severity: 'MODERATE',
          reason: `Downlink margin degraded to ${telemetry.signalStrengthDbm} dBm with ${telemetry.packetLossPercent}% packet loss due to canyon topography.`,
          relevantTelemetry: [
            { key: 'signalStrengthDbm', label: 'Signal Strength', value: `${telemetry.signalStrengthDbm} dBm`, threshold: `<= ${commCfg.moderateThreshold} dBm` },
          ],
          recommendedAction: 'Buffer high-rate science telemetry; maintain low-baud heartbeat beacon.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 8. DANGEROUS_TERRAIN
    const terrCfg = this.configs.DANGEROUS_TERRAIN;
    if (terrCfg.enabled) {
      if (telemetry.slopeAngle >= (terrCfg.criticalThreshold ?? 24) || telemetry.roughnessIndex > 0.85) {
        activeHazards.push({
          id: `HAZ-TERR-${telemetry.tick}`,
          hazardType: 'DANGEROUS_TERRAIN',
          hazardName: terrCfg.hazardName,
          severity: 'CRITICAL',
          reason: `Traverse slope at ${telemetry.slopeAngle}° (limit: ${terrCfg.criticalThreshold}°) with extreme roughness index ${telemetry.roughnessIndex}. High risk of chassis rollover or wheel snag.`,
          relevantTelemetry: [
            { key: 'slopeAngle', label: 'Slope Incline', value: `${telemetry.slopeAngle}°`, threshold: `>= ${terrCfg.criticalThreshold}°` },
            { key: 'roughnessIndex', label: 'Terrain Roughness', value: `${telemetry.roughnessIndex}`, threshold: '> 0.85' },
            { key: 'pitch', label: 'Chassis Pitch', value: `${telemetry.pitch}°`, threshold: '> 12°' },
          ],
          recommendedAction: terrCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (telemetry.slopeAngle >= (terrCfg.moderateThreshold ?? 18) || telemetry.roughnessIndex > 0.65) {
        activeHazards.push({
          id: `HAZ-TERR-${telemetry.tick}`,
          hazardType: 'DANGEROUS_TERRAIN',
          hazardName: terrCfg.hazardName,
          severity: 'MODERATE',
          reason: `Steep terrain encounter (${telemetry.slopeAngle}° incline, roughness: ${telemetry.roughnessIndex}). Approaching vehicle tilt margins.`,
          relevantTelemetry: [
            { key: 'slopeAngle', label: 'Slope Incline', value: `${telemetry.slopeAngle}°`, threshold: `>= ${terrCfg.moderateThreshold}°` },
          ],
          recommendedAction: 'Engage low-gear crawler drive; steer along contour lines instead of direct fall-line.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    // 9. RAPID_POWER_DRAIN
    const drainCfg = this.configs.RAPID_POWER_DRAIN;
    if (drainCfg.enabled) {
      if (telemetry.powerConsumptionWatts >= (drainCfg.criticalThreshold ?? 450)) {
        activeHazards.push({
          id: `HAZ-DRAIN-${telemetry.tick}`,
          hazardType: 'RAPID_POWER_DRAIN',
          hazardName: drainCfg.hazardName,
          severity: 'CRITICAL',
          reason: `Massive power draw spike detected at ${telemetry.powerConsumptionWatts}W (threshold: >= ${drainCfg.criticalThreshold}W). Subsystem electrical short or stalled drive assembly.`,
          relevantTelemetry: [
            { key: 'powerConsumptionWatts', label: 'Power Consumption', value: `${telemetry.powerConsumptionWatts} W`, threshold: `>= ${drainCfg.criticalThreshold} W` },
            { key: 'batteryDischargeRate', label: 'Discharge Rate', value: `${telemetry.batteryDischargeRate} W`, threshold: '> 350 W' },
          ],
          recommendedAction: drainCfg.defaultAction,
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      } else if (telemetry.powerConsumptionWatts >= (drainCfg.moderateThreshold ?? 380)) {
        activeHazards.push({
          id: `HAZ-DRAIN-${telemetry.tick}`,
          hazardType: 'RAPID_POWER_DRAIN',
          hazardName: drainCfg.hazardName,
          severity: 'HIGH',
          reason: `Elevated power draw measured at ${telemetry.powerConsumptionWatts}W exceeding normal operating ceiling.`,
          relevantTelemetry: [
            { key: 'powerConsumptionWatts', label: 'Power Draw', value: `${telemetry.powerConsumptionWatts} W`, threshold: `>= ${drainCfg.moderateThreshold} W` },
          ],
          recommendedAction: 'Cycle auxiliary subsystem relays; throttle motor currents.',
          detectedAtTick: telemetry.tick,
          detectedAtTime: telemetry.formattedTime,
          isActive: true,
          isMitigated: false,
        });
      }
    }

    return activeHazards;
  }
}
