import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchOutlinedIcon        from '@mui/icons-material/SearchOutlined';
import CloseOutlinedIcon         from '@mui/icons-material/CloseOutlined';
import PeopleOutlinedIcon        from '@mui/icons-material/PeopleOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon         from '@mui/icons-material/PhoneOutlined';
import ChevronRightIcon          from '@mui/icons-material/ChevronRight';
import useAuthStore              from '../store/useAuthStore';

const API  = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const FONT = "'Plus Jakarta Sans', sans-serif";

const C = {
  primary: '#3E2723', accent: '#D4A373',
  success: '#2E7D4F',
  textPri: '#2B1D1A', textSec: '#6B5B57', textDim: '#A09490',
  border: '#DDD2CC', surface: '#ffffff', bg: '#F5F3F1', elevated: '#EFE7E2',
};

function fmt$(n) {
  if (!n) return '$0.00';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomerSearchPage() {
  const navigate  = useNavigate();
  const { token } = useAuthStore();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef(null);

  const doSearch = async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/customers/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) setResults(await r.json());
    } catch { /* */ }
    finally { setLoading(false); setSearched(true); }
  };

  const handleChange = (val) => {
    setQuery(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(val), 300);
  };

  const clear = () => { setQuery(''); setResults([]); setSearched(false); };

  return (
    <div style={{ padding: '20px 16px 32px', background: C.bg, minHeight: '100%', fontFamily: FONT }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <PeopleOutlinedIcon sx={{ fontSize: 18, color: C.accent }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: C.textDim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Employee Portal</p>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.textPri }}>Customers</h1>
        </div>
      </div>

      {/* Search input */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 16, boxShadow: '0 1px 4px rgba(62,39,35,0.06)' }}>
        <SearchOutlinedIcon sx={{ fontSize: 20, color: loading ? C.accent : C.textDim, flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search by name or phone…"
          autoFocus
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 500, color: C.textPri, background: 'transparent', fontFamily: FONT }}
        />
        {query && (
          <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
            <CloseOutlinedIcon sx={{ fontSize: 18, color: C.textDim }} />
          </button>
        )}
      </div>

      {/* Idle state */}
      {!query && !searched && (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <PersonOutlineOutlinedIcon sx={{ fontSize: 48, color: C.textDim, display: 'block', margin: '0 auto 14px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.textSec }}>Find a customer</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: C.textDim }}>Type a name or phone number to search.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: C.elevated, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ height: 12, width: '60%', borderRadius: 4, background: C.elevated }} />
                <div style={{ height: 10, width: '40%', borderRadius: 4, background: C.elevated }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textSec }}>No customers found</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textDim }}>Try a different name or phone number.</p>
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: '0 0 4px 4px', fontSize: 11, fontWeight: 700, color: C.textDim }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          {results.map(c => (
            <button key={c._id}
              onClick={() => navigate(`/employee/customers/${c._id}`)}
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: C.accent }}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                {c.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <PhoneOutlinedIcon sx={{ fontSize: 11, color: C.textDim }} />
                    <span style={{ fontSize: 12, color: C.textDim, fontFamily: 'monospace' }}>{c.phone}</span>
                  </div>
                )}
              </div>
              <ChevronRightIcon sx={{ fontSize: 20, color: C.textDim, flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
