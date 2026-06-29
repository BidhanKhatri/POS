import ImageKit from 'imagekit';

// Lazily created so dotenv.config() in server.js runs first (ESM hoists imports
// before any module-level code executes, meaning env vars aren't available yet
// at static import time).
let _ik = null;

function getClient() {
  if (_ik) return _ik;

  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    const err = new Error(
      'ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in .env.'
    );
    err.status = 503;
    throw err;
  }

  _ik = new ImageKit({
    publicKey:   IMAGEKIT_PUBLIC_KEY,
    privateKey:  IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
  return _ik;
}

/**
 * Upload a Buffer to ImageKit.
 * Returns { url, fileId, fileName }.
 */
export const uploadBuffer = async ({ buffer, fileName, folder, tags = [] }) => {
  const result = await getClient().upload({
    file: buffer,
    fileName,
    folder,
    tags,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId, fileName: result.name };
};

/**
 * Delete a file from ImageKit by fileId.
 * Silently swallows 404s so stale fileIds don't break delete flows.
 */
export const deleteFile = async (fileId) => {
  if (!fileId) return;
  try {
    getClient().deleteFile(fileId);
  } catch (err) {
    const msg = err?.message ?? '';
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) return;
    if (msg.includes('not configured')) return; // no keys — skip delete silently
    console.error('[ImageKit] deleteFile error:', msg);
  }
};

/**
 * Auth params for potential future client-side uploads.
 */
export const getAuthParams = () => getClient().getAuthenticationParameters();

export default { uploadBuffer, deleteFile, getAuthParams };
