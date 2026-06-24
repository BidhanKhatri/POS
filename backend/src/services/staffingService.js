/**
 * staffingService.js
 *
 * Thin wrapper around the EMS (Staffing Betit) integration API.
 * All calls go through here — controllers never touch EMS directly.
 *
 * Caching: a simple in-process TTL cache (5 minutes) reduces round-trips
 * to EMS for high-frequency reads like "current shift".
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map(); // key → { data, expiresAt }

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Allow tests / forced refreshes to bust the cache for a specific key
export function bustCache(key) {
  cache.delete(key);
}

// ─── internal fetch helper ────────────────────────────────────────────────────

async function emsRequest(path, params = {}) {
  const baseUrl = process.env.STAFFING_API_URL;
  const token = process.env.STAFFING_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('STAFFING_API_URL and STAFFING_API_TOKEN must be set in environment');
  }

  const url = new URL(`${baseUrl}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    // Node 18+ fetch does not have a built-in timeout; use AbortSignal
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`EMS API error ${response.status}: ${body}`);
  }

  const json = await response.json();
  return json.data ?? json; // normalise — EMS wraps in { success, data }
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Verify that an email address belongs to an active EMS employee.
 * Called during POS signup when syncStaffingBetit is enabled.
 *
 * Returns { exists: boolean, employeeId: string|null }
 * Throws if EMS is unreachable (don't silently pass — surface the outage).
 */
export async function verifyEmployeeInEMS(email) {
  try {
    const data = await emsRequest('/integrations/employee', { email });
    return {
      exists: data.exists === true,
      employeeId: data.employee?._id ? String(data.employee._id) : null,
    };
  } catch (err) {
    if (err.message?.includes('EMS API error 404')) {
      return { exists: false, employeeId: null };
    }
    throw err; // EMS down or misconfigured — propagate
  }
}

/**
 * Fetch today's schedule for a single employee.
 *
 * Identifier priority:
 *   1. staffingBetitEmployeeId (EMS ObjectId stored on POS User)
 *   2. email fallback
 *
 * Returns an array of schedule entries (usually 0 or 1 for a given day).
 */
export async function fetchCurrentShift({ staffingBetitEmployeeId, email }) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const identifier = staffingBetitEmployeeId || email;
  if (!identifier) return [];

  const cacheKey = `current:${identifier}:${today}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const params = { date: today };
  if (staffingBetitEmployeeId) {
    params.employeeId = staffingBetitEmployeeId;
  } else {
    params.email = email;
  }

  const data = await emsRequest('/integrations/schedules', params);
  cacheSet(cacheKey, data);
  return data;
}

/**
 * Fetch schedules across all (or a specific) employee for a date range.
 * Intended for the manager view.
 *
 * @param {object} opts
 * @param {string} [opts.employeeId]   – EMS employee ObjectId to filter
 * @param {string} [opts.startDate]    – YYYY-MM-DD
 * @param {string} [opts.endDate]      – YYYY-MM-DD
 */
export async function fetchSchedules({ employeeId, startDate, endDate } = {}) {
  const cacheKey = `schedules:${employeeId ?? 'all'}:${startDate ?? ''}:${endDate ?? ''}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const data = await emsRequest('/integrations/schedules', { employeeId, startDate, endDate });
  cacheSet(cacheKey, data);
  return data;
}

/**
 * Fetch all EMS groups with their member lists.
 * Cached for 5 minutes — groups change infrequently.
 */
export async function fetchGroups() {
  const cacheKey = 'ems:groups:all';
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const data = await emsRequest('/integrations/groups');
  cacheSet(cacheKey, data);
  return data;
}
