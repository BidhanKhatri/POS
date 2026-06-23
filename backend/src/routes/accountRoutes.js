import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import { listAccounts, updateAccountStatus, createManagerAccount, deleteAccount } from '../controllers/accountController.js';

const router = express.Router();

router.use(protect, managerOrAdmin);

router.get('/', listAccounts);
router.post('/manager', createManagerAccount);
router.patch('/:id/status', updateAccountStatus);
router.delete('/:id', deleteAccount);

export default router;
