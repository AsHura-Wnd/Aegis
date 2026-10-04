import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { missionRouter } from './routes/missionRoutes';
import { benchmarkRouter } from './routes/benchmarkRoutes';
import { telemetryRouter, deviceRouter } from './routes/ingestionRoutes';
import { missionService } from './services/missionService';

export const app = express();

// CORS Configuration: Restrict browser origins in production while allowing non-browser clients (microcontrollers/curl)
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Requests with no origin (e.g. mobile apps, curl, ESP32 microcontrollers) are allowed
    if (!origin) return callback(null, true);

    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
        : [
            process.env.FRONTEND_URL || 'https://aegis-mission-control.vercel.app',
            'https://aegis-rover.vercel.app',
          ];

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Token'],
};

app.use(cors(corsOptions));

app.use(express.json());

// Request logger for development / testing
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[AEGIS-API] ${req.method} ${req.url}`);
  }
  next();
});

// System Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    service: 'AEGIS Autonomous Planetary Rover Intelligence Backend',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    activeMissionsCount: missionService.listMissions().length,
  });
});

// API Routes
app.use('/api/missions', missionRouter);
app.use('/api/benchmark', benchmarkRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/devices', deviceRouter);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/missions',
      'POST /api/missions',
      'GET /api/missions/:id',
      'POST /api/missions/:id/step',
      'POST /api/missions/:id/start',
      'POST /api/missions/:id/pause',
      'GET /api/missions/:id/telemetry',
      'GET /api/missions/:id/hazards',
      'PUT /api/missions/:id/hazards/:type',
      'GET /api/missions/:id/risk',
      'GET /api/missions/:id/scenarios',
      'POST /api/missions/:id/scenarios',
      'POST /api/missions/:id/scenarios/clear',
      'POST /api/missions/:id/mitigate',
      'GET /api/missions/:id/decisions',
      'POST /api/missions/:id/assistant',
      'POST /api/missions/:id/reset',
      'POST /api/missions/:id/replay',
      'POST /api/benchmark',
      'POST /api/telemetry/ingest',
      'GET /api/devices',
      'GET /api/devices/:roverId',
      'POST /api/devices/:roverId/reset',
    ],
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[AEGIS-ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});
