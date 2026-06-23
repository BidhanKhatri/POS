import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const VALID_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'];
const PROTECTED_ROLES = ['Manager', 'Admin'];

const generateEmployeeCode = async (name, email) => {
  const source = email ? email.split('@')[0] : name;
  const base = String(source).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'MGR';
  let code = base;
  let counter = 1;
  while (await User.exists({ employeeCode: code })) {
    const suffix = String(counter).padStart(2, '0');
    code = `${base.slice(0, 10)}${suffix}`;
    counter += 1;
  }
  return code;
};

/**
 * GET /api/accounts
 * Query: status=PENDING|ACTIVE|REJECTED|SUSPENDED (default: all)
 * Access: Manager, Admin
 */
export const listAccounts = async (req, res, next) => {
  try {
    const { status, role } = req.query;
    const filter = { authProvider: 'local' };
    if (status && VALID_STATUSES.includes(status)) filter.status = status;
    if (role) filter.role = { $in: role.split(',') };

    const users = await User.find(filter)
      .select('name email employeeCode role status isActive staffingBetitEmployeeId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/accounts/:id/status
 * Body: { status: 'ACTIVE' | 'REJECTED' | 'SUSPENDED' }
 * Access: Manager, Admin
 *
 * Syncs isActive so the existing protect middleware stays correct:
 *   ACTIVE   → isActive: true
 *   anything → isActive: false
 */
export const updateAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    // Prevent self-modification
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot change your own account status.' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status, isActive: status === 'ACTIVE' } },
      { new: true, runValidators: true }
    ).select('name email employeeCode role status isActive');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/accounts/manager
 * Body: { name, email, pin }
 * Creates a Manager account directly — no EMS check, no email verification.
 * Access: Manager, Admin
 */
export const createManagerAccount = async (req, res, next) => {
  try {
    const { name, email, pin } = req.body;

    if (!name || !email || !pin) {
      return res.status(400).json({ message: 'name, email, and pin are required.' });
    }
    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ message: 'PIN must be exactly 4 digits.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const employeeCode = await generateEmployeeCode(name, normalizedEmail);
    const user = await User.create({
      employeeCode,
      name: name.trim(),
      email: normalizedEmail,
      role: 'Manager',
      authProvider: 'local',
      pinHash: pin,   // pre-save hook hashes once
      status: 'ACTIVE',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        employeeCode: user.employeeCode,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/accounts/:id
 * Body: { pin: string }  — manager's own PIN for confirmation
 * Access: Manager, Admin
 *
 * Cannot delete Manager/Admin accounts or self.
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: 'Manager PIN is required to delete an account.' });
    }

    // Verify manager PIN
    const manager = await User.findById(req.user._id).select('+pinHash');
    if (!manager) return res.status(401).json({ message: 'Manager not found.' });
    const pinValid = await bcrypt.compare(String(pin), manager.pinHash);
    if (!pinValid) return res.status(401).json({ message: 'Incorrect manager PIN.' });

    // Prevent self-deletion
    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    // Admins cannot be deleted via this endpoint
    if (target.role === 'Admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted.' });
    }

    await User.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Account deleted.' });
  } catch (error) {
    next(error);
  }
};
