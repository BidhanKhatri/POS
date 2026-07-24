import crypto from 'crypto';

// Replay protection window — an EMS-signed request older than this is rejected
// even with a valid signature, so a captured payload can't be replayed later.
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

/**
 * Verifies inbound EMS attendance webhook requests via HMAC-SHA256 over the
 * raw request body (req.rawBody, captured by app.js's express.json({verify})
 * hook) using EMS_WEBHOOK_SECRET — a secret distinct from STAFFING_API_TOKEN
 * (that one authenticates POS's outbound calls to EMS; this one authenticates
 * EMS's inbound calls to POS).
 *
 * Expected headers:
 *   X-Ems-Timestamp: <ms since epoch when EMS signed the request>
 *   X-Ems-Signature: <hex HMAC-SHA256 of `${timestamp}.${rawBody}`>
 */
const emsWebhookAuth = (req, res, next) => {
  const secret = process.env.EMS_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'EMS_WEBHOOK_SECRET is not configured on the POS server' });
  }

  const signature = req.headers['x-ems-signature'];
  const timestamp = req.headers['x-ems-timestamp'];

  if (!signature || !timestamp) {
    return res.status(401).json({ message: 'Missing X-Ems-Signature or X-Ems-Timestamp header' });
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_TIMESTAMP_SKEW_MS) {
    return res.status(401).json({ message: 'Request timestamp is missing, invalid, or too old' });
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${req.rawBody ?? ''}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(String(signature), 'hex');

  const valid = expectedBuf.length === providedBuf.length
    && crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!valid) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  next();
};

export default emsWebhookAuth;
