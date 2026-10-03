import { Router, Request, Response } from 'express';
import { benchmarkEngine } from '../services/benchmarkService';

export const benchmarkRouter = Router();

// Run Headless Benchmark across N seeded missions
benchmarkRouter.post('/', (req: Request, res: Response) => {
  const numMissions = Math.min(100, Math.max(5, Number(req.body?.numMissions) || 25));
  const ticksPerMission = Math.min(100, Math.max(10, Number(req.body?.ticksPerMission) || 30));

  try {
    const results = benchmarkEngine.runBenchmark(numMissions, ticksPerMission);
    res.json({
      message: `Headless benchmark executed across ${numMissions} seeded Mars rover missions`,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET default cached/baseline benchmark metrics
benchmarkRouter.get('/', (_req: Request, res: Response) => {
  const results = benchmarkEngine.runBenchmark(20, 25);
  res.json({ results });
});
