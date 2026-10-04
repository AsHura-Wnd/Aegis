import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../server/app';
import { missionService } from '../server/services/missionService';
import { deviceService } from '../server/services/deviceService';
import { HardwareTelemetryPacket } from '../types/hardwareTelemetry';

describe('AEGIS Hardware Telemetry Ingestion & Security Test Suite', () => {
  const testGlobalToken = 'test-secret-token-2026';
  const testScopedToken = 'scoped-token-rover-alpha';
  const scopedRoverId = 'rover-alpha-unit';

  const createBasePacket = (overrides: Partial<HardwareTelemetryPacket> = {}): HardwareTelemetryPacket => ({
    roverId: 'rover-curiosity-mini',
    missionId: 'primary-mission',
    timestamp: Date.now(),
    sequence: 1,
    power: {
      batteryVoltage: 11.8,
      currentAmps: 1.45,
      batteryPercent: 88,
      solarVoltage: 17.5,
      solarCurrent: 0.8,
    },
    kinematics: {
      pitchDeg: 2.1,
      rollDeg: -1.4,
      yawDeg: 142.0,
      speedMps: 0.12,
      wheelSlipRatio: 0.05,
      tiltAngleDeg: 2.5,
    },
    thermal: {
      ambientTempC: 14.5,
      motorTempC: 28.2,
      mcuTempC: 36.1,
    },
    environment: {
      forwardDistanceCm: 145,
      obstacleDetected: false,
      opticalLux: 650,
    },
    comms: {
      rssiDbm: -72,
      packetLossPercent: 0.2,
      roundTripLatencyMs: 24,
    },
    status: {
      systemHealth: 'OK',
      faultFlags: [],
    },
    ...overrides,
  });

  const originalEnvTokens = process.env.AEGIS_DEVICE_AUTH_TOKENS;
  const originalEnvApiKey = process.env.AEGIS_ROVER_API_KEY;

  beforeEach(() => {
    // Configure environment variables dynamically for testing
    process.env.AEGIS_DEVICE_AUTH_TOKENS = `${testGlobalToken},${scopedRoverId}:${testScopedToken}`;
    delete process.env.AEGIS_ROVER_API_KEY;

    missionService.cleanupAll();
    deviceService.clearAll();
    missionService.createMission('Jezero Primary Exploration', 1337, 'primary-mission');
    missionService.createMission('Olympus Secondary Recon', 42, 'secondary-mission');
  });

  afterEach(() => {
    if (originalEnvTokens !== undefined) {
      process.env.AEGIS_DEVICE_AUTH_TOKENS = originalEnvTokens;
    } else {
      delete process.env.AEGIS_DEVICE_AUTH_TOKENS;
    }
    if (originalEnvApiKey !== undefined) {
      process.env.AEGIS_ROVER_API_KEY = originalEnvApiKey;
    } else {
      delete process.env.AEGIS_ROVER_API_KEY;
    }
  });

  // 1. Device Authentication & Security
  describe('Authentication & Scoped Credentials', () => {
    it('rejects unauthenticated requests without authorization header', async () => {
      const packet = createBasePacket();
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .send(packet);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.error).toContain('Missing device authentication token');
    });

    it('rejects requests with invalid authorization token', async () => {
      const packet = createBasePacket();
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .send(packet);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.error).toContain('Invalid device authentication token');
    });

    it('fails securely when no authentication tokens are configured in the environment', async () => {
      delete process.env.AEGIS_DEVICE_AUTH_TOKENS;
      delete process.env.AEGIS_ROVER_API_KEY;

      const packet = createBasePacket();
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(res.body.error).toContain('no authorized keys configured');
    });

    it('accepts requests with valid Bearer token', async () => {
      const packet = createBasePacket();
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.telemetrySource).toBe('HARDWARE');
      expect(res.body.roverId).toBe('rover-curiosity-mini');
    });

    it('accepts requests with valid X-Device-Token header', async () => {
      const packet = createBasePacket({ sequence: 10 });
      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('X-Device-Token', testGlobalToken)
        .send(packet);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.sequence).toBe(10);
    });

    it('enforces rover-scoped tokens (prevents spoofing another rover identity)', async () => {
      // 1. Authorized scoped rover matches
      const validScopedPacket = createBasePacket({
        roverId: scopedRoverId,
        sequence: 1,
      });
      const validRes = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testScopedToken}`)
        .send(validScopedPacket);

      expect(validRes.status).toBe(200);
      expect(validRes.body.roverId).toBe(scopedRoverId);

      // 2. Token used for an unauthorized rover
      const spoofedPacket = createBasePacket({
        roverId: 'rover-unauthorized-target',
        sequence: 2,
      });
      const spoofedRes = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testScopedToken}`)
        .send(spoofedPacket);

      expect(spoofedRes.status).toBe(403);
      expect(spoofedRes.body.code).toBe('FORBIDDEN');
      expect(spoofedRes.body.error).toContain(scopedRoverId);
    });
  });

  // 2. Schema Validation, Identifier Sanitization & Exact Boundary Limits
  describe('Payload, Identifier & Range Validation', () => {
    it('rejects payloads missing essential subsystems or passing arrays/null', async () => {
      const invalidPacket: any = {
        roverId: 'rover-01',
        missionId: 'primary-mission',
        timestamp: Date.now(),
        sequence: 1,
        power: [], // Array instead of object
        kinematics: null,
      };

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(invalidPacket);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_SCHEMA');
    });

    it('rejects invalid, unsafe, or overly long roverId and missionId identifiers', async () => {
      const traversalPacket = createBasePacket({
        roverId: '../../etc/shadow',
      });
      const res1 = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(traversalPacket);

      expect(res1.status).toBe(400);
      expect(res1.body.details[0]).toContain('invalid characters');

      const overlyLongPacket = createBasePacket({
        roverId: 'a'.repeat(65),
      });
      const res2 = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(overlyLongPacket);

      expect(res2.status).toBe(400);
      expect(res2.body.details[0]).toContain('exceeds maximum allowed length');
    });

    it('accepts exact boundary values for sensors', async () => {
      const boundaryPacket = createBasePacket({
        sequence: 100,
        power: {
          batteryVoltage: 0.0, // Minimum boundary 0V
          currentAmps: 100.0, // Maximum boundary 100A
          batteryPercent: 0,
          solarVoltage: 60.0, // Maximum boundary 60V
          solarCurrent: 30.0, // Maximum boundary 30A
        },
        kinematics: {
          pitchDeg: -90.0, // Minimum pitch boundary
          rollDeg: 90.0, // Maximum roll boundary
          yawDeg: 360.0, // Maximum yaw boundary
          speedMps: 30.0,
          wheelSlipRatio: 1.0,
          tiltAngleDeg: 90.0,
        },
        comms: {
          rssiDbm: -130.0, // Minimum RSSI boundary
          packetLossPercent: 100.0,
          roundTripLatencyMs: 60000,
        },
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(boundaryPacket);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
    });

    it('rejects values just outside the boundary thresholds', async () => {
      const outOfBoundsPacket = createBasePacket({
        power: {
          batteryVoltage: 60.05, // > 60V max limit
          currentAmps: 1.5,
        },
        kinematics: {
          pitchDeg: -90.5, // < -90° min limit
          rollDeg: 0,
        },
        comms: {
          rssiDbm: 0.5, // > 0 dBm max limit
        },
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(outOfBoundsPacket);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('OUT_OF_RANGE');
      expect(res.body.details.length).toBeGreaterThanOrEqual(3);
    });

    it('rejects stale timestamp packets (> 300 seconds old)', async () => {
      const stalePacket = createBasePacket({
        timestamp: Date.now() - 305000,
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(stalePacket);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('STALE_PACKET');
      expect(res.body.details[0]).toContain('Timestamp is too old');
    });

    it('rejects future clock-skewed packets (> 60 seconds into future)', async () => {
      const futurePacket = createBasePacket({
        timestamp: Date.now() + 65000,
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(futurePacket);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('STALE_PACKET');
      expect(res.body.details[0]).toContain('future clock skew');
    });
  });

  // 3. Mission Association & Cross-Talk Isolation
  describe('Mission Association & Cross-Talk Prevention', () => {
    it('returns 404 if associated mission does not exist', async () => {
      const packet = createBasePacket({
        missionId: 'non-existent-mission-xyz',
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('MISSION_NOT_FOUND');
    });

    it('prevents cross-mission telemetry injection without prior device reset', async () => {
      // Ingest into primary-mission
      const p1 = createBasePacket({
        roverId: 'rover-dedicated-1',
        missionId: 'primary-mission',
        sequence: 1,
      });
      const res1 = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(p1);
      expect(res1.status).toBe(200);

      // Attempt to send telemetry for the same rover to secondary-mission
      const p2 = createBasePacket({
        roverId: 'rover-dedicated-1',
        missionId: 'secondary-mission',
        sequence: 2,
      });
      const res2 = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(p2);

      expect(res2.status).toBe(409);
      expect(res2.body.code).toBe('MISSION_MISMATCH');
      expect(res2.body.error).toContain('primary-mission');
    });
  });

  // 4. Monotonic Sequencing, Replay Defense & Concurrency
  describe('Sequence Monotonicity, Replay Defense & Concurrency', () => {
    it('rejects duplicate or out-of-order sequence packets with 409 Conflict', async () => {
      const packet1 = createBasePacket({ sequence: 5 });
      const res1 = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet1);
      expect(res1.status).toBe(200);

      // Immediate duplicate sequence 5
      const duplicateRes = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet1);
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.code).toBe('OUT_OF_ORDER');

      // Older sequence 4
      const olderRes = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(createBasePacket({ sequence: 4 }));
      expect(olderRes.status).toBe(409);
      expect(olderRes.body.code).toBe('OUT_OF_ORDER');

      // Subsequent sequence 6 is accepted
      const res2 = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(createBasePacket({ sequence: 6 }));
      expect(res2.status).toBe(200);
    });

    it('rejects replay attacks even after delays unless device is disconnected or explicitly reset', async () => {
      const packet10 = createBasePacket({ roverId: 'rover-replay-test', sequence: 10 });
      await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet10);

      // Attempt to replay sequence 1
      const replayRes = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(createBasePacket({ roverId: 'rover-replay-test', sequence: 1 }));

      expect(replayRes.status).toBe(409);
      expect(replayRes.body.code).toBe('OUT_OF_ORDER');
    });

    it('handles concurrent telemetry submissions safely (only one succeeds for duplicate sequence)', async () => {
      const packet = createBasePacket({ roverId: 'rover-concurrent', sequence: 15 });

      // Send 5 concurrent requests with the identical packet sequence
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/telemetry/ingest')
          .set('Authorization', `Bearer ${testGlobalToken}`)
          .send(packet)
      );

      const responses = await Promise.all(requests);
      const successCount = responses.filter((r) => r.status === 200).length;
      const conflictCount = responses.filter((r) => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(4);
    });
  });

  // 5. Unauthorized Device Reset Protection
  describe('Device Reset Authorization & Scoping', () => {
    it('rejects unauthenticated requests to reset a device', async () => {
      const res = await request(app).post('/api/devices/rover-target/reset');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects scoped tokens attempting to reset a different rover', async () => {
      const res = await request(app)
        .post('/api/devices/rover-other/reset')
        .set('Authorization', `Bearer ${testScopedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.error).toContain(scopedRoverId);
    });

    it('allows authorized client to reset device sequence tracking', async () => {
      const res = await request(app)
        .post(`/api/devices/${scopedRoverId}/reset`)
        .set('Authorization', `Bearer ${testScopedToken}`);

      expect(res.status).toBe(200);
      expect(res.body.roverId).toBe(scopedRoverId);
    });
  });

  // 6. Device Status Transitions & Reliability
  describe('Device Connectivity Transitions', () => {
    it('accurately reports ONLINE, STALE, and DISCONNECTED states', () => {
      const now = Date.now();

      // Recent packet: < 3.5s -> ONLINE
      expect(deviceService.getConnectivityStatus(now - 1000, now)).toBe('ONLINE');

      // Stale packet: between 3.5s and 10s -> STALE
      expect(deviceService.getConnectivityStatus(now - 4000, now)).toBe('STALE');

      // Disconnected: > 10s -> DISCONNECTED
      expect(deviceService.getConnectivityStatus(now - 12000, now)).toBe('DISCONNECTED');
    });

    it('returns zero packet rate when rover is disconnected', async () => {
      const packet = createBasePacket({ roverId: 'rover-rate-test', sequence: 1 });
      await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet);

      // Simulate passage of 15 seconds
      const record = (deviceService as any).devices.get('rover-rate-test');
      expect(record).toBeDefined();
      record.lastSeen = Date.now() - 15000;

      const status = deviceService.getDeviceStatus('rover-rate-test');
      expect(status?.status).toBe('DISCONNECTED');
      expect(status?.packetRateHz).toBe(0);
    });
  });

  // 7. AEGIS Intelligence Pipeline Integration
  describe('Hazard Detection & Compounding Risk', () => {
    it('correctly detects LOW_BATTERY hazard from real voltage/charge reading', async () => {
      const lowBattPacket = createBasePacket({
        sequence: 1,
        power: {
          batteryVoltage: 9.8,
          currentAmps: 2.1,
          batteryPercent: 12,
        },
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(lowBattPacket);

      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe('CRITICAL');
      expect(res.body.riskScore).toBeGreaterThanOrEqual(75);
      expect(res.body.activeHazardsCount).toBeGreaterThanOrEqual(1);

      const hazardTypes = res.body.activeHazards.map((h: any) => h.hazardType);
      expect(hazardTypes).toContain('LOW_BATTERY');
    });

    it('correctly detects OVERHEATING hazard from real drive motor thermal sensor', async () => {
      const overheatingPacket = createBasePacket({
        sequence: 2,
        thermal: {
          motorTempC: 72.5,
          ambientTempC: 22.0,
          mcuTempC: 45.0,
        },
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(overheatingPacket);

      expect(res.status).toBe(200);
      const hazardTypes = res.body.activeHazards.map((h: any) => h.hazardType);
      expect(hazardTypes).toContain('OVERHEATING');
      expect(res.body.recommendations.length).toBeGreaterThan(0);
    });

    it('correctly detects DANGEROUS_TERRAIN hazard from real IMU pitch and roll', async () => {
      const steepSlopePacket = createBasePacket({
        sequence: 3,
        kinematics: {
          pitchDeg: 26.0,
          rollDeg: 8.0,
          speedMps: 0.05,
        },
      });

      const res = await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(steepSlopePacket);

      expect(res.status).toBe(200);
      const hazardTypes = res.body.activeHazards.map((h: any) => h.hazardType);
      expect(hazardTypes).toContain('DANGEROUS_TERRAIN');
    });
  });

  // 8. Telemetry Retrieval & Source Tagging
  describe('Mission Telemetry Retrieval', () => {
    it('marks telemetrySource as HARDWARE and preserves rover identity in GET /api/missions/:id/telemetry', async () => {
      const packet = createBasePacket({
        roverId: 'aegis-rc-rover-01',
        sequence: 42,
        power: {
          batteryVoltage: 12.2,
          currentAmps: 1.8,
          batteryPercent: 91,
        },
        kinematics: {
          pitchDeg: 3.5,
          rollDeg: 1.2,
          speedMps: 0.15,
        },
        comms: {
          rssiDbm: -68,
        },
      });

      await request(app)
        .post('/api/telemetry/ingest')
        .set('Authorization', `Bearer ${testGlobalToken}`)
        .send(packet);

      const res = await request(app).get('/api/missions/primary-mission/telemetry');
      expect(res.status).toBe(200);
      expect(res.body.current.telemetrySource).toBe('HARDWARE');
      expect(res.body.current.roverId).toBe('aegis-rc-rover-01');
      expect(res.body.current.sequenceNumber).toBe(42);
      expect(res.body.current.batteryLevel).toBe(91);
      expect(res.body.current.batteryVoltage).toBe(12.2);
    });
  });
});
