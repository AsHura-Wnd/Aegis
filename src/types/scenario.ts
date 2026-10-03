export type ScenarioId =
  | 'LOW_BATTERY'
  | 'ROVER_STUCK'
  | 'COMM_LOSS'
  | 'EXTREME_TEMP'
  | 'SOLAR_DUST'
  | 'HAZARDOUS_TERRAIN';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  shortDesc: string;
  fullDesc: string;
  expectedHazards: string[];
  expectedRiskLevel: 'MODERATE' | 'HIGH' | 'CRITICAL';
  suggestedMitigation: string;
  icon: string;
}

export interface ActiveScenarioState {
  id: ScenarioId;
  name: string;
  injectedAtTick: number;
  injectedAtTime: string;
  autoRecoveryTicksRemaining?: number;
  params?: Record<string, number | boolean | string>;
}
