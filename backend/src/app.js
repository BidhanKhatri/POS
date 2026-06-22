import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import routes from './routes/index.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  // LAN access for mobile/Chrome testing
  'http://192.168.1.95:5173',
  'http://192.168.1.95:5174',
  'http://192.168.1.95:5175',
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Allow any ngrok tunnel (for local HTTPS mobile testing)
    if (/^https:\/\/[a-z0-9-]+\.ngrok(-free)?\.(?:app|dev|io)$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));

// Rate Limiting — generous limit; report pages fire 6+ concurrent queries
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
app.use('/api', limiter);

// Clerk webhooks require the raw request body for Svix signature verification.
app.use('/api/auth/clerk/webhook', express.raw({ type: 'application/json' }));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
