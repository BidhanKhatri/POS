import React, { useRef, useState } from 'react';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseOutlinedIcon             from '@mui/icons-material/CloseOutlined';
import PhotoCameraOutlinedIcon       from '@mui/icons-material/PhotoCameraOutlined';

const C = {
  primary: '#3E2723', border: '#DDD2CC', textDim: '#A09490',
  textSec: '#6B5B57', error: '#B71C1C', elevated: '#EFE7E2',
  hover: '#F3EDE9', surface: '#ffffff',
};

const FONT = "'Plus Jakarta Sans', sans-serif";

/**
 * Reusable image uploader / replacer component.
 *
 * Props:
 *  currentUrl  string|null    — current image URL to display
 *  onUpload    async (File) => { url: string }  — parent does the API call; must return { url }
 *  onDelete    async () => void                 — parent does the API delete call
 *  label       string         — field label (default "Image")
 *  shape       'square'|'circle'   (default 'square')
 *  size        number (px)         (default 88)
 *  disabled    boolean             (default false)
 *  hint        string|null         — small hint text shown below
 */
export default function ImageUploader({
  currentUrl  = null,
  onUpload,
  onDelete,
  label   = 'Image',
  shape   = 'square',
  size    = 88,
  disabled = false,
  hint    = null,
}) {
  const fileRef  = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const radius   = shape === 'circle' ? '50%' : Math.round(size * 0.2);
  const imgStyle = {
    width: size, height: size, borderRadius: radius,
    objectFit: 'cover', display: 'block',
    border: `1.5px solid ${C.border}`,
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setError('');
    setLoading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err.message ?? 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setError('');
    setLoading(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err.message ?? 'Remove failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 10, fontWeight: 700, color: C.textDim,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: FONT,
        }}>
          {label}
        </label>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Image preview / upload area */}
        {currentUrl ? (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={currentUrl} alt="preview" style={imgStyle} />
            {!disabled && (
              <>
                {/* Change overlay */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Change image"
                  style={{
                    position: 'absolute', inset: 0, borderRadius: radius,
                    background: 'rgba(0,0,0,0)', border: 'none',
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; e.currentTarget.querySelector('.cam')?.setAttribute('style', 'display:flex'); }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.querySelector('.cam')?.setAttribute('style', 'display:none'); }}
                >
                  <div className="cam" style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                    <PhotoCameraOutlinedIcon sx={{ fontSize: 20, color: '#fff' }} />
                  </div>
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  title="Remove image"
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 20, height: 20, borderRadius: '50%',
                    background: C.error, border: `2px solid ${C.surface}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    padding: 0,
                  }}
                >
                  <CloseOutlinedIcon sx={{ fontSize: 11, color: '#fff' }} />
                </button>
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => !disabled && fileRef.current?.click()}
            disabled={disabled || loading}
            style={{
              width: size, height: size, borderRadius: radius, flexShrink: 0,
              border: `1.5px dashed ${C.border}`, background: loading ? C.elevated : C.hover,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 5,
              cursor: disabled || loading ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
              outline: 'none',
            }}
          >
            {loading ? (
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: `2.5px solid ${C.border}`,
                borderTopColor: C.primary,
                animation: 'ik-spin 0.7s linear infinite',
              }} />
            ) : (
              <>
                <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 22, color: C.textDim }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: FONT }}>
                  Upload
                </span>
              </>
            )}
          </button>
        )}

        {/* Side actions when image exists */}
        {currentUrl && !disabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              style={{
                padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
                background: C.surface, fontSize: 11, fontWeight: 700, color: C.textSec,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT,
                opacity: loading ? 0.55 : 1,
              }}
            >
              {loading ? 'Working…' : 'Change'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              style={{
                padding: '6px 12px', borderRadius: 7, border: `1px solid rgba(183,28,28,0.3)`,
                background: 'rgba(183,28,28,0.06)', fontSize: 11, fontWeight: 700, color: C.error,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT,
                opacity: loading ? 0.55 : 1,
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {error && (
        <p style={{
          margin: 0, fontSize: 11, fontWeight: 600, color: C.error,
          fontFamily: FONT,
        }}>
          {error}
        </p>
      )}

      {hint && !error && (
        <p style={{
          margin: 0, fontSize: 10, color: C.textDim, fontFamily: FONT, lineHeight: '15px',
        }}>
          {hint}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Spinner keyframe — injected once */}
      <style>{`@keyframes ik-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
