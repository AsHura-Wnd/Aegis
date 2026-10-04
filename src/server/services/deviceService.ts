import { HardwareTelemetryPacket } from '../../types/hardwareTelemetry';

export type DeviceConnectivityStatus = 'ONLINE' | 'STALE' | 'DISCONNECTED';

export interface DeviceStatusSummary {
  roverId: string;
  status: DeviceConnectivityStatus;
  lastSeenMsAgo: number;
  lastSeenTimestamp: number;
  lastSequence: number;
  totalPackets: number;
  packetRateHz: number;
  associatedMissionId?: string;
  sensorHealth: {
    power: boolean;
    kinematics: boolean;
    thermal: boolean;
    comms: boolean;
    environment: boolean;
  };
  systemHealth?: 'OK' | 'DEGRADED' | 'FAULT';
  faultFlags?: string[];
}

export interface DeviceRecord {
  roverId: string;
  firstSeen: number;
  lastSeen: number;
  lastSequence: number;
  totalPackets: number;
  recentPacketTimestamps: number[];
  lastPacket: HardwareTelemetryPacket | null;
  associatedMissionId?: string;
}

export interface RecordPacketResult {
  accepted: boolean;
  error?: string;
  code?: 'STALE_PACKET' | 'OUT_OF_ORDER' | 'MISSION_MISMATCH';
}

export class DeviceRegistryService {
  private devices: Map<string, DeviceRecord> = new Map();

  // Thresholds in milliseconds
  public static readonly STALE_THRESHOLD_MS = 3500;
  public static readonly DISCONNECT_THRESHOLD_MS = 10000;

  /**
   * Evaluates connectivity status based on elapsed time since last packet.
   */
  public getConnectivityStatus(lastSeen: number, now: number = Date.now()): DeviceConnectivityStatus {
    const elapsed = now - lastSeen;
    if (elapsed < DeviceRegistryService.STALE_THRESHOLD_MS) {
      return 'ONLINE';
    }
    if (elapsed < DeviceRegistryService.DISCONNECT_THRESHOLD_MS) {
      return 'STALE';
    }
    return 'DISCONNECTED';
  }

  /**
   * Records a validated hardware telemetry packet.
   * Enforces strict sequence monotonicity, mission isolation, and tracks connectivity health.
   */
  public recordPacket(packet: HardwareTelemetryPacket): RecordPacketResult {
    const now = Date.now();
    let record = this.devices.get(packet.roverId);

    if (!record) {
      record = {
        roverId: packet.roverId,
        firstSeen: now,
        lastSeen: now,
        lastSequence: packet.sequence,
        totalPackets: 1,
        recentPacketTimestamps: [now],
        lastPacket: packet,
        associatedMissionId: packet.missionId,
      };
      this.devices.set(packet.roverId, record);
      return { accepted: true };
    }

    // 1. Mission cross-talk isolation check
    if (record.associatedMissionId && record.associatedMissionId !== packet.missionId) {
      return {
        accepted: false,
        error: `Rover '${packet.roverId}' is registered to mission '${record.associatedMissionId}'. Cannot ingest telemetry into mission '${packet.missionId}' without device reset.`,
        code: 'MISSION_MISMATCH',
      };
    }

    // 2. Monotonic sequence check:
    // Packets must strictly increment in sequence.
    // The only automatic reset allowed without an explicit reset request is a cold reboot (sequence <= 1)
    // after the device has been in DISCONNECTED state (>= 10,000ms offline).
    const elapsedSinceLastSeen = now - record.lastSeen;
    const isColdReboot = packet.sequence <= 1 && elapsedSinceLastSeen >= DeviceRegistryService.DISCONNECT_THRESHOLD_MS;

    if (packet.sequence <= record.lastSequence && !isColdReboot) {
      return {
        accepted: false,
        error: `Out-of-order or duplicate packet received. Sequence ${packet.sequence} <= current lastSequence ${record.lastSequence}.`,
        code: 'OUT_OF_ORDER',
      };
    }

    // Update record
    record.lastSeen = now;
    record.lastSequence = packet.sequence;
    record.totalPackets += 1;
    record.lastPacket = packet;
    record.associatedMissionId = packet.missionId;

    // Maintain 10-sample window for packet rate calculation
    record.recentPacketTimestamps.push(now);
    if (record.recentPacketTimestamps.length > 10) {
      record.recentPacketTimestamps.shift();
    }

    return { accepted: true };
  }

  /**
   * Returns a detailed status summary for a specific rover.
   */
  public getDeviceStatus(roverId: string): DeviceStatusSummary | null {
    const record = this.devices.get(roverId);
    if (!record) return null;

    const now = Date.now();
    const elapsed = now - record.lastSeen;
    const status = this.getConnectivityStatus(record.lastSeen, now);

    // Calculate approximate packet rate (Hz)
    let rateHz = 0;
    if (status !== 'DISCONNECTED' && record.recentPacketTimestamps.length >= 2) {
      const windowStart = record.recentPacketTimestamps[0];
      const windowEnd = record.recentPacketTimestamps[record.recentPacketTimestamps.length - 1];
      const timeSpanSec = (windowEnd - windowStart) / 1000;
      if (timeSpanSec > 0) {
        rateHz = Math.round(((record.recentPacketTimestamps.length - 1) / timeSpanSec) * 10) / 10;
      }
    }

    const lastPacket = record.lastPacket;

    return {
      roverId: record.roverId,
      status,
      lastSeenMsAgo: elapsed,
      lastSeenTimestamp: record.lastSeen,
      lastSequence: record.lastSequence,
      totalPackets: record.totalPackets,
      packetRateHz: rateHz,
      associatedMissionId: record.associatedMissionId,
      sensorHealth: {
        power: !!(lastPacket?.power && lastPacket.power.batteryVoltage > 0),
        kinematics: !!(lastPacket?.kinematics),
        thermal: !!(lastPacket?.thermal),
        comms: !!(lastPacket?.comms && lastPacket.comms.rssiDbm > -130),
        environment: !!(lastPacket?.environment),
      },
      systemHealth: lastPacket?.status?.systemHealth ?? 'OK',
      faultFlags: lastPacket?.status?.faultFlags ?? [],
    };
  }

  /**
   * Returns a list of all known hardware devices and their statuses.
   */
  public listDevices(): DeviceStatusSummary[] {
    const list: DeviceStatusSummary[] = [];
    for (const roverId of this.devices.keys()) {
      const summary = this.getDeviceStatus(roverId);
      if (summary) list.push(summary);
    }
    return list;
  }

  /**
   * Resets device state (e.g., when deliberately rebooting rover).
   */
  public resetDevice(roverId: string): boolean {
    return this.devices.delete(roverId);
  }

  /**
   * Clears all devices (useful for test isolation).
   */
  public clearAll(): void {
    this.devices.clear();
  }
}

export const deviceService = new DeviceRegistryService();
