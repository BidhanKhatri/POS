/**
 * reportEmailService.js
 * Builds production-grade HTML (and plain-text) email bodies for scheduled sales reports.
 * Called by cronReportService — never directly by controllers.
 *
 * Design: table-based layout so it renders correctly across all email clients
 * (Gmail, Outlook, Apple Mail, mobile). Inline styles only, 600px max width.
 */

const BRAND_NAME = 'StaffingBetIT POS';
// Report emails go to real inboxes regardless of which environment generated them —
// always point at the production dashboard, never a local/dev FRONTEND_URL.
const APP_URL = 'https://pos.staffingbetit.com';

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmt = {
  currency: (n) => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  number:   (n) => Number(n ?? 0).toLocaleString('en-US'),
  pct:      (n) => `${Number(n ?? 0).toFixed(1)}%`,
  delta:    (n) => {
    if (n == null) return '';
    const sign = n > 0 ? '▲' : n < 0 ? '▼' : '─';
    const color = n > 0 ? '#2E7D4F' : n < 0 ? '#B71C1C' : '#6B5B57';
    return `<span style="color:${color};font-size:11px;font-weight:700">${sign} ${Math.abs(n).toFixed(1)}%</span>`;
  },
};

const periodNoun = (type) => ({
  DAILY: 'today', WEEKLY: 'this week', MONTHLY: 'this month', YEARLY: 'this year',
}[type] || 'in this period');

// ─── Shared CSS tokens ────────────────────────────────────────────────────────

const T = {
  primary:  '#3E2723',
  primary2: '#5D4037',
  accent:   '#D4A373',
  success:  '#2E7D4F',
  error:    '#B71C1C',
  warning:  '#B26A00',
  textPri:  '#2B1D1A',
  textSec:  '#6B5B57',
  textDim:  '#A09490',
  border:   '#DDD2CC',
  bg:       '#F5F3F1',
  surface:  '#ffffff',
};

// ─── HTML building blocks ─────────────────────────────────────────────────────

function htmlShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${T.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.bg};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function header(type, label, dateRange) {
  const typeColors = {
    DAILY:   { badge: 'rgba(212,163,115,0.22)', badgeText: '#D4A373', label: 'DAILY REPORT' },
    WEEKLY:  { badge: 'rgba(212,163,115,0.22)', badgeText: '#D4A373', label: 'WEEKLY REPORT' },
    MONTHLY: { badge: 'rgba(212,163,115,0.22)', badgeText: '#D4A373', label: 'MONTHLY REPORT' },
    YEARLY:  { badge: 'rgba(212,163,115,0.22)', badgeText: '#D4A373', label: 'ANNUAL REPORT' },
  };
  const c = typeColors[type] || typeColors.DAILY;

  return `
  <tr><td style="background:linear-gradient(135deg,${T.primary} 0%,${T.primary2} 100%);border-radius:14px 14px 0 0;padding:30px 32px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.2px">${BRAND_NAME}</span>
        </td>
        <td align="right">
          <span style="font-size:10px;font-weight:800;padding:5px 14px;border-radius:20px;background:${c.badge};color:${c.badgeText};letter-spacing:0.12em;white-space:nowrap">
            ${c.label}
          </span>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:16px">
        <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.4px">${label}</p>
        <p style="margin:5px 0 0;font-size:12.5px;color:rgba(255,255,255,0.55);font-weight:500">${dateRange}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function sectionTitle(title, icon) {
  return `
  <tr><td style="padding:22px 32px 10px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${icon ? `<td style="padding-right:7px;font-size:13px;line-height:1">${icon}</td>` : ''}
      <td style="font-size:10.5px;font-weight:800;color:${T.textDim};letter-spacing:0.14em;text-transform:uppercase">${title}</td>
    </tr></table>
  </td></tr>`;
}

// Single, calm informational card — used for "no activity" and per-section empty states.
function infoCard(message, icon = 'ℹ️', { emphasis = false } = {}) {
  return `
  <tr><td style="padding:0 32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${emphasis ? T.bg : '#FDFBFA'};border:1px ${emphasis ? 'solid' : 'dashed'} ${T.border};border-radius:12px">
      <tr><td style="padding:${emphasis ? '34px 24px' : '20px 20px'};text-align:center">
        <div style="font-size:${emphasis ? '26px' : '18px'};line-height:1;margin:0 0 8px">${icon}</div>
        <p style="margin:0;font-size:${emphasis ? '14px' : '12.5px'};font-weight:${emphasis ? '800' : '600'};color:${emphasis ? T.textPri : T.textSec}">${message}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function kpiGrid(kpis) {
  // Auto layout — each card shrinks/grows to fit its own content naturally
  const cols = kpis.length <= 3 ? kpis.length : 4;
  const rows = [];
  for (let i = 0; i < kpis.length; i += cols) {
    const chunk = kpis.slice(i, i + cols);
    rows.push(`
    <tr><td style="padding:0 32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px">
        <tr>
          ${chunk.map(k => `
          <td style="background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:14px 15px;vertical-align:top">
            <div style="width:22px;height:3px;border-radius:2px;background:${T.accent};margin-bottom:9px"></div>
            <p style="margin:0 0 3px;font-size:9px;font-weight:700;color:${T.textDim};letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap">${k.label}</p>
            <p style="margin:0;font-size:18px;font-weight:800;color:${T.textPri};letter-spacing:-0.3px;white-space:nowrap">${k.value}</p>
            ${k.sub ? `<p style="margin:3px 0 0;font-size:9px;font-weight:600;color:${T.textDim};white-space:nowrap">${k.sub}</p>` : ''}
            ${k.delta != null ? `<p style="margin:5px 0 0">${fmt.delta(k.delta)}</p>` : ''}
          </td>`).join('')}
        </tr>
      </table>
    </td></tr>`);
  }
  return rows.join('');
}

function divider() {
  return `<tr><td style="padding:2px 32px"><div style="height:1px;background:${T.border}"></div></td></tr>`;
}

function tableShell(theadCells, rowsHtml) {
  const th = `padding:10px 14px;font-size:9.5px;font-weight:700;color:${T.textDim};white-space:nowrap;letter-spacing:0.04em;text-transform:uppercase`;
  return `
  <tr><td style="padding:0 32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:12px;overflow:hidden">
      <tr style="background:${T.bg}">
        ${theadCells.map((c, i) => `<td style="${th}${i > 0 ? ';text-align:right' : ''}">${c}</td>`).join('')}
      </tr>
      ${rowsHtml}
    </table>
  </td></tr>`;
}

function paymentMethodsTable(methods) {
  if (!methods?.length) return infoCard('No payment activity recorded.', '💳');
  const dataRows = methods.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:${T.textPri};border-bottom:1px solid #F0E8E3">${m.method}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(m.amount)}</td>
      <td style="padding:10px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(m.count)} txns</td>
      <td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3">
        <span style="background:${T.bg};border-radius:5px;padding:2px 9px;font-size:11px;font-weight:600;color:${T.textSec}">${fmt.pct(m.share)}</span>
      </td>
    </tr>`).join('');

  return tableShell(['method', 'amount', 'volume', 'share'], dataRows);
}

function topProductsTable(products, limit = 5) {
  const shown = products.slice(0, limit);
  if (!shown.length) return infoCard('No products sold in this period.', '📦');

  const dataRows = shown.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:10px 16px;border-bottom:1px solid #F0E8E3;vertical-align:middle">
        <span style="display:inline-block;width:20px;height:20px;border-radius:6px;background:${i === 0 ? T.primary : T.bg};color:${i === 0 ? T.accent : T.textDim};font-size:11px;font-weight:800;text-align:center;line-height:20px;margin-right:8px;vertical-align:middle">${p.rank ?? i + 1}</span>
        <span style="font-size:13px;font-weight:600;color:${T.textPri};vertical-align:middle">${p.productName ?? '—'}</span>
        ${p.sku ? `<span style="font-size:10px;color:${T.textDim};margin-left:5px;vertical-align:middle">${p.sku}</span>` : ''}
      </td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.currency(p.netRevenue)}</td>
      <td style="padding:10px 16px;font-size:12px;font-weight:600;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.number(p.qtySold)}</td>
      <td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">
        ${p.refundRate > 0 ? `<span style="color:${T.error};font-size:11px;font-weight:700">${fmt.pct(p.refundRate)}</span>` : '<span style="color:#C4BAB7;font-size:11px">—</span>'}
      </td>
    </tr>`).join('');

  return tableShell(['product', 'net revenue', 'units', 'refund rate'], dataRows);
}

function cashierTable(cashiers, limit = 10) {
  const shown = cashiers.slice(0, limit);
  if (!shown.length) return infoCard('No cashier activity recorded.', '🧑‍💼');
  const dataRows = shown.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:10px 16px;border-bottom:1px solid #F0E8E3">
        <span style="font-size:13px;font-weight:600;color:${T.textPri}">${c.name ?? '—'}</span>
        ${c.employeeCode ? `<span style="font-size:10px;color:${T.textDim};margin-left:5px">${c.employeeCode}</span>` : ''}
      </td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(c.netRevenue)}</td>
      <td style="padding:10px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(c.txnCount)}</td>
      <td style="padding:10px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(c.avgTicket)}</td>
      <td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3">
        ${c.refundRate > 0 ? `<span style="color:${T.error};font-size:11px;font-weight:700">${fmt.pct(c.refundRate)}</span>` : '<span style="color:#C4BAB7;font-size:11px">—</span>'}
      </td>
    </tr>`).join('');

  return tableShell(['cashier', 'net revenue', 'trans', 'avg ticket', 'ref rate'], dataRows);
}

function refundSummaryBlock(refunds) {
  const productRows = (refunds?.byProduct || []).slice(0, 5);
  if (!productRows.length) return infoCard('No refunds processed in this period.', '↩️');

  const rowsHtml = productRows.map(p => `
    <tr>
      <td style="padding:8px 0;font-size:12px;color:${T.textPri};border-bottom:1px solid #F0E8E3">${p.productName || '—'}</td>
      <td style="padding:8px 0;font-size:12px;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(p.count)}</td>
      <td style="padding:8px 0;font-size:12px;color:${T.error};font-weight:700;text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(p.amount)}</td>
    </tr>`).join('');

  return `
  <tr><td style="padding:0 32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(183,28,28,0.04);border:1px solid rgba(183,28,28,0.18);border-radius:12px;overflow:hidden">
      <tr style="background:rgba(183,28,28,0.08)">
        <td colspan="3" style="padding:11px 16px;font-size:9.5px;font-weight:700;color:${T.error};letter-spacing:0.10em;text-transform:uppercase">Top Refunded Products</td>
      </tr>
      <tr><td colspan="3" style="padding:0 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;font-size:9.5px;font-weight:700;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em">Product</td>
            <td style="padding:7px 0;font-size:9.5px;font-weight:700;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em;text-align:right">Count</td>
            <td style="padding:7px 0;font-size:9.5px;font-weight:700;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em;text-align:right">Amount</td>
          </tr>
          ${rowsHtml}
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function trendSummaryBlock(trend, groupBy) {
  const points = (trend?.current || []).slice(-7); // last 7 data points
  if (!points.length) return infoCard('No revenue trend data available for this period.', '📈');

  const maxRev = Math.max(...points.map(p => p.revenue), 1);
  const bars = points.map(p => {
    const pct = Math.round((p.revenue / maxRev) * 100);
    return `
    <td align="center" valign="bottom" style="padding:0 3px;vertical-align:bottom">
      <div style="width:36px;background:${T.primary};border-radius:4px 4px 0 0;height:${Math.max(pct * 0.8, 4)}px;min-height:4px;margin:0 auto"></div>
      <p style="margin:5px 0 0;font-size:9px;color:${T.textDim};text-align:center;white-space:nowrap">${p.period.slice(-5)}</p>
      <p style="margin:2px 0 0;font-size:9px;font-weight:700;color:${T.textSec};text-align:center">${fmt.currency(p.revenue)}</p>
    </td>`;
  }).join('');

  return `
  <tr><td style="padding:0 32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:12px;padding:16px 16px">
      <tr><td>
        <p style="margin:0 0 14px;font-size:10px;font-weight:700;color:${T.textDim};letter-spacing:0.1em;text-transform:uppercase">Revenue Trend (${groupBy})</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr style="vertical-align:bottom">${bars}</tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function groupSalesTable(groups, type, limit = 8) {
  if (!groups?.length) return infoCard('No group performance data available.', '👥');

  const sorted = [...groups].sort((a, b) => b.stats.revenue - a.stats.revenue).slice(0, limit);
  const topGroup = sorted[0];
  const hasTopPerformer = topGroup && Number(topGroup.stats?.revenue) > 0;

  const topCallout = hasTopPerformer ? `
  <tr><td style="padding:0 32px 10px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(46,125,79,0.06);border:1.5px solid rgba(46,125,79,0.25);border-radius:12px;padding:15px 18px">
      <tr>
        <td style="vertical-align:middle">
          <span style="font-size:10px;font-weight:700;color:${T.success};letter-spacing:0.1em;text-transform:uppercase">Top Performing Group</span>
          <p style="margin:3px 0 0;font-size:17px;font-weight:800;color:${T.textPri}">${topGroup.groupName}</p>
          <p style="margin:2px 0 0;font-size:12px;color:${T.textSec}">${topGroup.stats.memberCount} members &middot; ${topGroup.stats.txnCount} transactions &middot; ${fmt.pct(topGroup.stats.attendanceRate)} attendance</p>
        </td>
        <td align="right" style="vertical-align:middle;white-space:nowrap">
          <p style="margin:0;font-size:22px;font-weight:800;color:${T.success}">${fmt.currency(topGroup.stats.revenue)}</p>
          <p style="margin:2px 0 0;font-size:11px;color:${T.textSec};text-align:right">${fmt.currency(topGroup.stats.avgTicket)} avg ticket</p>
        </td>
      </tr>
    </table>
  </td></tr>` : infoCard(`No top group performer ${periodNoun(type)}.`, '🏆');

  const dataRows = sorted.map((g, i) => {
    const s = g.stats;
    const isTop = i === 0;
    return `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:10px 16px;border-bottom:1px solid #F0E8E3;vertical-align:middle">
        <span style="display:inline-block;width:20px;height:20px;border-radius:6px;background:${isTop ? T.primary : T.bg};color:${isTop ? T.accent : T.textDim};font-size:11px;font-weight:800;text-align:center;line-height:20px;margin-right:8px;vertical-align:middle">${i + 1}</span>
        <span style="font-size:13px;font-weight:${isTop ? '700' : '600'};color:${T.textPri};vertical-align:middle">${g.groupName}</span>
      </td>
      <td style="padding:10px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(s.memberCount)}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:${T.success};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.currency(s.revenue)}</td>
      <td style="padding:10px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(s.txnCount)}</td>
      <td style="padding:10px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.currency(s.avgTicket)}</td>
      <td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">
        ${s.refundRate > 0 ? `<span style="color:${s.refundRate > 5 ? T.error : T.warning};font-size:11px;font-weight:700">${fmt.pct(s.refundRate)}</span>` : '<span style="color:#C4BAB7;font-size:11px">—</span>'}
      </td>
      <td style="padding:10px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">
        <span style="color:${s.attendanceRate >= 80 ? T.success : s.attendanceRate >= 50 ? T.warning : T.error};font-size:11px;font-weight:700">${fmt.pct(s.attendanceRate)}</span>
      </td>
    </tr>`;
  }).join('');

  return topCallout + tableShell(['group', 'members', 'net revenue', 'trans', 'avg ticket', 'refund %', 'attendance'], dataRows);
}

function viewFullReportButton() {
  const url = `${APP_URL}/manager/reports/overall`;
  return `
  <tr><td style="padding:22px 32px 6px;text-align:center">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto">
      <tr>
        <td style="background:${T.primary};border-radius:10px;padding:0">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 34px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.02em;border-radius:10px">
            View Full Report &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:12px 0 0;font-size:11px;color:${T.textDim}">
      Opens the live reports dashboard in your manager portal.
    </p>
  </td></tr>`;
}

function emailFooter(type, generatedAt) {
  return `
  <tr><td style="background:${T.bg};border-top:1px solid ${T.border};border-radius:0 0 14px 14px;padding:20px 32px;text-align:center">
    <p style="margin:0;font-size:11.5px;font-weight:700;color:${T.textSec}">
      ${BRAND_NAME}
    </p>
    <p style="margin:4px 0 0;font-size:11px;color:${T.textDim}">
      Automated ${type.toLowerCase()} report &middot; generated ${new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
    </p>
    <p style="margin:8px 0 0;font-size:10.5px;color:${T.textDim}">
      You're receiving this because you're a manager or admin on ${BRAND_NAME}.
    </p>
  </td></tr>`;
}

// ─── Shared report-data shaping (used by both HTML + text builders) ──────────

function shapeReport({ type, summary, payments, products, cashiers, refunds, trend, groups }) {
  const cur = summary?.current || {};
  const deltas = summary?.deltas || {};
  const hasActivity = Number(cur.txnCount || 0) > 0;

  const kpis = [
    { label: 'Net Revn',  value: fmt.currency(cur.netRevenue), sub: `Gross ${fmt.currency(cur.grossRevenue)}`, delta: deltas.netRevenue },
    { label: 'Trans',     value: fmt.number(cur.txnCount),     sub: `Avg ${fmt.currency(cur.avgTicket)}`,       delta: deltas.txnCount },
    { label: 'Ref Rate',  value: fmt.pct(cur.refundRate),      sub: `${cur.refundCount ?? 0} refunds · ${fmt.currency(cur.refundedAmount)}`, delta: deltas.refundedAmount != null ? -deltas.refundedAmount : null },
    { label: 'Tax Coll',  value: fmt.currency(cur.taxTotal),   sub: `Disc ${fmt.currency(cur.discountTotal)}`,  delta: deltas.taxTotal },
  ];

  const extendedKpis = type !== 'DAILY' ? [
    { label: 'Gross Revn',  value: fmt.currency(cur.grossRevenue) },
    { label: 'Items Sold',  value: fmt.number(cur.itemsSold) },
    { label: 'Items / Txn', value: fmt.number(cur.itemsPerTxn) },
    { label: 'Avg Ticket',  value: fmt.currency(cur.avgTicket), delta: deltas.avgTicket },
  ] : [];

  const productLimit = type === 'DAILY' ? 5 : type === 'WEEKLY' ? 8 : 10;
  const cashierLimit  = type === 'DAILY' ? 5 : 10;

  return { cur, deltas, hasActivity, kpis, extendedKpis, productLimit, cashierLimit };
}

// ─── Main export — HTML ───────────────────────────────────────────────────────

export function buildReportHtml({ type, label, start, end, summary, payments, products, cashiers, refunds, trend, groups }) {
  const dateRange = `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} – ${new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  const generatedAt = new Date().toISOString();

  const groupByMap = { DAILY: 'hour', WEEKLY: 'day', MONTHLY: 'week', YEARLY: 'month' };
  const groupBy = groupByMap[type] || 'day';

  const { hasActivity, kpis, extendedKpis, productLimit, cashierLimit } = shapeReport({ type, summary, payments, products, cashiers, refunds, trend, groups });

  const body = `
    ${header(type, label, dateRange)}

    <tr><td style="background:${T.surface};border:1px solid ${T.border};border-top:none">

      <!-- KPIs -->
      ${sectionTitle('Key Performance Indicators', '⚡')}
      ${hasActivity
        ? kpiGrid(kpis) + (extendedKpis.length ? kpiGrid(extendedKpis) : '')
        : infoCard(`No sales recorded ${periodNoun(type)}.`, '🧾', { emphasis: true })}

      ${divider()}

      <!-- Revenue Trend (weekly+ only) -->
      ${type !== 'DAILY' ? sectionTitle('Revenue Trend', '📈') : ''}
      ${type !== 'DAILY' ? trendSummaryBlock(trend, groupBy) : ''}

      ${type !== 'DAILY' ? divider() : ''}

      <!-- Payment Methods -->
      ${sectionTitle('Payment Method Breakdown', '💳')}
      ${paymentMethodsTable(payments?.methods)}

      ${divider()}

      <!-- Top Products -->
      ${sectionTitle(`Top ${productLimit} Products by Net Revenue`, '📦')}
      ${topProductsTable(products, productLimit)}

      ${divider()}

      <!-- Cashier Performance (weekly+ only) -->
      ${type !== 'DAILY' ? sectionTitle('Cashier Performance', '🧑‍💼') : ''}
      ${type !== 'DAILY' ? cashierTable(cashiers, cashierLimit) : ''}

      ${type !== 'DAILY' ? divider() : ''}

      <!-- Group Sales Report -->
      ${sectionTitle('Group Sales Report', '👥')}
      ${groupSalesTable(groups, type)}

      ${divider()}

      <!-- Refund Analysis (monthly+ only) -->
      ${['MONTHLY', 'YEARLY'].includes(type) ? sectionTitle('Refund Analysis', '↩️') : ''}
      ${['MONTHLY', 'YEARLY'].includes(type) ? refundSummaryBlock(refunds) : ''}

    </td></tr>

    ${viewFullReportButton()}

    ${emailFooter(type, generatedAt)}
  `;

  const subjects = {
    DAILY:   `Daily Sales Report — ${label}`,
    WEEKLY:  `Weekly Sales Report — ${label}`,
    MONTHLY: `Monthly Sales Report — ${label}`,
    YEARLY:  `Annual Sales Report — ${label}`,
  };

  return htmlShell(subjects[type] || `Sales Report — ${label}`, body);
}

// ─── Plain-text alternative (multipart/alternative — required for deliverability) ──

export function buildReportText({ type, label, start, end, summary, payments, products, cashiers, refunds, trend, groups }) {
  const dateRange = `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} – ${new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  const { cur, hasActivity, productLimit, cashierLimit } = shapeReport({ type, summary, payments, products, cashiers, refunds, trend, groups });

  const lines = [];
  lines.push(`${BRAND_NAME} — ${label}`);
  lines.push(dateRange);
  lines.push('');

  if (!hasActivity) {
    lines.push(`No sales recorded ${periodNoun(type)}.`);
  } else {
    lines.push('KEY PERFORMANCE INDICATORS');
    lines.push(`Net Revenue: ${fmt.currency(cur.netRevenue)} (Gross ${fmt.currency(cur.grossRevenue)})`);
    lines.push(`Transactions: ${fmt.number(cur.txnCount)} (Avg ${fmt.currency(cur.avgTicket)})`);
    lines.push(`Refund Rate: ${fmt.pct(cur.refundRate)} (${cur.refundCount ?? 0} refunds, ${fmt.currency(cur.refundedAmount)})`);
    lines.push(`Tax Collected: ${fmt.currency(cur.taxTotal)} (Discounts ${fmt.currency(cur.discountTotal)})`);
    lines.push('');

    const methods = payments?.methods || [];
    lines.push('PAYMENT METHODS');
    lines.push(methods.length
      ? methods.map((m) => `${m.method}: ${fmt.currency(m.amount)} (${fmt.number(m.count)} txns, ${fmt.pct(m.share)})`).join('\n')
      : 'No payment activity recorded.');
    lines.push('');

    const topProducts = (products || []).slice(0, productLimit);
    lines.push(`TOP PRODUCTS`);
    lines.push(topProducts.length
      ? topProducts.map((p, i) => `${i + 1}. ${p.productName ?? '—'} — ${fmt.currency(p.netRevenue)} (${fmt.number(p.qtySold)} units)`).join('\n')
      : 'No products sold in this period.');
    lines.push('');

    if (type !== 'DAILY') {
      const topCashiers = (cashiers || []).slice(0, cashierLimit);
      lines.push('CASHIER PERFORMANCE');
      lines.push(topCashiers.length
        ? topCashiers.map((c) => `${c.name ?? '—'}: ${fmt.currency(c.netRevenue)} (${fmt.number(c.txnCount)} txns)`).join('\n')
        : 'No cashier activity recorded.');
      lines.push('');
    }
  }

  lines.push('GROUP SALES');
  lines.push((groups || []).length
    ? [...groups].sort((a, b) => b.stats.revenue - a.stats.revenue).slice(0, 8)
        .map((g) => `${g.groupName}: ${fmt.currency(g.stats.revenue)} (${g.stats.memberCount} members, ${fmt.pct(g.stats.attendanceRate)} attendance)`).join('\n')
    : 'No group performance data available.');
  lines.push('');

  if (['MONTHLY', 'YEARLY'].includes(type)) {
    const refundRows = refunds?.byProduct || [];
    lines.push('REFUND ANALYSIS');
    lines.push(refundRows.length
      ? refundRows.slice(0, 5).map((p) => `${p.productName || '—'}: ${fmt.number(p.count)} refunds, ${fmt.currency(p.amount)}`).join('\n')
      : 'No refunds processed in this period.');
    lines.push('');
  }

  lines.push(`View the full report: ${APP_URL}/manager/reports/overall`);
  lines.push('');
  lines.push(`${BRAND_NAME} — automated ${type.toLowerCase()} report`);

  return lines.join('\n');
}
