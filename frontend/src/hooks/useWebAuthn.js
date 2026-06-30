import { useState, useCallback } from 'react';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import useAuthStore from '../store/useAuthStore';

const API = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

async function apiRequest(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

/**
 * useWebAuthn — encapsulates all WebAuthn ceremony logic.
 *
 * Usage:
 *   const { supported, registerBiometric, loginWithBiometric, ... } = useWebAuthn();
 */
export function useWebAuthn() {
  const { token } = useAuthStore();
  const [registering, setRegistering] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState(null);

  const isSecureContext = window.isSecureContext;
  const supported = isSecureContext && browserSupportsWebAuthn();

  // ── Registration ────────────────────────────────────────────────────────────

  /**
   * Register the current device's biometric as a passkey.
   * User must already be logged in (token required).
   *
   * @param {string} [deviceName] — human-readable label for this device
   * @returns {{ credentialId, deviceName, deviceType, backedUp }}
   */
  const registerBiometric = useCallback(async (deviceName = 'My Device') => {
    if (!supported) throw new Error('WebAuthn is not supported on this device.');
    setRegistering(true);
    setError(null);

    try {
      // Step 1: Get registration options from server
      const { options, sessionToken } = await apiPost(
        '/api/auth/webauthn/register/begin',
        {},
        token
      );

      // Step 2: Trigger the browser's biometric prompt
      let response;
      try {
        response = await startRegistration({ optionsJSON: options });
      } catch (browserErr) {
        // User cancelled or device has no biometric sensor
        if (browserErr.name === 'NotAllowedError') {
          throw new Error('Biometric prompt was cancelled or timed out.');
        }
        if (browserErr.name === 'InvalidStateError') {
          throw new Error('This device is already registered. Try using it to log in.');
        }
        throw new Error(browserErr.message || 'Biometric registration failed.');
      }

      // Step 3: Send the response back for server-side verification
      const result = await apiPost(
        '/api/auth/webauthn/register/verify',
        { sessionToken, response, deviceName },
        token
      );

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setRegistering(false);
    }
  }, [token, supported]);

  // ── Authentication ──────────────────────────────────────────────────────────

  /**
   * Authenticate using a registered biometric passkey.
   * Returns { user, token } on success — caller should call setUser/setToken.
   *
   * @param {string} [email] — optional email hint; improves UX on shared terminals
   */
  const loginWithBiometric = useCallback(async (email) => {
    if (!supported) throw new Error('WebAuthn is not supported on this device.');
    setAuthenticating(true);
    setError(null);

    try {
      // Step 1: Get authentication options from server
      const { options, sessionToken } = await apiPost(
        '/api/auth/webauthn/auth/begin',
        { email },
        null // No JWT needed — this IS the login
      );

      // Step 2: Trigger the browser's biometric prompt
      let response;
      try {
        response = await startAuthentication({ optionsJSON: options });
      } catch (browserErr) {
        if (browserErr.name === 'NotAllowedError') {
          throw new Error('Biometric prompt was cancelled or timed out.');
        }
        throw new Error(browserErr.message || 'Biometric authentication failed.');
      }

      // Step 3: Verify on server and receive JWT
      const userData = await apiPost(
        '/api/auth/webauthn/auth/verify',
        { sessionToken, response },
        null
      );

      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setAuthenticating(false);
    }
  }, [supported]);

  // ── Device management ───────────────────────────────────────────────────────

  const fetchCredentials = useCallback(async () => {
    return apiRequest('GET', '/api/auth/webauthn/credentials', null, token);
  }, [token]);

  const revokeCredential = useCallback(async (credentialId) => {
    return apiRequest('DELETE', `/api/auth/webauthn/credentials/${credentialId}`, null, token);
  }, [token]);

  const renameCredential = useCallback(async (credentialId, deviceName) => {
    return apiRequest('PATCH', `/api/auth/webauthn/credentials/${credentialId}`, { deviceName }, token);
  }, [token]);

  return {
    supported,
    isSecureContext,
    registering,
    authenticating,
    error,
    setError,
    registerBiometric,
    loginWithBiometric,
    fetchCredentials,
    revokeCredential,
    renameCredential,
  };
}
