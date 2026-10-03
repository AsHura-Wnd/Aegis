import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/app';
import { missionService } from '../server/services/missionService';

describe('AEGIS Backend REST API Test Suite', () => {
  beforeEach(() => {
    // Reset to clean default state before each test
    missionService.cleanupAll();
    missionService.createMission('Jezero Primary Exploration', 1337, 'primary-mission');
  });

  // 1. Health check
  it('GET /api/health returns service status and uptime', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('HEALTHY');
    expect(res.body.service).toContain('AEGIS');
    expect(res.body.activeMissionsCount).toBeGreaterThanOrEqual(1);
  });

  // 2. Mission lifecycle & Multi-mission isolation
  it('supports creating, listing, retrieving, and isolating multiple missions', async () => {
    // List missions
    const listRes = await request(app).get('/api/missions');
    expect(listRes.status).toBe(200);
    expect(listRes.body.missions.length).toBe(1);
    expect(listRes.body.missions[0].id).toBe('primary-mission');

    // Create a secondary mission with a different seed
    const createRes = await request(app)
      .post('/api/missions')
      .send({ name: 'Secondary Sector 5 Recon', seed: 42, id: 'recon-alpha' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.mission.id).toBe('recon-alpha');
    expect(createRes.body.mission.seed).toBe(42);

    // Verify mission isolation: Step primary-mission 5 times, recon-alpha 0 times
    await request(app).post('/api/missions/primary-mission/step').send({ count: 5 });

    const primaryState = await request(app).get('/api/missions/primary-mission');
    const reconState = await request(app).get('/api/missions/recon-alpha');

    expect(primaryState.body.mission.tickCount).toBe(5);
    expect(reconState.body.mission.tickCount).toBe(0);

    // Delete secondary mission
    const delRes = await request(app).delete('/api/missions/recon-alpha');
    expect(delRes.status).toBe(200);
  });

  // 3. Stepping simulation & Telemetry
  it('POST /api/missions/:id/step advances ticks and updates telemetry and risk', async () => {
    const stepRes = await request(app)
      .post('/api/missions/primary-mission/step')
      .send({ count: 3 });

    expect(stepRes.status).toBe(200);
    expect(stepRes.body.ticksExecuted).toBe(3);
    expect(stepRes.body.telemetry.tick).toBe(3);
    expect(stepRes.body.telemetry.batteryLevel).toBeGreaterThan(0);
    expect(stepRes.body.risk).toBeDefined();

    // Check telemetry endpoint
    const telemRes = await request(app).get('/api/missions/primary-mission/telemetry');
    expect(telemRes.status).toBe(200);
    expect(telemRes.body.current.tick).toBe(3);
    expect(telemRes.body.history.length).toBe(3);
  });

  // 4. Start and Pause controls
  it('POST /api/missions/:id/start and /pause modify running state', async () => {
    const startRes = await request(app)
      .post('/api/missions/primary-mission/start')
      .send({ speedMultiplier: 2 });

    expect(startRes.status).toBe(200);
    expect(startRes.body.mission.status).toBe('RUNNING');
    expect(startRes.body.mission.speedMultiplier).toBe(2);

    const pauseRes = await request(app).post('/api/missions/primary-mission/pause');
    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.mission.status).toBe('PAUSED');
  });

  // 5. Hazards and configuration updates
  it('GET and PUT /api/missions/:id/hazards manages rule thresholds', async () => {
    const hazardsRes = await request(app).get('/api/missions/primary-mission/hazards');
    expect(hazardsRes.status).toBe(200);
    expect(hazardsRes.body.configs.LOW_BATTERY).toBeDefined();

    // Update threshold
    const putRes = await request(app)
      .put('/api/missions/primary-mission/hazards/LOW_BATTERY')
      .send({ moderateThreshold: 30 });

    expect(putRes.status).toBe(200);
    expect(putRes.body.hazards.configs.LOW_BATTERY.moderateThreshold).toBe(30);
  });

  // 6. Dynamic Risk Assessment
  it('GET /api/missions/:id/risk returns dynamic score, drivers, and level', async () => {
    const res = await request(app).get('/api/missions/primary-mission/risk');
    expect(res.status).toBe(200);
    expect(res.body.risk.currentScore).toBeGreaterThanOrEqual(0);
    expect(res.body.risk.currentScore).toBeLessThanOrEqual(100);
    expect(res.body.risk.riskLevel).toBeDefined();
    expect(res.body.risk.reasonForChange).toBeDefined();
  });

  // 7. Scenario Injection Pipeline: Rover Stuck -> Hazard -> Decision -> Mitigation
  it('executes the full scenario-to-decision pipeline for ROVER_STUCK', async () => {
    // 1. Inject ROVER_STUCK scenario
    const injectRes = await request(app)
      .post('/api/missions/primary-mission/scenarios')
      .send({ scenarioId: 'ROVER_STUCK' });

    expect(injectRes.status).toBe(200);
    expect(injectRes.body.risk.riskLevel).toBe('CRITICAL');
    expect(injectRes.body.telemetry.isStuck).toBe(true);

    // 2. Verify Hazard Engine registered ROVER_STUCK
    const hazardsRes = await request(app).get('/api/missions/primary-mission/hazards');
    const stuckHaz = hazardsRes.body.active.find((h: any) => h.hazardType === 'ROVER_STUCK');
    expect(stuckHaz).toBeDefined();
    expect(stuckHaz.severity).toBe('CRITICAL');

    // 3. Verify Autonomous Decision Engine triggered mode shift and logged decision
    const decisionsRes = await request(app).get('/api/missions/primary-mission/decisions');
    expect(decisionsRes.status).toBe(200);
    expect(decisionsRes.body.recentDecision.actionTaken).toContain('Peristaltic');
    expect(decisionsRes.body.logs.length).toBeGreaterThan(0);

    // 4. Execute Autonomous Mitigation
    const mitRes = await request(app)
      .post('/api/missions/primary-mission/mitigate')
      .send({ hazardType: 'ROVER_STUCK' });

    expect(mitRes.status).toBe(200);
    expect(mitRes.body.actionTaken).toContain('peristaltic');
    expect(mitRes.body.telemetry.isStuck).toBe(false);

    // 5. Clear all faults to return to nominal
    const clearRes = await request(app).post('/api/missions/primary-mission/scenarios/clear');
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.risk.riskLevel).toBe('LOW');
  });

  // 8. Scenario Injection for All Remaining Scenarios
  it('successfully triggers fault states for all other catalog scenarios', async () => {
    const testScenarios = [
      'LOW_BATTERY',
      'COMM_LOSS',
      'EXTREME_TEMP',
      'SOLAR_DUST',
      'HAZARDOUS_TERRAIN',
    ];

    for (const sc of testScenarios) {
      const res = await request(app)
        .post('/api/missions/primary-mission/scenarios')
        .send({ scenarioId: sc });

      expect(res.status).toBe(200);
      expect(res.body.risk.currentScore).toBeGreaterThan(25);

      // Clean between tests
      await request(app).post('/api/missions/primary-mission/scenarios/clear');
    }
  });

  // 9. Context-Aware AI Mission Assistant
  it('POST /api/missions/:id/assistant answers questions grounded in live telemetry', async () => {
    // Ask safety status
    const safetyRes = await request(app)
      .post('/api/missions/primary-mission/assistant')
      .send({ query: 'Is the rover safe right now?' });

    expect(safetyRes.status).toBe(200);
    expect(safetyRes.body.response.text).toContain('ROVER IS SAFE');
    expect(safetyRes.body.response.sourceType).toBe('DETERMINISTIC_RULES');

    // Ask battery inquiry
    const battRes = await request(app)
      .post('/api/missions/primary-mission/assistant')
      .send({ query: 'Why is the battery dropping?' });

    expect(battRes.status).toBe(200);
    expect(battRes.body.response.text).toContain('POWER SUBSYSTEM TELEMETRY ANALYSIS');

    // Ask next recommended action
    const nextRes = await request(app)
      .post('/api/missions/primary-mission/assistant')
      .send({ query: 'What should the rover do next?' });

    expect(nextRes.status).toBe(200);
    expect(nextRes.body.response.text).toContain('RECOMMENDATION');
  });

  // 10. Reset and Replay
  it('POST /api/missions/:id/reset and /replay restore clean initial state', async () => {
    // Advance 10 ticks
    await request(app).post('/api/missions/primary-mission/step').send({ count: 10 });
    const moved = await request(app).get('/api/missions/primary-mission');
    expect(moved.body.mission.tickCount).toBe(10);

    // Reset
    const resetRes = await request(app).post('/api/missions/primary-mission/reset').send({ seed: 1337 });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.mission.tickCount).toBe(0);
    expect(resetRes.body.telemetry.position.x).toBe(70); // start position
  });

  // 11. Headless Benchmark API
  it('POST /api/benchmark executes headless benchmark comparing AEGIS vs teleoperation', async () => {
    const res = await request(app)
      .post('/api/benchmark')
      .send({ numMissions: 5, ticksPerMission: 15 });

    expect(res.status).toBe(200);
    expect(res.body.results.missionCount).toBe(5);
    expect(res.body.results.aegis.survivalRatePercent).toBeGreaterThanOrEqual(
      res.body.results.baselineTeleoperation.survivalRatePercent
    );
    expect(res.body.results.improvementDeltas.resolutionSpeedupFactor).toBeGreaterThan(10);
  });
});
