import express from 'express';
import { protect, managerOrAdmin } from '../middleware/authMiddleware.js';
import { list, search, analytics, detail, purchases, refunds, update, remove, backfill } from '../controllers/customerController.js';

const router = express.Router();

// Named routes before /:id to avoid param capture
router.get('/search',    protect,                search);
router.get('/analytics', protect, managerOrAdmin, analytics);
router.get('/',          protect,                list);
// Backfill: links all historical sales to auto-created customer records
router.post('/backfill', protect, managerOrAdmin, backfill);

// Sub-resource routes
router.get('/:id/purchases', protect, purchases);
router.get('/:id/refunds',   protect, refunds);
router.get('/:id',           protect, detail);

// Write operations — manager / admin only
router.put('/:id',    protect, managerOrAdmin, update);
router.delete('/:id', protect, managerOrAdmin, remove);

export default router;
