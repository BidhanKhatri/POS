/**
 * databaseManagementService.js
 * Core logic for Manager Settings → Database Management: categorized
 * backup / delete / restore of specific data modules, with mandatory
 * pre-delete backups, OTP + typed-phrase confirmation, and immutable
 * audit logging (reuses the existing generic AuditLog model).
 *
 * Backup storage: MongoDB GridFS (same Atlas cluster, no new infra/deps).
 * Each backup is a gzip-compressed JSON export of the matched documents.
 * Restore uses Model.insertMany() (not the raw driver) so Mongoose casts
 * string _id/date fields from the JSON round-trip back to ObjectId/Date —
 * this is what makes JSON-based export/import safe without a BSON dependency.
 *
 * Follows Route → Controller → Service → Model (AGENTS.md).
 */

import mongoose from 'mongoose';
import zlib from 'zlib';
import { promisify } from 'util';

import Sale from '../models/Sale.js';
import Payment from '../models/Payment.js';
import ReportLog from '../models/ReportLog.js';
import DailyReport from '../models/DailyReport.js';
import ManagerOverride from '../models/ManagerOverride.js';
import User from '../models/User.js';
import Shift from '../models/Shift.js';
import PosSchedule from '../models/PosSchedule.js';
import GroupSync from '../models/GroupSync.js';
import Group from '../models/Group.js';
import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import DatabaseBackup from '../models/DatabaseBackup.js';
import AuditLog from '../models/AuditLog.js';

import { clearCache as clearReportCache } from './reportService.js';
import { clearCache as clearGroupReportCache } from './groupReportService.js';
import { clearAllCache as clearStaffingCache } from './staffingService.js';
import { verifyDatabaseActionOtp } from './databaseActionOtpService.js';

const gzip   = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const GRIDFS_BUCKET = 'db_backups';
const CONFIRMATION_PHRASE = 'DELETE';

// ─── Module registry ──────────────────────────────────────────────────────────
// `filter` is a hardcoded safety rail, never client-configurable:
//   - employees only ever targets role:'Employee' (Admin/Manager accounts are
//     never reachable through this tool, no matter what a caller requests).
//   - schedules only targets CLOSED shifts — an employee currently clocked in
//     is never affected.
const MODULE_REGISTRY = {
  dashboardCache: { label: 'Dashboard Cache', clearOnly: true },
  transactions:   { label: 'Transactions',    targets: [{ model: Sale }, { model: Payment }] },
  reports:        { label: 'Reports',         targets: [{ model: ReportLog }, { model: DailyReport }] },
  overrides:      { label: 'Overrides',       targets: [{ model: ManagerOverride }] },
  employees:      { label: 'Employees',       targets: [{ model: User, filter: { role: 'Employee' } }] },
  schedules:      { label: 'Schedules',       targets: [{ model: Shift, filter: { status: 'CLOSED' } }, { model: PosSchedule }, { model: GroupSync }] },
  groups:         { label: 'Groups',          targets: [{ model: Group }] },
  inventory:      { label: 'Inventory',       targets: [{ model: Product }, { model: InventoryMovement }], optional: true },
};

function getModuleOrThrow(key) {
  const mod = MODULE_REGISTRY[key];
  if (!mod) {
    const err = new Error(`Unknown database module: ${key}`);
    err.statusCode = 404;
    throw err;
  }
  return mod;
}

export function listModuleKeys() {
  return Object.entries(MODULE_REGISTRY).map(([key, mod]) => ({
    key, label: mod.label, clearOnly: !!mod.clearOnly, optional: !!mod.optional,
  }));
}

export async function getModuleSummary(key) {
  const mod = getModuleOrThrow(key);
  if (mod.clearOnly) {
    return { key, label: mod.label, clearOnly: true, optional: !!mod.optional, totalRecords: 0, breakdown: [] };
  }
  const breakdown = await Promise.all(mod.targets.map(async (t) => ({
    model: t.model.modelName,
    count: await t.model.countDocuments(t.filter || {}),
  })));
  const totalRecords = breakdown.reduce((s, b) => s + b.count, 0);
  return { key, label: mod.label, clearOnly: false, optional: !!mod.optional, totalRecords, breakdown };
}

export async function listAllModuleSummaries() {
  return Promise.all(Object.keys(MODULE_REGISTRY).map(getModuleSummary));
}

// ─── GridFS helpers ───────────────────────────────────────────────────────────

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: GRIDFS_BUCKET });
}

function uploadToGridFS(filename, buffer, metadata) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, { metadata });
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.end(buffer);
  });
}

function downloadFromGridFS(fileId) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const chunks = [];
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// User.pinHash is `select: false` — must be explicitly included so a restored
// employee account keeps its real (already-hashed) PIN instead of losing it.
function findQueryFor(target) {
  const q = target.model.find(target.filter || {});
  if (target.model.modelName === 'User') q.select('+pinHash');
  return q.lean();
}

async function exportModuleToGridFS(mod, moduleKey) {
  const dump = {};
  let recordCount = 0;
  for (const t of mod.targets) {
    const docs = await findQueryFor(t);
    dump[t.model.modelName] = docs;
    recordCount += docs.length;
  }

  const compressed = await gzip(Buffer.from(JSON.stringify(dump), 'utf8'));
  const filename = `${moduleKey}-${Date.now()}.json.gz`;
  const fileId = await uploadToGridFS(filename, compressed, { module: moduleKey });

  return { fileId, filename, recordCount, sizeBytes: compressed.length };
}

async function readBackupDump(fileId) {
  const compressed = await downloadFromGridFS(fileId);
  const json = (await gunzip(compressed)).toString('utf8');
  return JSON.parse(json);
}

// ─── Backup ───────────────────────────────────────────────────────────────────

export async function backupModule(key, manager, reason = 'MANUAL') {
  const mod = getModuleOrThrow(key);
  if (mod.clearOnly) {
    const err = new Error(`${mod.label} has no stored data to back up.`);
    err.statusCode = 400;
    throw err;
  }

  const backupDoc = await DatabaseBackup.create({
    module: key, label: mod.label,
    createdBy: manager._id, createdByName: manager.name,
    status: 'IN_PROGRESS', reason,
  });

  try {
    const { fileId, filename, recordCount, sizeBytes } = await exportModuleToGridFS(mod, key);
    backupDoc.status = 'COMPLETED';
    backupDoc.gridFsFileId = fileId;
    backupDoc.gridFsFilename = filename;
    backupDoc.recordCount = recordCount;
    backupDoc.sizeBytes = sizeBytes;
    await backupDoc.save();
  } catch (err) {
    backupDoc.status = 'FAILED';
    backupDoc.errorMessage = err.message;
    await backupDoc.save();
    throw err;
  }

  return backupDoc;
}

// ─── Delete (backup-then-wipe, transactional) ────────────────────────────────

async function clearDashboardCache(manager, { ip, userAgent }) {
  clearReportCache();
  clearGroupReportCache();
  clearStaffingCache();

  await AuditLog.create({
    action: 'DATABASE_CACHE_CLEAR',
    entity: 'dashboardCache',
    entityId: new mongoose.Types.ObjectId(),
    afterData: { ip, userAgent, module: 'dashboardCache' },
    performedBy: manager._id,
    role: manager.role,
    ipAddress: ip || 'unknown',
  });

  return { backupId: null, recordsAffected: 0 };
}

export async function deleteModule(key, manager, { otp, confirmationPhrase, ip, userAgent }) {
  const mod = getModuleOrThrow(key);

  if (mod.clearOnly) {
    return clearDashboardCache(manager, { ip, userAgent });
  }

  if (confirmationPhrase !== CONFIRMATION_PHRASE) {
    const err = new Error(`Type "${CONFIRMATION_PHRASE}" exactly to confirm this action.`);
    err.statusCode = 400;
    throw err;
  }
  await verifyDatabaseActionOtp(manager, otp);

  // Mandatory backup — a read-only snapshot taken BEFORE the transaction, so
  // it always reflects true pre-delete state even if the delete itself fails.
  const backupDoc = await backupModule(key, manager, 'PRE_DELETE');
  if (backupDoc.status !== 'COMPLETED') {
    const err = new Error('Backup failed — deletion aborted for safety.');
    err.statusCode = 500;
    throw err;
  }

  const session = await mongoose.startSession();
  let recordsAffected = 0;
  try {
    await session.withTransaction(async () => {
      for (const t of mod.targets) {
        const res = await t.model.deleteMany(t.filter || {}, { session });
        recordsAffected += res.deletedCount || 0;
      }

      await AuditLog.create([{
        action: 'DATABASE_DELETE',
        entity: key,
        entityId: backupDoc._id,
        afterData: { recordsAffected, backupId: backupDoc._id, ip, userAgent, module: key },
        performedBy: manager._id,
        role: manager.role,
        ipAddress: ip || 'unknown',
      }], { session });
    });
  } finally {
    await session.endSession();
  }

  return { backupId: backupDoc._id, recordsAffected };
}

// ─── Restore ──────────────────────────────────────────────────────────────────

export async function restoreBackup(backupId, manager, { otp, force, ip, userAgent }) {
  await verifyDatabaseActionOtp(manager, otp);

  const backupDoc = await DatabaseBackup.findById(backupId);
  if (!backupDoc) {
    const err = new Error('Backup not found.');
    err.statusCode = 404;
    throw err;
  }
  if (backupDoc.status !== 'COMPLETED') {
    const err = new Error('This backup did not complete successfully and cannot be restored.');
    err.statusCode = 400;
    throw err;
  }

  const mod = getModuleOrThrow(backupDoc.module);
  const dump = await readBackupDump(backupDoc.gridFsFileId);

  if (!force) {
    for (const t of mod.targets) {
      const existingCount = await t.model.countDocuments(t.filter || {});
      if (existingCount > 0) {
        const err = new Error(
          `${t.model.modelName} already has ${existingCount} record(s). Restoring would duplicate or conflict with live data — confirm "force restore" to proceed anyway.`
        );
        err.statusCode = 409;
        throw err;
      }
    }
  }

  const session = await mongoose.startSession();
  let recordsRestored = 0;
  try {
    await session.withTransaction(async () => {
      for (const t of mod.targets) {
        const docs = dump[t.model.modelName] || [];
        if (docs.length === 0) continue;
        // Model-level insertMany (not the raw driver) so Mongoose casts the
        // JSON-round-tripped string _id/date fields back to ObjectId/Date.
        // { timestamps: false } preserves the ORIGINAL createdAt/updatedAt —
        // historical accuracy matters for a POS's financial records.
        await t.model.insertMany(docs, { session, ordered: false, timestamps: false });
        recordsRestored += docs.length;
      }

      backupDoc.restoreStatus = 'RESTORED';
      backupDoc.restoredAt = new Date();
      backupDoc.restoredBy = manager._id;
      await backupDoc.save({ session });

      await AuditLog.create([{
        action: 'DATABASE_RESTORE',
        entity: backupDoc.module,
        entityId: backupDoc._id,
        afterData: { recordsAffected: recordsRestored, backupId: backupDoc._id, ip, userAgent, module: backupDoc.module },
        performedBy: manager._id,
        role: manager.role,
        ipAddress: ip || 'unknown',
      }], { session });
    });
  } catch (err) {
    backupDoc.restoreStatus = 'RESTORE_FAILED';
    backupDoc.errorMessage = err.message;
    await backupDoc.save();
    throw err;
  } finally {
    await session.endSession();
  }

  return { backupId: backupDoc._id, recordsRestored };
}

// ─── Backup history / download ───────────────────────────────────────────────

export async function listBackups() {
  return DatabaseBackup.find().sort({ createdAt: -1 }).lean();
}

export async function getBackupFile(backupId) {
  const backupDoc = await DatabaseBackup.findById(backupId).lean();
  if (!backupDoc) {
    const err = new Error('Backup not found.');
    err.statusCode = 404;
    throw err;
  }
  if (backupDoc.status !== 'COMPLETED') {
    const err = new Error('This backup did not complete successfully and has no file to download.');
    err.statusCode = 400;
    throw err;
  }
  const dump = await readBackupDump(backupDoc.gridFsFileId);
  return {
    filename: backupDoc.gridFsFilename.replace(/\.gz$/, ''), // served decompressed
    json: JSON.stringify(dump, null, 2),
  };
}

export async function listAuditLogs() {
  return AuditLog.find({ action: { $regex: '^DATABASE_' } })
    .sort({ timestamp: -1 })
    .populate('performedBy', 'name employeeCode')
    .limit(200)
    .lean();
}
