import { app, env } from './app.js';
const server = app.listen(env.port, () => console.log(`SOFOL API listening on port ${env.port} (${env.nodeEnv})`));
function shutdown(signal) { console.log(`${signal} received. Closing SOFOL API.`); server.close(() => process.exit(0)); }
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));