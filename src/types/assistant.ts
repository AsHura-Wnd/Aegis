import { DetectedHazard } from './hazard';
import { RiskAssessment } from './risk';
import { RoverTelemetry } from './telemetry';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  referencedTelemetry?: Record<string, string | number>;
  referencedHazards?: string[];
  recommendedAction?: string;
  sourceType: 'DETERMINISTIC_RULES' | 'GEMINI_LLM';
}

export interface AssistantContext {
  telemetry: RoverTelemetry;
  activeHazards: DetectedHazard[];
  risk: RiskAssessment;
  lastDecision?: string;
  missionName: string;
}

export interface QuickPrompt {
  id: string;
  label: string;
  query: string;
  category: 'SAFETY' | 'DIAGNOSTIC' | 'RECOMMENDATION' | 'STATUS';
}
