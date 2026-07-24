# EMS → POS Attendance Webhook Contract

This document is for whoever implements the sending side in `ems_fullstack`.
POS does not call EMS for this feature — EMS pushes attendance events to POS.

## When to send

Send exactly one webhook call whenever an employee uses the Clock In / Clock
Out slider on the EMS Employee Dashboard. Do **not** send anything for stores
that haven't enabled sync on the POS side — but you don't need to check that;
POS enforces it and will reply `403` if sync is off, at no cost to you beyond
not retrying (see status table below).

## Endpoint

```
POST https://<pos-backend-host>/api/integrations/ems/attendance
Content-Type: application/json
```

Local dev POS backend: `http://localhost:5002/api/integrations/ems/attendance`

## Authentication — HMAC-SHA256 signature

Every request must include:

| Header | Value |
|---|---|
| `X-Ems-Timestamp` | Current time as **milliseconds since epoch**, e.g. `1737384000000` |
| `X-Ems-Signature` | Hex-encoded HMAC-SHA256, see below |

**Signing recipe:**

```
signature = HMAC_SHA256(
  key: EMS_WEBHOOK_SECRET,               # shared secret, coordinate value out-of-band — NOT the same as STAFFING_API_TOKEN
  message: `${timestamp}.${rawJsonBody}` # timestamp as sent in the header, dot, then the exact request body bytes you send
).toHex()
```

The message is `timestamp + "." + body`, where `body` is the **exact bytes**
of the JSON you send (not a re-serialized/re-ordered version — sign the
literal string you're about to POST).

POS rejects the request (`401`) if:
- the signature doesn't match, or
- `X-Ems-Timestamp` is more than **5 minutes** away from POS's clock (replay
  protection) — keep both servers' clocks NTP-synced.

Example (Node.js):
```js
const crypto = require('crypto');
const timestamp = Date.now().toString();
const body = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', EMS_WEBHOOK_SECRET)
  .update(`${timestamp}.${body}`)
  .digest('hex');

await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Ems-Timestamp': timestamp,
    'X-Ems-Signature': signature,
  },
  body,
});
```

## Payload

```jsonc
{
  "eventId": "string",       // REQUIRED, globally unique per clock event — POS uses this
                              // for idempotency. A UUID or your own attendance-record ID is fine.
                              // Re-sending the same eventId (e.g. on retry) is always safe.
  "type": "CLOCK_IN",         // REQUIRED — "CLOCK_IN" | "CLOCK_OUT"
  "employee": {
    "staffingBetitEmployeeId": "string", // your internal employee _id — preferred match key
    "email": "string"                    // fallback match key if the above is absent/unmapped
  },
  "timestamp": "2026-07-23T14:32:00.000Z", // REQUIRED, ISO 8601 — when the clock event
                                            // actually happened in EMS (not when you send this)

  // Optional — include if you have current schedule context for this employee.
  // If omitted, POS opens the shift without schedule linkage (still works fine,
  // just without scheduled-end tracking for that shift).
  "scheduleId": "string",
  "scheduledStart": "09:00",       // HH:mm
  "scheduledEnd": "17:00",         // HH:mm
  "scheduledStartUtc": "2026-07-23T13:55:00.000Z", // absolute UTC instant — preferred over scheduledStart when available.
                                                    // IMPORTANT: if your attendance rules allow check-in before the
                                                    // scheduled start (e.g. "clock in up to 5 min early"), still send
                                                    // the real scheduled start here, not the early check-in time — POS
                                                    // uses this to keep the sales terminal locked (showing a countdown)
                                                    // until the actual shift start, even though attendance was recorded early.
  "scheduledEndUtc": "2026-07-23T21:00:00.000Z", // absolute UTC instant — preferred over scheduledEnd when available
  "scheduledDate": "2026-07-23"    // YYYY-MM-DD
}
```

At least one of `employee.staffingBetitEmployeeId` / `employee.email` is
required — POS tries the ID first, then falls back to email.

## Response status codes — what to do on each

| Status | Meaning | Retry? |
|---|---|---|
| `200` | Processed — check the `status` field in the body (`success`, `duplicate`, or `skipped`) | No |
| `401` | Bad/missing signature or stale timestamp | No — fix signing, then send a **new** attempt (don't just retry blindly, or you'll hit the same signing bug repeatedly) |
| `403` | Sync is disabled for this store | No |
| `422` | Malformed payload, or no matching POS employee found | No — this is permanent until the employee mapping is fixed on either side |
| `500` | Unexpected POS-side error | **Yes** — retry with exponential backoff (this is the only status meant to be retried) |

Sending the same `eventId` again (e.g. because you're unsure whether an
earlier attempt succeeded) is always safe — POS returns `200 {"status":"duplicate"}`
and does not reprocess it.

## Example success response

```json
{ "success": true, "status": "success", "shiftId": "66a1f2..." }
```
