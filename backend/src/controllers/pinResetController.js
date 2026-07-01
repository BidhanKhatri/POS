import * as pinResetService from '../services/pinResetService.js';

export const requestOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    await pinResetService.requestOtp(email, req.ip);
    // Generic response regardless of whether the email exists — prevents user enumeration
    res.json({ message: 'If this email is registered, a code has been sent.' });
  } catch (err) {
    if (err.statusCode === 429) return res.status(429).json({ message: err.message });
    next(err);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and code are required.' });
    const resetToken = await pinResetService.verifyOtp(email, otp);
    res.json({ resetToken });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};

export const resetPin = async (req, res, next) => {
  try {
    const { email, resetToken, newPin } = req.body;
    if (!email || !resetToken || !newPin) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    await pinResetService.resetPin(email, resetToken, newPin, req.ip);
    res.json({ message: 'PIN updated. Please log in with your new PIN.' });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
    next(err);
  }
};
