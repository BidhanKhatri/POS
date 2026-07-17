// .env is loaded by Node's --env-file flag before any module evaluates.
// Do NOT use dotenv.config() here — in ESM all imports are hoisted, so
// dotenv.config() would run AFTER app.js has already read process.env.
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './config/db.js';
import { initCronJobs } from './cron/index.js';
import { initSocket } from './socket/index.js';

// Connect to Database first, then register cron jobs.
// Cron jobs must not run before mongoose is ready — they fire live aggregations.
connectDB();

mongoose.connection.once('open', () => {
  if (process.env.DISABLE_CRON !== 'true') {
    initCronJobs();
  }
});

const PORT = process.env.PORT || 5002;
const HOST = process.env.HOST || '0.0.0.0';

// Attach Socket.IO to the same HTTP server so it shares the port with Express
const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Log unhandled promise rejections and uncaught exceptions instead of
// crashing the whole process. A single stray rejection (a slow query, a
// flaky external call, a rate-limited client retrying aggressively) must
// never take down every logged-in user's session — only the one request/
// operation that actually failed should be affected. The process stays up;
// individual failures are still visible in the logs for investigation.
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
