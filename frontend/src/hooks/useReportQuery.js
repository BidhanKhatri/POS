/**
 * useReportQuery — TanStack Query hooks for all report endpoints.
 * All hooks inject the auth token automatically via useAuthStore.
 *
 * staleTime: 0  → data is always stale, so switching date ranges or
 * revisiting the page always triggers a fresh fetch (no silent cache hits).
 *
 * refetchInterval: 30s for live KPIs (summary, payments, products).
 * Anomalies poll every 60s independently.
 */

import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../store/useAuthStore';

import { API_URL as API } from '../config/api';

// ─── Core fetch helper ───────────────────────────────────────────────────────
async function reportFetch(path, token) {
  const res = await fetch(`${API}/api/reports/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Report fetch failed: ${res.status}`);
  }
  return res.json();
}

// Build ISO date strings for common presets
export function buildDateRange(preset, customStart, customEnd) {
  const now       = new Date();
  const endOfDay  = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0);    return x; };

  switch (preset) {
    case 'overall': {
      const s = new Date('2020-01-01T00:00:00.000Z');
      const e = endOfDay(now);
      return { start: s.toISOString(), end: e.toISOString(), compareStart: null, compareEnd: null, groupBy: 'month' };
    }
    case 'today': {
      const s  = startOfDay(now);
      const e  = endOfDay(now);
      const ps = startOfDay(new Date(now - 86400000));
      const pe = endOfDay(new Date(now - 86400000));
      return { start: s.toISOString(), end: e.toISOString(), compareStart: ps.toISOString(), compareEnd: pe.toISOString(), groupBy: 'hour' };
    }
    case 'week': {
      const s  = startOfDay(new Date(now - 6 * 86400000));
      const e  = endOfDay(now);
      const ps = startOfDay(new Date(now - 13 * 86400000));
      const pe = endOfDay(new Date(now - 7 * 86400000));
      return { start: s.toISOString(), end: e.toISOString(), compareStart: ps.toISOString(), compareEnd: pe.toISOString(), groupBy: 'day' };
    }
    case 'month': {
      const s  = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const e  = endOfDay(now);
      const ps = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const pe = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start: s.toISOString(), end: e.toISOString(), compareStart: ps.toISOString(), compareEnd: pe.toISOString(), groupBy: 'day' };
    }
    case 'year': {
      const s  = startOfDay(new Date(now.getFullYear(), 0, 1));
      const e  = endOfDay(now);
      const ps = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
      const pe = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
      return { start: s.toISOString(), end: e.toISOString(), compareStart: ps.toISOString(), compareEnd: pe.toISOString(), groupBy: 'month' };
    }
    case 'custom':
      return {
        start:        new Date(customStart).toISOString(),
        end:          endOfDay(new Date(customEnd)).toISOString(),
        compareStart: null,
        compareEnd:   null,
        groupBy:      'day',
      };
    default:
      return buildDateRange('today');
  }
}

function qs(params) {
  const p = Object.entries(params).filter(([, v]) => v != null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}

// Whether the period includes today (needs live refresh)
function isLivePeriod(end) {
  if (!end) return true;
  const endDate   = new Date(end);
  const todayEnd  = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  return endDate >= new Date(new Date().setHours(0, 0, 0, 0));
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useReportSummary({ start, end, compareStart, compareEnd }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'summary', start, end, compareStart, compareEnd],
    queryFn:        () => reportFetch(`summary${qs({ start, end, compareStart, compareEnd })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 30 * 1000 : false,
    ...options,
  });
}

export function useReportTrend({ start, end, groupBy, compareStart, compareEnd }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'trend', start, end, groupBy, compareStart, compareEnd],
    queryFn:        () => reportFetch(`trend${qs({ start, end, groupBy, compareStart, compareEnd })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 30 * 1000 : false,
    ...options,
  });
}

export function useReportPayments({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'payments', start, end],
    queryFn:        () => reportFetch(`payments${qs({ start, end })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 30 * 1000 : false,
    ...options,
  });
}

export function useReportProducts({ start, end, limit = 10, sortBy = 'revenue' }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'products', start, end, limit, sortBy],
    queryFn:        () => reportFetch(`products${qs({ start, end, limit, sortBy })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 30 * 1000 : false,
    ...options,
  });
}

export function useReportCashiers({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'cashiers', start, end],
    queryFn:        () => reportFetch(`cashiers${qs({ start, end })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 60 * 1000 : false,
    ...options,
  });
}

export function useReportProductSalesDetail({ start, end, limit = 50 }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'product-sales-detail', start, end, limit],
    queryFn:        () => reportFetch(`product-sales-detail${qs({ start, end, limit })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 60 * 1000 : false,
    ...options,
  });
}

export function useReportRefunds({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey:  ['report', 'refunds', start, end],
    queryFn:   () => reportFetch(`refunds${qs({ start, end })}`, token),
    enabled:   !!token && !!start && !!end,
    staleTime: 0,
    ...options,
  });
}

export function useReportHeatmap({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey:  ['report', 'heatmap', start, end],
    queryFn:   () => reportFetch(`heatmap${qs({ start, end })}`, token),
    enabled:   !!token && !!start && !!end,
    staleTime: 0,
    ...options,
  });
}

export function useReportGroups({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'groups', start, end],
    queryFn:        () => reportFetch(`groups${qs({ start, end })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 60 * 1000 : false,
    ...options,
  });
}

export function useReportPosGroups({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'pos-groups', start, end],
    queryFn:        () => reportFetch(`pos-groups${qs({ start, end })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 60 * 1000 : false,
    ...options,
  });
}

export function useReportAnomalies({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  return useQuery({
    queryKey:        ['report', 'anomalies', start, end],
    queryFn:         () => reportFetch(`anomalies${qs({ start, end })}`, token),
    enabled:         !!token && !!start && !!end,
    staleTime:       0,
    refetchInterval: 60 * 1000,
    ...options,
  });
}

export function useReportInsights({ start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'insights', start, end],
    queryFn:        () => reportFetch(`insights${qs({ start, end })}`, token),
    enabled:        !!token && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 60 * 1000 : false,
    ...options,
  });
}

export function useEmployeeReport({ employeeId, start, end }, options = {}) {
  const token = useAuthStore(s => s.token);
  const live  = isLivePeriod(end);
  return useQuery({
    queryKey:       ['report', 'employee', employeeId, start, end],
    queryFn:        () => reportFetch(`employee/${employeeId}${qs({ start, end })}`, token),
    enabled:        !!token && !!employeeId && !!start && !!end,
    staleTime:      0,
    refetchInterval: live ? 60 * 1000 : false,
    ...options,
  });
}

// CSV export is a download action, not a query — returns a trigger function
export function useExportCSV() {
  const token = useAuthStore(s => s.token);
  return async ({ start, end }) => {
    const res = await fetch(`${API}/api/reports/export${qs({ start, end, format: 'csv' })}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pos_report_${new Date(start).toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
}
