import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getProfile,
  updateAddress,
  changePin,
  forgotPin,
  resetPinWithOtp,
  deleteOwnAccount,
  uploadAvatar,
  deleteAvatar,
} from '../controllers/profileController.js';
import { imageUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect); // self-service only — all operations target req.user._id

router.get('/', getProfile);
router.patch('/address', updateAddress);
router.patch('/pin', changePin);
router.post('/forgot-pin', forgotPin);
router.post('/reset-pin', resetPinWithOtp);
router.patch('/avatar', imageUpload('image'), uploadAvatar);
router.delete('/avatar', deleteAvatar);
router.delete('/', deleteOwnAccount);

export default router;
