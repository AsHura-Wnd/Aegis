import { app } from './app';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 AEGIS Autonomous Mission Intelligence Backend`);
  console.log(`🛰️ Server listening at: http://localhost:${PORT}`);
  console.log(`🩺 Health check:        http://localhost:${PORT}/api/health`);
  console.log(`📋 Mission list:        http://localhost:${PORT}/api/missions`);
  console.log(`📊 Headless benchmark:  http://localhost:${PORT}/api/benchmark`);
  console.log(`======================================================\n`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('\n[AEGIS] Shutting down backend server...');
  server.close(() => {
    console.log('[AEGIS] Server closed. Mission instances cleaned up.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
