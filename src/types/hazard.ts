export type HazardSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type HazardType =
  | 'LOW_BATTERY'
  | 'OVERHEATING'
  | 'EXTREME_COLD'
  | 'WHEEL_SLIP'
  | 'ROVER_STUCK'
  | 'SOLAR_PANEL_DEGRADATION'
  | 'WEAK_COMMUNICATION'
  | 'DANGEROUS_TERRAIN'
  | 'RAPID_POWER_DRAIN';

export interface RelevantTelemetryMetric {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  threshold: number | string;
}

export interface DetectedHazard {
  id: string; // e.g. 'HAZ-LOW_BATTERY-102'
  hazardType: HazardType;
  hazardName: string;
  severity: HazardSeverity;
  reason: string;
  relevantTelemetry: RelevantTelemetryMetric[];
  recommendedAction: string;
  detectedAtTick: number;
  detectedAtTime: string;
  isActive: boolean;
  isMitigated: boolean;
}

export interface HazardRuleConfig {
  hazardType: HazardType;
  hazardName: string;
  description: string;
  category: 'POWER' | 'THERMAL' | 'MOBILITY' | 'COMMUNICATION' | 'ENVIRONMENT';
  lowThreshold?: number;
  moderateThreshold?: number;
  highThreshold?: number;
  criticalThreshold?: number;
  enabled: boolean;
  defaultAction: string;
}
