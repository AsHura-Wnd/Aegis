import { HazardSeverity, HazardType } from './hazard';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RiskDriver {
  hazardType: HazardType;
  hazardName: string;
  severity: HazardSeverity;
  contributionPoints: number; // e.g. +35 pts
  description: string;
}

export interface RiskAssessment {
  currentScore: number; // 0 to 100
  previousScore: number;
  delta: number; // current - previous
  riskLevel: RiskLevel;
  primaryConcern: string;
  reasonForChange: string;
  compoundingFactors: string[];
  drivers: RiskDriver[];
  updatedAtTick: number;
  updatedAtTime: string;
}

export interface RiskHistoryPoint {
  tick: number;
  time: string;
  score: number;
  level: RiskLevel;
  activeHazardCount: number;
}
