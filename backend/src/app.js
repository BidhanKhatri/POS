import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import routes from './routes/index.js';

const app = express();

// ── Trust Proxy ────────────────────────────────────────────────────────────────
// Required when running behind Nginx (or any reverse proxy).
// Without this, express-rate-limit throws a ValidationError because
// X-Forwarded-For is set but trust proxy is false.
// '1' means trust the first proxy hop (Nginx), which is the standard VPS setup.
app.set('trust proxy', 1);

// ── CORS origin list ───────────────────────────────────────────────────────────
// Populated from CORS_ORIGINS env var (comma-separated).
// Falls back to localhost dev ports so the server works without a .env file.
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175',
      'http://192.168.1.95:5173',
      'http://192.168.1.95:5174',
      'http://192.168.1.95:5175',
    ];

// Ngrok pattern — always allowed for local HTTPS mobile testing
const NGROK_RE = /^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(?:app|dev|io)$/;

/**
 * Shared origin-validation function used by both Express CORS middleware
 * and Socket.IO so the two are always in sync.
 *
 * @param {string|undefined} origin
 * @returns {boolean}
 */
export function isOriginAllowed(origin) {
  if (!origin) return true;                  // same-origin / server-to-server calls
  if (envOrigins.includes(origin)) return true;
  if (NGROK_RE.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
// Generous limit — report pages fire 6+ concurrent queries.
// trust proxy (set above) ensures the real client IP is read from
// X-Forwarded-For rather than the Nginx proxy IP.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use('/api', limiter);

// ── Body Parser ────────────────────────────────────────────────────────────────
// `verify` stashes the raw request bytes on req.rawBody — needed by
// emsWebhookAuth to compute/compare the HMAC signature over the exact bytes
// EMS signed (JSON.stringify of the parsed body is not guaranteed to match
// byte-for-byte). No effect on any other route.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Error Handling ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
