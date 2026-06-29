import React, { useState, useEffect, useRef, useCallback } from 'react';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CheckCircleOutlinedIcon       from '@mui/icons-material/CheckCircleOutlined';
import CloseOutlinedIcon             from '@mui/icons-material/CloseOutlined';
import RefreshOutlinedIcon           from '@mui/icons-material/RefreshOutlined';
import CloudUploadOutlinedIcon       from '@mui/icons-material/CloudUploadOutlined';

const API          = import.meta.env.VITE_API_BASE_URL ?? '';
const ALLOWED      = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE     = 5 * 1024 * 1024;
const MAX_FILES    = 8;

const C = {
  bg: '#F5F3F1', surface: '#ffffff', border: '#DDD2CC',
  primary: '#3E2723', success: '#2E7D4F', error: '#B71C1C',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  elevated: '#EFE7E2',
};

let _seq = 0;
const uid = () => `pimg-${++_seq}-${Math.random().toString(36).slice(2, 6)}`;

/* ── individual file row ─────────────────────────────────────────── */
function FileRow({ item, onRemove, onRetry, productId }) {
  const uploading = item.status === 'uploading';
  const done      = item.status === 'done';
  const error     = item.status === 'error';
  const queued    = item.status === 'queued';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 10,
      background: done  ? 'rgba(46,125,79,0.04)'
                : error ? 'rgba(183,28,28,0.04)'
                : C.surface,
      border: `1px solid ${done  ? 'rgba(46,125,79,0.20)'
                          : error ? 'rgba(183,28,28,0.20)'
                          : C.border}`,
      transition: 'background 0.2s, border-color 0.2s',
    }}>

      {/* Thumbnail */}
      <div style={{
        width: 38, height: 38, borderRadius: 7, overflow: 'hidden',
        flexShrink: 0, background: C.elevated,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {item.preview
          ? <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <CloudUploadOutlinedIcon sx={{ fontSize: 16, color: C.textDim }} />}
      </div>

      {/* Name + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (uploading || done) ? 5 : 2 }}>
          <p style={{
            margin: 0, fontSize: 12, fontWeight: 600, color: C.textPri,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%',
          }}>
            {item.file.name}
          </p>
          <span style={{
            fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 6,
            color: done ? C.success : error ? C.error : uploading ? C.primary : C.textDim,
          }}>
            {done      ? '100%'
            : error    ? 'Failed'
            : uploading ? `${item.progress}%`
            : 'Queued'}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: 4, background: C.elevated, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${done ? 100 : item.progress}%`,
            background: done ? C.success : error ? C.error : C.primary,
            transition: 'width 0.25s ease, background 0.2s',
          }} />
        </div>

        {error && (
          <p style={{ margin: '3px 0 0', fontSize: 10, color: C.error, lineHeight: '14px' }}>
            {item.errorMsg}
          </p>
        )}
        {queued && (
          <p style={{ margin: '3px 0 0', fontSize: 10, color: C.textDim }}>
            {(item.file.size / 1024).toFixed(0)} KB · waiting to upload
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        {done && (
          <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: C.success }} />
        )}
        {error && productId && (
          <button
            onClick={onRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', borderRadius: 6,
              border: '1px solid rgba(183,28,28,0.28)',
              background: 'rgba(183,28,28,0.07)',
              color: C.error, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <RefreshOutlinedIcon sx={{ fontSize: 12 }} /> Retry
          </button>
        )}
        {(queued || error) && (
          <button
            onClick={onRemove}
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: 'transparent', color: C.textDim,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
            }}
          >
            <CloseOutlinedIcon sx={{ fontSize: 15 }} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────── */
export default function ProductImageUpload({ token, productId, onQueueChange, onAllComplete }) {
  const [items,    setItems]    = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [dropErr,  setDropErr]  = useState('');
  const inputRef      = useRef(null);
  const startedRef    = useRef(false); // guard against double-start

  // Tell parent whether files are queued
  useEffect(() => {
    onQueueChange?.(items.length > 0);
  }, [items.length, onQueueChange]);

  // When productId arrives, start uploading all queued items
  useEffect(() => {
    if (!productId || startedRef.current) return;
    const queued = items.filter(i => i.status === 'queued');
    if (queued.length === 0) return;
    startedRef.current = true;
    runUploads(queued);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Fire onAllComplete when every item is settled (done or error)
  useEffect(() => {
    if (!productId || items.length === 0) return;
    if (items.every(i => i.status === 'done' || i.status === 'error')) {
      onAllComplete?.();
    }
  }, [items, productId, onAllComplete]);

  // Clean up object URLs
  useEffect(() => () => { items.forEach(i => { if (i.preview) URL.revokeObjectURL(i.preview); }); }, []);

  /* ── file validation + queue ── */
  const addFiles = useCallback((fileList) => {
    setDropErr('');
    const next = [];
    for (const file of fileList) {
      if (!ALLOWED.includes(file.type)) {
        setDropErr(`"${file.name}" — unsupported format. Use JPEG, PNG, WebP or GIF.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setDropErr(`"${file.name}" exceeds the 5 MB limit.`);
        continue;
      }
      setItems(prev => {
        if (prev.length + next.length >= MAX_FILES) {
          setDropErr(`Max ${MAX_FILES} images per product.`);
          return prev;
        }
        return prev; // batch below
      });
      if (next.length + items.length < MAX_FILES) {
        next.push({
          id: uid(), file,
          preview: URL.createObjectURL(file),
          status: 'queued', progress: 0, errorMsg: '', result: null,
        });
      }
    }
    if (next.length) setItems(prev => [...prev, ...next]);
  }, [items.length]);

  const removeItem = useCallback((id) => {
    setItems(prev => {
      const it = prev.find(i => i.id === id);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return prev.filter(i => i.id !== id);
    });
  }, []);

  /* ── XHR upload for a single item ── */
  const uploadOne = useCallback((item, pid) => new Promise(resolve => {
    const xhr  = new XMLHttpRequest();
    const fd   = new FormData();
    fd.append('image', item.file);

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i));

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.min(99, Math.round((e.loaded / e.total) * 100));
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch {}
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'done', progress: 100, result: data?.data ?? null } : i
        ));
        resolve(true);
      } else {
        let msg = `Server error (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch {}
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', errorMsg: msg } : i));
        resolve(false);
      }
    };

    xhr.onerror = () => {
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'error', errorMsg: 'Network error — check your connection.' } : i
      ));
      resolve(false);
    };

    xhr.open('POST', `${API}/api/products/${pid}/images`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(fd);
  }), [token]);

  /* ── upload queue (max 3 concurrent) ── */
  const runUploads = useCallback(async (queued) => {
    const CONCURRENCY = 3;
    for (let i = 0; i < queued.length; i += CONCURRENCY) {
      await Promise.all(queued.slice(i, i + CONCURRENCY).map(it => uploadOne(it, productId)));
    }
  }, [productId, uploadOne]);

  const retryItem = useCallback((item) => {
    if (!productId) return;
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, status: 'uploading', progress: 0, errorMsg: '' } : i
    ));
    uploadOne(item, productId);
  }, [productId, uploadOne]);

  /* ── drag handlers ── */
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop      = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };
  const onPick      = (e) => { addFiles(e.target.files); e.target.value = ''; };

  /* ── derived counts ── */
  const doneCount      = items.filter(i => i.status === 'done').length;
  const errorCount     = items.filter(i => i.status === 'error').length;
  const uploadingCount = items.filter(i => i.status === 'uploading').length;
  const totalCount     = items.length;
  const canAddMore     = totalCount < MAX_FILES;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Drop zone ── */}
      {canAddMore && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? C.primary : C.border}`,
            borderRadius: 12,
            padding: totalCount > 0 ? '14px 16px' : '22px 16px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 7,
            cursor: 'pointer',
            background: dragOver ? 'rgba(62,39,35,0.035)' : C.bg,
            transition: 'border-color 0.15s, background 0.15s',
            userSelect: 'none',
          }}
        >
          <AddPhotoAlternateOutlinedIcon
            sx={{ fontSize: totalCount > 0 ? 22 : 30, color: dragOver ? C.primary : C.textDim, transition: 'color 0.15s' }}
          />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: dragOver ? C.primary : C.textSec, transition: 'color 0.15s' }}>
              {dragOver ? 'Release to add images' : (
                <>Drop images here or <span style={{ color: C.primary, textDecoration: 'underline' }}>browse files</span></>
              )}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: C.textDim }}>
              JPEG, PNG, WebP, GIF · max 5 MB each · up to {MAX_FILES} images
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={onPick}
        style={{ display: 'none' }}
      />

      {/* Validation error */}
      {dropErr && (
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: C.error }}>{dropErr}</p>
      )}

      {/* Upload summary banner */}
      {totalCount > 0 && productId && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', borderRadius: 8,
          background: errorCount > 0 ? 'rgba(183,28,28,0.06)' : uploadingCount > 0 ? 'rgba(62,39,35,0.05)' : 'rgba(46,125,79,0.06)',
          border: `1px solid ${errorCount > 0 ? 'rgba(183,28,28,0.20)' : uploadingCount > 0 ? 'rgba(62,39,35,0.15)' : 'rgba(46,125,79,0.20)'}`,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: errorCount > 0 ? C.error : uploadingCount > 0 ? C.primary : C.success,
          }}>
            {uploadingCount > 0
              ? `Uploading ${doneCount + 1} of ${totalCount}…`
              : errorCount > 0
              ? `${doneCount} uploaded · ${errorCount} failed`
              : `All ${doneCount} image${doneCount !== 1 ? 's' : ''} uploaded successfully`}
          </span>
        </div>
      )}

      {/* File rows */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {items.map(item => (
            <FileRow
              key={item.id}
              item={item}
              productId={productId}
              onRemove={() => removeItem(item.id)}
              onRetry={() => retryItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
