import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import PinResetOtp from '../models/PinResetOtp.js';
import { sendOtpEmail } from '../services/emailService.js';

// GET /api/profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('name email employeeCode role address createdAt');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/profile/address
export const updateAddress = async (req, res, next) => {
  try {
    const { address } = req.body;
    if (typeof address !== 'string') {
      return res.status(400).json({ message: 'address must be a string.' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { address: address.trim() } },
      { new: true }
    ).select('name email employeeCode role address');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// PATCH /api/profile/pin
export const changePin = async (req, res, next) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      return res.status(400).json({ message: 'currentPin and newPin are required.' });
    }
    if (!/^\d{4}$/.test(String(newPin))) {
      return res.status(400).json({ message: 'New PIN must be exactly 4 digits.' });
    }
    if (String(currentPin) === String(newPin)) {
      return res.status(400).json({ message: 'New PIN must be different from current PIN.' });
    }

    const user = await User.findById(req.user._id).select('+pinHash');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const valid = await bcrypt.compare(String(currentPin), user.pinHash);
    if (!valid) return res.status(401).json({ message: 'Current PIN is incorrect.' });

    user.pinHash = newPin; // pre-save hook hashes
    await user.save();

    res.json({ success: true, message: 'PIN changed successfully.' });
  } catch (err) { next(err); }
};

// POST /api/profile/forgot-pin  — sends OTP to manager's email
export const forgotPin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('email name');
    if (!user?.email) {
      return res.status(400).json({ message: 'No email address is linked to this account.' });
    }

    // Cooldown: reject if OTP was sent less than 60 s ago
    const existing = await PinResetOtp.findOne({ userId: user._id });
    if (existing) {
      const ageMs = Date.now() - existing.createdAt.getTime();
      if (ageMs < 60_000) {
        const waitSec = Math.ceil((60_000 - ageMs) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSec}s before requesting another OTP.`,
        });
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100_000 + Math.random() * 900_000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await PinResetOtp.findOneAndReplace(
      { userId: user._id },
      { userId: user._id, otpHash, expiresAt },
      { upsert: true, new: true }
    );

    await sendOtpEmail({ to: user.email, name: user.name, otp });

    // Mask email for display: k*****@gmail.com
    const [local, domain] = user.email.split('@');
    const masked = `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;

    res.json({ success: true, message: `OTP sent to ${masked}. Expires in 2 minutes.` });
  } catch (err) { next(err); }
};

// POST /api/profile/reset-pin  — verify OTP and set new PIN
export const resetPinWithOtp = async (req, res, next) => {
  try {
    const { otp, newPin } = req.body;
    if (!otp || !newPin) {
      return res.status(400).json({ message: 'otp and newPin are required.' });
    }
    if (!/^\d{4}$/.test(String(newPin))) {
      return res.status(400).json({ message: 'New PIN must be exactly 4 digits.' });
    }

    const record = await PinResetOtp.findOne({ userId: req.user._id });
    if (!record) {
      return res.status(400).json({ message: 'No active OTP. Please request a new one.' });
    }
    if (record.expiresAt < new Date()) {
      await PinResetOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    const valid = await bcrypt.compare(String(otp), record.otpHash);
    if (!valid) return res.status(401).json({ message: 'Invalid OTP. Please try again.' });

    // Consume OTP (single-use)
    await PinResetOtp.deleteOne({ _id: record._id });

    const user = await User.findById(req.user._id).select('+pinHash');
    user.pinHash = newPin;
    await user.save();

    res.json({ success: true, message: 'PIN reset successfully.' });
  } catch (err) { next(err); }
};

// DELETE /api/profile  — self-deletion with PIN confirmation
export const deleteOwnAccount = async (req, res, next) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ message: 'PIN is required to delete your account.' });

    const user = await User.findById(req.user._id).select('+pinHash');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const valid = await bcrypt.compare(String(pin), user.pinHash);
    if (!valid) return res.status(401).json({ message: 'Incorrect PIN.' });

    await User.findByIdAndDelete(req.user._id);

    res.json({ success: true, message: 'Your account has been deleted.' });
  } catch (err) { next(err); }
};
