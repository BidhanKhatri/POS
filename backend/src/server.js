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

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Attach Socket.IO to the same HTTP server so it shares the port with Express
const httpServer = http.createServer(app);
initSocket(httpServer);

const server = httpServer.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
