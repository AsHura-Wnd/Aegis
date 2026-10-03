import { Router, Request, Response } from 'express';
import { missionService } from '../services/missionService';
import { SCENARIO_CATALOG } from '../../simulation/scenarioDefinitions';
import { DEFAULT_HAZARD_CONFIGS } from '../../engines/hazardEngine';
import { ScenarioId } from '../../types/scenario';
import { HazardType } from '../../types/hazard';

export const missionRouter = Router();

// Middleware to resolve mission
const getMissionOr404 = (req: Request, res: Response) => {
  const missionId = String(req.params.id);
  const mission = missionService.getMission(missionId);
  if (!mission) {
    res.status(404).json({
      error: 'Mission not found',
      missionId,
      availableMissions: missionService.listMissions().map((m) => m.id),
    });
    return null;
  }
  return mission;
};

// 1. List all missions
missionRouter.get('/', (_req: Request, res: Response) => {
  const missions = missionService.listMissions();
  res.json({ missions });
});

// 2. Create a new mission
missionRouter.post('/', (req: Request, res: Response) => {
  const { name, seed, id } = req.body || {};
  if (seed !== undefined && isNaN(Number(seed))) {
    res.status(400).json({ error: "Invalid 'seed' provided; must be a valid number" });
    return;
  }
  const safeSeed = (seed !== undefined && !isNaN(Number(seed))) ? Math.floor(Number(seed)) : 1337;
  const newMission = missionService.createMission(
    name ? String(name).trim() : undefined,
    safeSeed,
    id ? String(id).trim() : undefined
  );
  res.status(201).json({
    message: 'Mission created successfully',
    mission: newMission.getMetadata(),
  });
});

// 3. Get single mission metadata
missionRouter.get('/:id', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;
  res.json({ mission: mission.getMetadata() });
});

// 4. Delete a mission
missionRouter.delete('/:id', (req: Request, res: Response) => {
  const missionId = String(req.params.id);
  const deleted = missionService.deleteMission(missionId);
  if (!deleted) {
    res.status(404).json({ error: 'Mission not found', missionId });
    return;
  }
  res.json({ message: 'Mission deleted', missionId });
});

// 5. Advance simulation by N ticks
missionRouter.post('/:id/step', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const count = Math.min(100, Math.max(1, Number(req.body?.count) || 1));
  const dt = Number(req.body?.dt) || 1.0;

  let lastTelemetry = null;
  for (let i = 0; i < count; i++) {
    lastTelemetry = mission.step(dt);
  }

  res.json({
    message: `Advanced simulation by ${count} tick(s)`,
    ticksExecuted: count,
    telemetry: lastTelemetry,
    risk: mission.getRisk(),
    activeHazards: mission.getHazards().active,
  });
});

// 6. Start continuous ticking
missionRouter.post('/:id/start', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const rawSpeed = Number(req.body?.speedMultiplier);
  const speed = (!isNaN(rawSpeed) && rawSpeed > 0) ? Math.min(10, Math.max(0.2, rawSpeed)) : 1;
  mission.start(speed);

  res.json({
    message: `Mission running at ${speed}x speed`,
    mission: mission.getMetadata(),
  });
});

// 7. Pause simulation
missionRouter.post('/:id/pause', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  mission.pause();
  res.json({
    message: 'Mission paused',
    mission: mission.getMetadata(),
  });
});

// 8. Telemetry endpoint
missionRouter.get('/:id/telemetry', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const { current, history } = mission.getTelemetry();
  res.json({ current, history });
});

// 9. Hazards endpoint
missionRouter.get('/:id/hazards', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const { active, configs } = mission.getHazards();
  res.json({ activeCount: active.length, active, configs });
});

// 10. Update hazard rule configuration
missionRouter.put('/:id/hazards/:type', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const hazardType = req.params.type as HazardType;
  if (!Object.keys(DEFAULT_HAZARD_CONFIGS).includes(hazardType)) {
    res.status(400).json({
      error: `Unknown hazard rule type: '${hazardType}'`,
      validTypes: Object.keys(DEFAULT_HAZARD_CONFIGS),
    });
    return;
  }

  mission.updateHazardConfig(hazardType, req.body || {});

  res.json({
    message: `Updated hazard config for ${hazardType}`,
    hazards: mission.getHazards(),
  });
});

// 11. Dynamic Risk Assessment
missionRouter.get('/:id/risk', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const risk = mission.getRisk();
  res.json({ risk });
});

// 12. List available scenarios
missionRouter.get('/:id/scenarios', (_req: Request, res: Response) => {
  res.json({
    scenarios: Object.values(SCENARIO_CATALOG),
  });
});

// 13. Inject scenario
missionRouter.post('/:id/scenarios', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const scenarioId = req.body?.scenarioId as ScenarioId;
  if (!scenarioId || !SCENARIO_CATALOG[scenarioId]) {
    res.status(400).json({
      error: 'Invalid scenarioId',
      validScenarios: Object.keys(SCENARIO_CATALOG),
    });
    return;
  }

  try {
    const result = mission.injectScenario(scenarioId);
    res.json({
      message: `Scenario '${scenarioId}' successfully injected`,
      activeScenario: result.scenario,
      telemetry: result.telemetry,
      risk: result.risk,
      activeHazards: mission.getHazards().active,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Clear all faults
missionRouter.post('/:id/scenarios/clear', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  mission.clearFaults();
  res.json({
    message: 'All faults cleared. Subsystems commanded to nominal.',
    telemetry: mission.getTelemetry().current,
    risk: mission.getRisk(),
    activeHazards: mission.getHazards().active,
  });
});

// 15. Execute Autonomous Mitigation
missionRouter.post('/:id/mitigate', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const hazardType = req.body?.hazardType as HazardType | undefined;
  if (hazardType && !Object.keys(DEFAULT_HAZARD_CONFIGS).includes(hazardType)) {
    res.status(400).json({
      error: `Unknown hazardType '${hazardType}'`,
      validTypes: Object.keys(DEFAULT_HAZARD_CONFIGS),
    });
    return;
  }

  const result = mission.executeMitigation(hazardType);

  res.json({
    message: 'Autonomous mitigation executed',
    actionTaken: result.action,
    telemetry: result.telemetry,
    risk: result.risk,
    activeHazards: mission.getHazards().active,
  });
});

// 16. Decision and Event Logs
missionRouter.get('/:id/decisions', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const { recent, logs } = mission.getDecisions();
  const category = req.query.category as string | undefined;

  const filteredLogs = category && category !== 'ALL'
    ? logs.filter((l) => l.category === category)
    : logs;

  res.json({
    recentDecision: recent,
    totalLogs: filteredLogs.length,
    logs: filteredLogs,
  });
});

// 17. Context-Aware AI Mission Assistant
missionRouter.post('/:id/assistant', async (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  const query = req.body?.query;
  if (!query || typeof query !== 'string' || !query.trim()) {
    res.status(400).json({ error: "Missing or empty 'query' string in request body" });
    return;
  }

  const apiKey = req.body?.apiKey;
  if (apiKey && typeof apiKey === 'string') {
    mission.setApiKey(apiKey);
  }

  try {
    const response = await mission.askAssistant(query.trim());
    res.json({ query: query.trim(), response });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. Reset mission
missionRouter.post('/:id/reset', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  let seed: number | undefined = undefined;
  if (req.body?.seed !== undefined) {
    const parsed = Number(req.body.seed);
    if (isNaN(parsed)) {
      res.status(400).json({ error: "Invalid 'seed' provided; must be a valid number" });
      return;
    }
    seed = Math.floor(parsed);
  }

  mission.reset(seed);

  res.json({
    message: 'Mission reset successfully',
    mission: mission.getMetadata(),
    telemetry: mission.getTelemetry().current,
    risk: mission.getRisk(),
  });
});

// 19. Replay mission
missionRouter.post('/:id/replay', (req: Request, res: Response) => {
  const mission = getMissionOr404(req, res);
  if (!mission) return;

  mission.replay();
  res.json({
    message: 'Mission replaying from tick 0',
    mission: mission.getMetadata(),
  });
});
