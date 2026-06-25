import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateAddress,
  changePin,
  forgotPin,
  resetPinWithOtp,
  deleteOwnAccount,
} from '../controllers/profileController.js';

const router = express.Router();

router.use(protect); // self-service only — all operations target req.user._id

router.get('/', getProfile);
router.patch('/address', updateAddress);
router.patch('/pin', changePin);
router.post('/forgot-pin', forgotPin);
router.post('/reset-pin', resetPinWithOtp);
router.delete('/', deleteOwnAccount);

export default router;
