import * as dbMgmt from '../services/databaseManagementService.js';
import { requestDatabaseActionOtp } from '../services/databaseActionOtpService.js';

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

const listModules = async (req, res, next) => {
  try {
    const summaries = await dbMgmt.listAllModuleSummaries();
    res.status(200).json(summaries);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const requestOtp = async (req, res, next) => {
  try {
    await requestDatabaseActionOtp(req.user);
    res.status(200).json({ message: `A verification code was sent to ${req.user.email}.` });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const backupModule = async (req, res, next) => {
  try {
    const backup = await dbMgmt.backupModule(req.params.module, req.user, 'MANUAL');
    res.status(201).json(backup);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const deleteModule = async (req, res, next) => {
  try {
    const { otp, confirmationPhrase } = req.body;
    const result = await dbMgmt.deleteModule(req.params.module, req.user, {
      otp, confirmationPhrase, ...requestMeta(req),
    });
    res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const listBackups = async (req, res, next) => {
  try {
    const backups = await dbMgmt.listBackups();
    res.status(200).json(backups);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const downloadBackup = async (req, res, next) => {
  try {
    const { filename, json } = await dbMgmt.getBackupFile(req.params.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(json);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const restoreBackup = async (req, res, next) => {
  try {
    const { otp, force } = req.body;
    const result = await dbMgmt.restoreBackup(req.params.id, req.user, {
      otp, force: !!force, ...requestMeta(req),
    });
    res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const listAuditLogs = async (req, res, next) => {
  try {
    const logs = await dbMgmt.listAuditLogs();
    res.status(200).json(logs);
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

export {
  listModules,
  requestOtp,
  backupModule,
  deleteModule,
  listBackups,
  downloadBackup,
  restoreBackup,
  listAuditLogs,
};
