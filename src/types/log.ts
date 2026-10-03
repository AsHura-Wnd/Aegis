import { HazardSeverity } from './hazard';

export type LogCategory =
  | 'HAZARD'
  | 'DECISION'
  | 'SCENARIO'
  | 'MODE_CHANGE'
  | 'SYSTEM';

export interface LogEntry {
  id: string;
  tick: number;
  time: string; // e.g. "MET 00:03:42"
  timestamp: number; // Date.now()
  category: LogCategory;
  severity: HazardSeverity;
  title: string;
  description: string;
  recommendedAction?: string;
  telemetrySnapshot?: Record<string, string | number>;
  source: 'HAZARD_ENGINE' | 'RISK_ENGINE' | 'SCENARIO_INJECTOR' | 'AUTONOMOUS_EXECUTIVE' | 'OPERATOR' | 'SYSTEM';
}
