import { describe, expect, it } from 'vitest';
import { AegisAIAssistant } from '../engines/aiAssistantEngine';
import { AutonomousDecisionEngine } from '../engines/decisionEngine';
import { DEFAULT_HAZARD_CONFIGS, HazardDetectionEngine } from '../engines/hazardEngine';
import { DynamicRiskEngine } from '../engines/riskEngine';
import { RoverSimulationModel } from '../simulation/roverModel';
import { SCENARIO_CATALOG } from '../simulation/scenarioDefinitions';
import { sampleTerrainAt } from '../simulation/terrainMap';
import { HazardType } from '../types/hazard';
import { RoverTelemetry } from '../types/telemetry';

describe('AEGIS Rover Simulation Model', () => {
  it('initializes with nominal bounded telemetry', () => {
    const sim = new RoverSimulationModel(1337);
    const telem = sim.step(0);

    expect(telem.batteryLevel).toBeGreaterThan(80);
    expect(telem.batteryLevel).toBeLessThanOrEqual(100);
    expect(telem.internalTemp).toBeGreaterThan(15);
    expect(telem.internalTemp).toBeLessThan(30);
    expect(telem.solarEfficiency).toBeGreaterThan(80);
    expect(telem.speed).toBeGreaterThanOrEqual(0);
    expect(telem.wheels.length).toBe(6);
    expect(telem.operationalMode).toBe('AUTONOMOUS_TRANSIT');
  });

  it('produces identical deterministic telemetry runs with the same seed', () => {
    const sim1 = new RoverSimulationModel(42);
    const sim2 = new RoverSimulationModel(42);

    for (let i = 0; i < 15; i++) {
      const t1 = sim1.step(1.0);
      const t2 = sim2.step(1.0);

      expect(t1.batteryLevel).toBe(t2.batteryLevel);
      expect(t1.position.x).toBe(t2.position.x);
      expect(t1.position.y).toBe(t2.position.y);
      expect(t1.internalTemp).toBe(t2.internalTemp);
      expect(t1.signalStrengthDbm).toBe(t2.signalStrengthDbm);
    }
  });

  it('accurately samples terrain in Jezero Crater zones', () => {
    // Belva Crater Rim Scarps (x: 340, y: 220)
    const craterSample = sampleTerrainAt(340, 220);
    expect(craterSample.type).toBe('CRATER_SLOPE');
    expect(craterSample.slope).toBeGreaterThan(20);

    // Neretva Sand Sea (x: 510, y: 350)
    const duneSample = sampleTerrainAt(510, 350);
    expect(duneSample.type).toBe('LOOSE_SAND_DUNE');
    expect(duneSample.slipMultiplier).toBeGreaterThan(2.0);

    // Solis Plateau Recharge Haven (x: 230, y: 340)
    const safeSample = sampleTerrainAt(230, 340);
    expect(safeSample.type).toBe('RECHARGE_PLATEAU');
    expect(safeSample.solarFactor).toBeGreaterThan(1.0);
  });
});

describe('AEGIS 9-Vector Hazard Detection Engine', () => {
  const hazardEngine = new HazardDetectionEngine();

  const createMockTelemetry = (overrides?: Partial<RoverTelemetry>): RoverTelemetry => {
    const sim = new RoverSimulationModel(1337);
    const base = sim.step(0);
    return { ...base, ...overrides };
  };

  it('detects Hazard 1: LOW_BATTERY', () => {
    const telemWarn = createMockTelemetry({ batteryLevel: 22 });
    const hazardsWarn = hazardEngine.evaluate(telemWarn);
    const battWarn = hazardsWarn.find((h) => h.hazardType === 'LOW_BATTERY');
    expect(battWarn).toBeDefined();
    expect(battWarn?.severity).toBe('HIGH');

    const telemCrit = createMockTelemetry({ batteryLevel: 12 });
    const hazardsCrit = hazardEngine.evaluate(telemCrit);
    const battCrit = hazardsCrit.find((h) => h.hazardType === 'LOW_BATTERY');
    expect(battCrit).toBeDefined();
    expect(battCrit?.severity).toBe('CRITICAL');
    expect(battCrit?.recommendedAction).toContain('Low-Power Safeguard');
  });

  it('detects Hazard 2: OVERHEATING', () => {
    const telem = createMockTelemetry({ motorAverageTemp: 72 });
    const hazards = hazardEngine.evaluate(telem);
    const heatHaz = hazards.find((h) => h.hazardType === 'OVERHEATING');
    expect(heatHaz).toBeDefined();
    expect(heatHaz?.severity).toBe('CRITICAL');
  });

  it('detects Hazard 3: EXTREME_COLD', () => {
    const telem = createMockTelemetry({ internalTemp: -52 });
    const hazards = hazardEngine.evaluate(telem);
    const coldHaz = hazards.find((h) => h.hazardType === 'EXTREME_COLD');
    expect(coldHaz).toBeDefined();
    expect(coldHaz?.severity).toBe('CRITICAL');
  });

  it('detects Hazard 4: WHEEL_SLIP', () => {
    const telem = createMockTelemetry({ wheelSlipAverage: 0.65, isStuck: false });
    const hazards = hazardEngine.evaluate(telem);
    const slipHaz = hazards.find((h) => h.hazardType === 'WHEEL_SLIP');
    expect(slipHaz).toBeDefined();
    expect(slipHaz?.severity).toBe('HIGH');
  });

  it('detects Hazard 5: ROVER_STUCK', () => {
    const telem = createMockTelemetry({
      isStuck: true,
      commandedSpeed: 0.08,
      speed: 0.0,
      stuckCounter: 5,
      wheelSlipAverage: 0.88,
    });
    const hazards = hazardEngine.evaluate(telem);
    const stuckHaz = hazards.find((h) => h.hazardType === 'ROVER_STUCK');
    expect(stuckHaz).toBeDefined();
    expect(stuckHaz?.severity).toBe('CRITICAL');
    expect(stuckHaz?.recommendedAction).toContain('peristaltic');
  });

  it('detects Hazard 6: SOLAR_PANEL_DEGRADATION', () => {
    const telem = createMockTelemetry({ solarEfficiency: 28, dustAccumulation: 85 });
    const hazards = hazardEngine.evaluate(telem);
    const dustHaz = hazards.find((h) => h.hazardType === 'SOLAR_PANEL_DEGRADATION');
    expect(dustHaz).toBeDefined();
    expect(dustHaz?.severity).toBe('HIGH');
  });

  it('detects Hazard 7: WEAK_COMMUNICATION', () => {
    const telem = createMockTelemetry({
      signalStrengthDbm: -115,
      packetLossPercent: 95,
      relayConnected: false,
    });
    const hazards = hazardEngine.evaluate(telem);
    const commHaz = hazards.find((h) => h.hazardType === 'WEAK_COMMUNICATION');
    expect(commHaz).toBeDefined();
    expect(commHaz?.severity).toBe('CRITICAL');
    expect(commHaz?.recommendedAction).toContain('AUTONOMOUS SAFEGUARD');
  });

  it('detects Hazard 8: DANGEROUS_TERRAIN', () => {
    const telem = createMockTelemetry({ slopeAngle: 26.5, roughnessIndex: 0.9 });
    const hazards = hazardEngine.evaluate(telem);
    const terrHaz = hazards.find((h) => h.hazardType === 'DANGEROUS_TERRAIN');
    expect(terrHaz).toBeDefined();
    expect(terrHaz?.severity).toBe('CRITICAL');
  });

  it('detects Hazard 9: RAPID_POWER_DRAIN', () => {
    const telem = createMockTelemetry({ powerConsumptionWatts: 470, batteryDischargeRate: 390 });
    const hazards = hazardEngine.evaluate(telem);
    const drainHaz = hazards.find((h) => h.hazardType === 'RAPID_POWER_DRAIN');
    expect(drainHaz).toBeDefined();
    expect(drainHaz?.severity).toBe('CRITICAL');
  });
});

describe('Dynamic Risk Engine & Compounding Interactions', () => {
  const riskEngine = new DynamicRiskEngine();
  const hazardEngine = new HazardDetectionEngine();
  const sim = new RoverSimulationModel(1337);

  it('outputs LOW risk when all systems are nominal', () => {
    const telem = sim.step(0);
    const hazards = hazardEngine.evaluate(telem);
    const risk = riskEngine.calculateRisk(telem, hazards);

    expect(risk.riskLevel).toBe('LOW');
    expect(risk.currentScore).toBeLessThanOrEqual(25);
    expect(risk.reasonForChange).toBeDefined();
  });

  it('applies compounding multiplier when Low Battery + Comm Loss coincide', () => {
    const telem = sim.step(0);
    telem.batteryLevel = 14;
    telem.signalStrengthDbm = -115;
    telem.relayConnected = false;

    const hazards = hazardEngine.evaluate(telem);
    const risk = riskEngine.calculateRisk(telem, hazards);

    expect(risk.riskLevel).toBe('CRITICAL');
    expect(risk.currentScore).toBeGreaterThanOrEqual(76);
    expect(risk.compoundingFactors.some((cf) => cf.includes('Low Battery + Comm Blackout'))).toBe(true);
  });
});

describe('Autonomous Decision Engine', () => {
  it('triggers emergency recovery mode override when rover is stuck', () => {
    const decisionEngine = new AutonomousDecisionEngine();
    const hazardEngine = new HazardDetectionEngine();
    const riskEngine = new DynamicRiskEngine();
    const sim = new RoverSimulationModel(1337);

    sim.setFaults({ roverStuck: true });
    const telem = sim.step(1.0);
    const hazards = hazardEngine.evaluate(telem);
    const risk = riskEngine.calculateRisk(telem, hazards);

    const { decision, modeOverride, newLogs } = decisionEngine.evaluateDecisions(
      telem,
      hazards,
      risk
    );

    expect(modeOverride).toBe('EMERGENCY_RECOVERY');
    expect(decision?.actionTaken).toContain('Peristaltic');
    expect(newLogs.length).toBeGreaterThan(0);
  });
});

describe('AEGIS AI Mission Assistant (Deterministic Rule Engine)', () => {
  const assistant = new AegisAIAssistant();
  const sim = new RoverSimulationModel(1337);
  const hazardEngine = new HazardDetectionEngine();
  const riskEngine = new DynamicRiskEngine();

  it('answers "Is the rover safe?" grounded in current state', async () => {
    const telem = sim.step(0);
    const hazards = hazardEngine.evaluate(telem);
    const risk = riskEngine.calculateRisk(telem, hazards);

    const response = await assistant.respondToQuery('Is the rover safe right now?', {
      telemetry: telem,
      activeHazards: hazards,
      risk,
      missionName: 'Jezero Delta Traverse',
    });

    expect(response.text).toContain('ROVER IS SAFE');
    expect(response.sourceType).toBe('DETERMINISTIC_RULES');
    expect(response.referencedTelemetry?.battery).toBeDefined();
  });

  it('answers "Why is battery dropping?" with subsystem power breakdown', async () => {
    const telem = sim.step(0);
    telem.batteryLevel = 19.5;
    telem.powerConsumptionWatts = 420;
    telem.netPowerWatts = -310;

    const hazards = hazardEngine.evaluate(telem);
    const risk = riskEngine.calculateRisk(telem, hazards);

    const response = await assistant.respondToQuery('Why is the battery dropping?', {
      telemetry: telem,
      activeHazards: hazards,
      risk,
      missionName: 'Jezero Delta Traverse',
    });

    expect(response.text).toContain('POWER SUBSYSTEM TELEMETRY ANALYSIS');
    expect(response.text).toContain('19.5%');
    expect(response.recommendedAction).toBeDefined();
  });
});

describe('Scenario Catalog Integrity', () => {
  it('contains all 6 required demonstration scenarios', () => {
    const required = [
      'LOW_BATTERY',
      'ROVER_STUCK',
      'COMM_LOSS',
      'EXTREME_TEMP',
      'SOLAR_DUST',
      'HAZARDOUS_TERRAIN',
    ];

    for (const req of required) {
      expect(SCENARIO_CATALOG[req]).toBeDefined();
      expect(SCENARIO_CATALOG[req].name).toBeDefined();
      expect(SCENARIO_CATALOG[req].expectedHazards.length).toBeGreaterThan(0);
    }
  });
});
