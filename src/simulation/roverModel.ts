import {
  OperationalMode,
  RoverTelemetry,
  WheelTelemetry,
} from '../types/telemetry';
import {
  MAP_DIMENSIONS,
  MISSION_WAYPOINTS,
  sampleTerrainAt,
  START_POSITION,
  TARGET_DESTINATION,
} from './terrainMap';

// Deterministic Mulberry32 PRNG
export class SeededRandom {
  private s: number;

  constructor(seed: number = 42) {
    this.s = seed;
  }

  next(): number {
    this.s |= 0;
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export interface InjectedFaults {
  lowBattery: boolean;
  roverStuck: boolean;
  commLoss: boolean;
  extremeTemp: 'HOT' | 'COLD' | null;
  solarDust: boolean;
  hazardousTerrain: boolean;
  rapidPowerDrain: boolean;
}

export const INITIAL_FAULTS: InjectedFaults = {
  lowBattery: false,
  roverStuck: false,
  commLoss: false,
  extremeTemp: null,
  solarDust: false,
  hazardousTerrain: false,
  rapidPowerDrain: false,
};

export class RoverSimulationModel {
  private seed: number;
  private rng: SeededRandom;
  
  // State
  private tick: number = 0;
  private missionTimeSeconds: number = 0;
  private posX: number = START_POSITION.x;
  private posY: number = START_POSITION.y;
  private heading: number = 38; // degrees
  private currentWaypointIndex: number = 1;
  private trail: { x: number; y: number; tick: number }[] = [];
  
  // Subsystem variables
  private batteryPct: number = 88.5;
  private dustPct: number = 12.0;
  private internalTempC: number = 21.4;
  private motorTempC: number = 28.2;
  private ambientTempC: number = -48.0;
  private distanceTraveledM: number = 0;
  private stuckCounter: number = 0;
  private operationalMode: OperationalMode = 'AUTONOMOUS_TRANSIT';
  private heatersActive: boolean = false;
  private radiatorDeployed: boolean = false;

  // Active faults
  private faults: InjectedFaults = { ...INITIAL_FAULTS };

  constructor(seed: number = 1337) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
    this.trail = [{ x: this.posX, y: this.posY, tick: 0 }];
  }

  public reset(newSeed?: number): void {
    if (newSeed !== undefined) {
      this.seed = newSeed;
    }
    this.rng = new SeededRandom(this.seed);
    this.tick = 0;
    this.missionTimeSeconds = 0;
    this.posX = START_POSITION.x;
    this.posY = START_POSITION.y;
    this.heading = 38;
    this.currentWaypointIndex = 1;
    this.trail = [{ x: this.posX, y: this.posY, tick: 0 }];
    this.batteryPct = 88.5;
    this.dustPct = 12.0;
    this.internalTempC = 21.4;
    this.motorTempC = 28.2;
    this.ambientTempC = -48.0;
    this.distanceTraveledM = 0;
    this.stuckCounter = 0;
    this.operationalMode = 'AUTONOMOUS_TRANSIT';
    this.heatersActive = false;
    this.radiatorDeployed = false;
    this.faults = { ...INITIAL_FAULTS };
  }

  public setFaults(faults: Partial<InjectedFaults>): void {
    this.faults = { ...this.faults, ...faults };
    if (faults.solarDust) {
      this.dustPct = Math.max(78.0, this.dustPct);
    }
    if (faults.lowBattery) {
      this.batteryPct = Math.min(13.5, this.batteryPct);
    }
    if (faults.extremeTemp === 'HOT') {
      this.motorTempC = Math.max(70.0, this.motorTempC);
    } else if (faults.extremeTemp === 'COLD') {
      this.internalTempC = Math.min(-42.0, this.internalTempC);
    }
  }

  public clearFaults(): void {
    this.faults = { ...INITIAL_FAULTS };
    if (this.batteryPct < 50) {
      this.batteryPct = 85.0;
    }
    this.motorTempC = 28.2;
    this.dustPct = 12.0;
    if (this.operationalMode === 'SAFE_HOLD' || this.operationalMode === 'EMERGENCY_RECOVERY') {
      this.operationalMode = 'AUTONOMOUS_TRANSIT';
    }
  }

  public setOperationalMode(mode: OperationalMode): void {
    this.operationalMode = mode;
  }

  public getTrail(): { x: number; y: number; tick: number }[] {
    return [...this.trail];
  }

  public step(dtSeconds: number = 1.0): RoverTelemetry {
    if (dtSeconds > 0) {
      this.tick += 1;
      this.missionTimeSeconds += dtSeconds;
    }

    // 1. Terrain Sampling at current position
    let terrain = sampleTerrainAt(this.posX, this.posY);

    // If hazardous terrain scenario is forced, override terrain metrics to severe
    if (this.faults.hazardousTerrain) {
      terrain = {
        type: 'CRATER_SLOPE',
        slope: 27.8,
        roughness: 0.92,
        slipMultiplier: 2.8,
        solarFactor: 0.8,
        commAttenuation: 14,
      };
    }

    // 2. Navigation & Waypoint Progress
    const targetWp = MISSION_WAYPOINTS[this.currentWaypointIndex] || TARGET_DESTINATION;
    const dx = targetWp.x - this.posX;
    const dy = targetWp.y - this.posY;
    const distToTargetPx = Math.hypot(dx, dy);
    const targetHeading = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

    // Smooth heading rotation
    const headingDiff = (targetHeading - this.heading + 540) % 360 - 180;
    this.heading = (this.heading + headingDiff * 0.15 + 360) % 360;

    // If arrived at waypoint, advance to next
    if (distToTargetPx < 18 && this.currentWaypointIndex < MISSION_WAYPOINTS.length - 1) {
      this.currentWaypointIndex += 1;
    }

    // 3. Mobility Simulation
    let commandedSpeed = 0.08; // nominal 0.08 m/s (~0.28 km/h typical Mars rover)
    let isStuck = false;

    if (this.operationalMode === 'SAFE_HOLD' || this.operationalMode === 'RECHARGE_STANDBY') {
      commandedSpeed = 0;
    }

    if (this.faults.roverStuck) {
      this.stuckCounter += 1;
      isStuck = true;
      commandedSpeed = 0.08; // motors trying to drive
    } else {
      this.stuckCounter = Math.max(0, this.stuckCounter - 1);
    }

    // Actual speed calculation
    let actualSpeed = commandedSpeed;
    if (isStuck) {
      actualSpeed = 0.002 * this.rng.next(); // essentially stationary
    } else if (terrain.slope > 20) {
      actualSpeed *= Math.max(0.2, 1.0 - (terrain.slope - 20) * 0.06);
    } else if (this.operationalMode === 'HAZARD_AVOIDANCE') {
      actualSpeed *= 0.5;
    }

    // Move rover if not stuck and speed > 0
    if (actualSpeed > 0.005) {
      const rad = (this.heading * Math.PI) / 180;
      // pixels moved per tick (scale: 1.5m per pixel)
      const pxStep = (actualSpeed * dtSeconds) / MAP_DIMENSIONS.scaleMetersPerPixel * 4.0;
      this.posX += Math.cos(rad) * pxStep;
      this.posY += Math.sin(rad) * pxStep;
      this.distanceTraveledM += actualSpeed * dtSeconds;

      // Keep inside bounds
      this.posX = Math.max(20, Math.min(MAP_DIMENSIONS.width - 20, this.posX));
      this.posY = Math.max(20, Math.min(MAP_DIMENSIONS.height - 20, this.posY));

      // Append to trail every 3 ticks
      if (this.tick % 3 === 0) {
        this.trail.push({ x: Math.round(this.posX), y: Math.round(this.posY), tick: this.tick });
        if (this.trail.length > 300) this.trail.shift();
      }
    }

    // 4. Wheels Telemetry Generation
    const baseSlip = isStuck
      ? 0.85 + this.rng.range(-0.04, 0.05)
      : Math.min(0.95, 0.08 * terrain.slipMultiplier + this.rng.range(-0.02, 0.03));

    const wheelLabels = [
      { id: 'FL', label: 'Front-Left' },
      { id: 'FR', label: 'Front-Right' },
      { id: 'ML', label: 'Mid-Left' },
      { id: 'MR', label: 'Mid-Right' },
      { id: 'RL', label: 'Rear-Left' },
      { id: 'RR', label: 'Rear-Right' },
    ];

    const wheels: WheelTelemetry[] = wheelLabels.map((wl, i) => {
      const individualSlip = Math.min(1.0, Math.max(0.01, baseSlip + this.rng.range(-0.03, 0.03)));
      const motorCurr = isStuck
        ? 9.5 + this.rng.range(0.2, 1.8) // High stall current
        : (actualSpeed > 0 ? 2.4 + terrain.slope * 0.12 : 0.3) + this.rng.range(-0.1, 0.1);
      const temp = this.motorTempC + (i % 2 === 0 ? 1.2 : -0.8) + (isStuck ? 15.0 : 0);
      return {
        id: wl.id,
        label: wl.label,
        rpm: isStuck ? 42 + this.rng.range(-2, 2) : Math.round(actualSpeed * 320),
        torque: isStuck ? 78 : Math.round(20 + terrain.slope * 1.5),
        slipRatio: individualSlip,
        motorCurrent: Number(motorCurr.toFixed(2)),
        motorTemp: Number(temp.toFixed(1)),
        tractionGood: individualSlip < 0.35,
      };
    });

    const wheelSlipAverage = wheels.reduce((acc, w) => acc + w.slipRatio, 0) / wheels.length;

    // 5. Thermal Subsystem
    if (this.faults.extremeTemp === 'HOT') {
      this.motorTempC = Math.min(78.5, this.motorTempC + 1.2);
      this.internalTempC = Math.min(62.0, this.internalTempC + 0.8);
      this.radiatorDeployed = true;
      this.heatersActive = false;
    } else if (this.faults.extremeTemp === 'COLD') {
      this.ambientTempC = -92.0;
      this.internalTempC = Math.max(-54.0, this.internalTempC - 1.4);
      this.motorTempC = Math.max(-42.0, this.motorTempC - 1.1);
      this.heatersActive = true;
    } else {
      // Nominal thermal drift with soft regulation
      if (this.internalTempC > 24) this.internalTempC -= 0.1;
      else if (this.internalTempC < 18) this.internalTempC += 0.1;
      this.internalTempC += this.rng.range(-0.05, 0.05);

      if (this.motorTempC > 32) this.motorTempC -= 0.2;
      else if (this.motorTempC < 25) this.motorTempC += 0.2;
      this.motorTempC += actualSpeed > 0 ? 0.08 : -0.05;

      this.heatersActive = this.internalTempC < 5;
      this.radiatorDeployed = this.internalTempC > 45;
    }

    // 6. Solar Subsystem
    if (this.faults.solarDust) {
      this.dustPct = Math.min(92, this.dustPct + 2.5);
    } else {
      this.dustPct = Math.max(10, this.dustPct - 0.05);
    }

    const baselineSolarEfficiency = Math.max(10, 95 - this.dustPct * 0.85);
    const solarEfficiency = Number((baselineSolarEfficiency * terrain.solarFactor).toFixed(1));
    // Sol diurnal flux (sinusoidal day curve)
    const solarFlux = 0.85 + 0.15 * Math.sin(this.missionTimeSeconds * 0.01);
    const solarGenerationWatts = Number(((solarEfficiency / 100) * 260 * solarFlux).toFixed(1));

    // 7. Power Consumption
    let baseConsumption = 120; // Electronics, avionics, radio listening
    if (this.heatersActive) baseConsumption += 90;
    if (this.radiatorDeployed) baseConsumption += 35;
    if (actualSpeed > 0) baseConsumption += 80 + terrain.slope * 4.5;
    if (isStuck) baseConsumption += 220; // High motor stall draw
    if (this.faults.rapidPowerDrain) baseConsumption += 280; // Short circuit / high drain

    const powerConsumptionWatts = Number(baseConsumption.toFixed(1));
    const netPowerWatts = Number((solarGenerationWatts - powerConsumptionWatts).toFixed(1));

    // 8. Battery Drain / Charge
    if (this.faults.lowBattery) {
      // Rapid drain injection
      this.batteryPct = Math.max(4.5, this.batteryPct - 1.8);
    } else if (this.faults.rapidPowerDrain) {
      this.batteryPct = Math.max(5.0, this.batteryPct - 0.95);
    } else {
      // Normal battery integration: 1000Wh pack
      const wattHoursDelta = (netPowerWatts * dtSeconds) / 3600;
      const pctDelta = (wattHoursDelta / 1000) * 100;
      this.batteryPct = Math.min(100, Math.max(2, this.batteryPct + pctDelta));
    }

    const batteryVoltage = Number((28.0 + (this.batteryPct / 100) * 4.4).toFixed(2));
    const batteryDischargeRate = netPowerWatts < 0 ? Math.abs(netPowerWatts) : 0;

    // 9. Communication Subsystem
    let signalDbm = -74.0 - terrain.commAttenuation;
    let packetLoss = 0.5;

    if (this.faults.commLoss) {
      signalDbm = -116.0 + this.rng.range(-2, 1);
      packetLoss = 98.5;
    } else {
      signalDbm += this.rng.range(-1.5, 1.5);
      packetLoss = Math.max(0.1, ((-signalDbm - 70) * 1.5));
    }

    const signalQualityPercent = Math.max(
      0,
      Math.min(100, Math.round(((signalDbm - (-120)) / ((-50) - (-120))) * 100))
    );

    // 10. Distance & Objective Progress
    const totalMissionMeters = 1150;
    const distanceToTargetMeters = Math.max(
      0,
      Math.round(Math.hypot(TARGET_DESTINATION.x - this.posX, TARGET_DESTINATION.y - this.posY) * MAP_DIMENSIONS.scaleMetersPerPixel)
    );
    const progressPercent = Math.min(
      100,
      Math.round(((totalMissionMeters - distanceToTargetMeters) / totalMissionMeters) * 100)
    );

    // Formatted time (MET HH:MM:SS)
    const hours = Math.floor(this.missionTimeSeconds / 3600);
    const mins = Math.floor((this.missionTimeSeconds % 3600) / 60);
    const secs = Math.floor(this.missionTimeSeconds % 60);
    const formattedTime = `MET ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Objective text
    let currentObjective = `Transit to Waypoint ${this.currentWaypointIndex} (${targetWp.name})`;
    if (this.faults.lowBattery) {
      currentObjective = 'PRIORITY OVERRIDE: Redirect to Solis Ridge Solar Recharge Station';
    } else if (this.faults.roverStuck) {
      currentObjective = 'SAFETY EMERGENCY: Execute Rocker-Bogie Peristaltic Extraction';
    } else if (this.faults.commLoss) {
      currentObjective = 'AUTONOMOUS SAFEGUARD: Maintain dead-reckoning trajectory to crest';
    }

    return {
      tick: this.tick,
      missionTimeSeconds: this.missionTimeSeconds,
      formattedTime,
      batteryLevel: Number(this.batteryPct.toFixed(1)),
      batteryVoltage,
      batteryDischargeRate: Number(batteryDischargeRate.toFixed(1)),
      solarEfficiency,
      solarGenerationWatts,
      netPowerWatts,
      powerConsumptionWatts,
      dustAccumulation: Number(this.dustPct.toFixed(1)),
      internalTemp: Number(this.internalTempC.toFixed(1)),
      motorAverageTemp: Number(this.motorTempC.toFixed(1)),
      ambientTemp: Number(this.ambientTempC.toFixed(1)),
      heatersActive: this.heatersActive,
      radiatorDeployed: this.radiatorDeployed,
      signalStrengthDbm: Number(signalDbm.toFixed(1)),
      signalQualityPercent,
      commLatencyMs: Math.round(180 + Math.abs(signalDbm) * 2.5),
      packetLossPercent: Number(packetLoss.toFixed(1)),
      relayConnected: !this.faults.commLoss && signalQualityPercent > 15,
      speed: Number(actualSpeed.toFixed(3)),
      commandedSpeed,
      wheelSlipAverage: Number(wheelSlipAverage.toFixed(2)),
      isStuck,
      stuckCounter: this.stuckCounter,
      wheels,
      position: { x: Number(this.posX.toFixed(1)), y: Number(this.posY.toFixed(1)) },
      heading: Math.round(this.heading),
      pitch: Number((terrain.slope * 0.45 * Math.sin((this.heading * Math.PI) / 180)).toFixed(1)),
      roll: Number((terrain.slope * 0.45 * Math.cos((this.heading * Math.PI) / 180)).toFixed(1)),
      slopeAngle: Number(terrain.slope.toFixed(1)),
      roughnessIndex: Number(terrain.roughness.toFixed(2)),
      currentTerrain: terrain.type,
      distanceTraveledMeters: Number(this.distanceTraveledM.toFixed(1)),
      distanceToTargetMeters,
      progressPercent: Math.max(0, progressPercent),
      currentObjective,
      operationalMode: this.operationalMode,
    };
  }
}
