import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shift from '../models/Shift.js';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-pinHash');

      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'Not authorized, user inactive or not found' });
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const managerOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a manager' });
  }
};

/**
 * Require an open (clocked-in) shift to process transactions.
 * Managers and Admins bypass this check — they are not shift-bound.
 * Attaches `req.activeShift` for downstream use.
 */
const requireActiveShift = async (req, res, next) => {
  if (req.user.role === 'Admin' || req.user.role === 'Manager') return next();
  try {
    const shift = await Shift.findOne({ employeeId: req.user._id, status: 'OPEN' });
    if (!shift) {
      return res.status(403).json({
        success: false,
        code: 'NO_ACTIVE_SHIFT',
        message: 'You must be clocked in to process transactions.',
      });
    }
    req.activeShift = shift;
    next();
  } catch (err) {
    next(err);
  }
};

export { protect, admin, managerOrAdmin, requireActiveShift };
