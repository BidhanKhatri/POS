import * as authService from '../services/authService.js';
import { Webhook } from 'svix';

const login = async (req, res, next) => {
  try {
    const { email, pin } = req.body;
    if (!email || !pin) {
      res.status(400);
      throw new Error('Please provide email and PIN');
    }

    const user = await authService.loginUser(email, pin);
    res.status(200).json(user);


  } catch (error) {
    next(error);
  }
};

const signup = async (req, res, next) => {
  try {
    const { name, email, pin, role } = req.body;

    if (!name || !pin) {
      res.status(400);
      throw new Error('Please provide name and pin');
    }

    if (!/^\d{4}$/.test(pin)) {
      res.status(400);
      throw new Error('PIN must be exactly 4 digits');
    }

    const user = await authService.registerUser({ name, email, pin, role });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

const syncClerkUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const user = await authService.syncCurrentClerkUser(token);
    res.status(200).json(user);
  } catch (error) {
    res.status(error.statusCode || 401);
    next(error);
  }
};

const clerkWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!webhookSecret) {
      res.status(500);
      throw new Error('CLERK_WEBHOOK_SECRET is not configured in backend/.env');
    }

    const svixHeaders = {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    };

    const payload = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    const event = new Webhook(webhookSecret).verify(payload, svixHeaders);

    if (['user.created', 'user.updated'].includes(event.type)) {
      const user = await authService.upsertClerkUser(event.data);
      return res.status(200).json({ received: true, user });
    }

    if (event.type === 'user.deleted') {
      const user = await authService.deactivateClerkUser(event.data?.id);
      return res.status(200).json({ received: true, user });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    if (res.statusCode < 400) {
      res.status(400);
    }
    next(error);
  }
};

export { login, signup, syncClerkUser, clerkWebhook };
