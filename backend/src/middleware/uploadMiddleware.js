import multer from 'multer';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const _multer = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error(
      `Unsupported file type. Allowed: ${ALLOWED_TYPES.map((t) => t.split('/')[1].toUpperCase()).join(', ')}.`
    );
    err.status = 400;
    cb(err);
  },
});

/**
 * Returns Express middleware that handles a single-file multipart upload.
 * Multer errors are caught and returned as JSON 400 responses rather than
 * being forwarded to the global error handler (which would produce HTML).
 *
 * Usage:  router.patch('/image', imageUpload('image'), controller)
 */
export const imageUpload = (field = 'image') =>
  (req, res, next) =>
    _multer.single(field)(req, res, (err) => {
      if (!err) return next();
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `File too large. Maximum size is ${MAX_BYTES / (1024 * 1024)} MB.`
          : (err.message ?? 'File upload error.');
      res.status(err.status ?? 400).json({ success: false, message });
    });
