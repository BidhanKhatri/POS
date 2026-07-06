import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import {
  listModules,
  requestOtp,
  backupModule,
  deleteModule,
  listBackups,
  downloadBackup,
  restoreBackup,
  listAuditLogs,
} from '../controllers/databaseManagementController.js';

const router = express.Router();

// Manager/Admin only — every route in this file can touch live business data.
router.use(protect, managerOrAdmin);

router.get('/modules', listModules);
router.post('/otp/request', requestOtp);

router.post('/:module/backup', backupModule);
router.post('/:module/delete', deleteModule);

router.get('/backups', listBackups);
router.get('/backups/:id/download', downloadBackup);
router.post('/backups/:id/restore', restoreBackup);

router.get('/audit-logs', listAuditLogs);

export default router;
