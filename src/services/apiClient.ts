import { DetectedHazard, HazardType } from '../types/hazard';
import { LogEntry } from '../types/log';
import { RiskAssessment } from '../types/risk';
import { ScenarioId } from '../types/scenario';
import { RoverTelemetry, TelemetryHistoryPoint } from '../types/telemetry';

export interface MissionSummary {
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

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  activeMissionsCount: number;
}

/**
 * Resolves the backend API base URL:
 * - Production: uses VITE_API_URL if configured, falling back to live Render backend: https://aegis-92x3.onrender.com/api
 * - Local development: uses relative '/api' proxied by Vite dev server to localhost:3001
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // When built and running in production (e.g. deployed to Vercel), route directly to Render backend
  if ((import.meta as any).env?.PROD) {
    return 'https://aegis-92x3.onrender.com/api';
  }

  // Local development / fallback proxy
  return '/api';
}

const API_BASE = getApiBaseUrl();

export const apiClient = {
  async checkHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async listMissions(): Promise<MissionSummary[]> {
    const res = await fetch(`${API_BASE}/missions`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.missions || [];
  },

  async createMission(name?: string, seed: number = 1337, id?: string): Promise<MissionSummary> {
    const res = await fetch(`${API_BASE}/missions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, seed, id }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.mission;
  },

  async getMission(id: string): Promise<MissionSummary> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.mission;
  },

  async getTelemetry(id: string): Promise<{
    current: RoverTelemetry;
    history: TelemetryHistoryPoint[];
    trail?: { x: number; y: number; tick: number }[];
  }> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/telemetry`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getHazards(id: string): Promise<{ active: DetectedHazard[]; configs: Record<HazardType, any> }> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/hazards`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { active: data.active || [], configs: data.configs || {} };
  },

  async updateHazardConfig(id: string, type: HazardType, config: any): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/hazards/${encodeURIComponent(type)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getRisk(id: string): Promise<RiskAssessment> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/risk`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.risk;
  },

  async getDecisions(id: string, category?: string): Promise<{ recent: any | null; logs: LogEntry[] }> {
    const url = category && category !== 'ALL'
      ? `${API_BASE}/missions/${encodeURIComponent(id)}/decisions?category=${encodeURIComponent(category)}`
      : `${API_BASE}/missions/${encodeURIComponent(id)}/decisions`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { recent: data.recentDecision, logs: data.logs || [] };
  },

  async stepMission(id: string, count: number = 1, dt: number = 1.0): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count, dt }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async startMission(id: string, speedMultiplier: number = 1): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speedMultiplier }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async pauseMission(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/pause`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async injectScenario(id: string, scenarioId: ScenarioId): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async clearFaults(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/scenarios/clear`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async executeMitigation(id: string, hazardType?: HazardType): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/mitigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazardType }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async resetMission(id: string, seed: number = 1337): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async replayMission(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/replay`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async askAssistant(id: string, query: string, apiKey?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${encodeURIComponent(id)}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, apiKey }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async getBenchmark(): Promise<any> {
    const res = await fetch(`${API_BASE}/benchmark`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async runBenchmark(seedsCount: number = 50, horizonSteps: number = 100): Promise<any> {
    const res = await fetch(`${API_BASE}/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seedsCount, horizonSteps }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  },

  async listDevices(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/devices`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return [];
      const data = await res.json();
      return data.devices || [];
    } catch {
      return [];
    }
  },

  async getDevice(roverId: string): Promise<any | null> {
    try {
      const res = await fetch(`${API_BASE}/devices/${encodeURIComponent(roverId)}`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      const data = await res.json();
      return data.device || null;
    } catch {
      return null;
    }
  },
};
