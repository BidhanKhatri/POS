/**
 * reportEmailService.js
 * Builds production-grade HTML email bodies for scheduled sales reports.
 * Called by cronReportService — never directly by controllers.
 *
 * Design: table-based layout so it renders correctly across all email clients
 * (Gmail, Outlook, Apple Mail, mobile). Inline styles only.
 */

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

// ─── Shared CSS tokens ────────────────────────────────────────────────────────

const T = {
  primary:  '#3E2723',
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
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${T.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${T.bg};padding:24px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function header(type, label, dateRange) {
  const typeColors = {
    DAILY:   { bg: '#3E2723', badge: 'rgba(212,163,115,0.22)', badgeText: '#D4A373', label: 'DAILY REPORT' },
    WEEKLY:  { bg: '#1B3A2D', badge: 'rgba(46,125,79,0.22)',   badgeText: '#69f0ae', label: 'WEEKLY REPORT' },
    MONTHLY: { bg: '#1A237E', badge: 'rgba(92,107,192,0.25)',  badgeText: '#9FA8DA', label: 'MONTHLY REPORT' },
    YEARLY:  { bg: '#212121', badge: 'rgba(158,158,158,0.22)', badgeText: '#EEEEEE', label: 'ANNUAL REPORT' },
  };
  const c = typeColors[type] || typeColors.DAILY;

  return `
  <tr><td style="background:${c.bg};border-radius:12px 12px 0 0;padding:28px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.3px">POS System</span>
        </td>
        <td align="right">
          <span style="font-size:11px;font-weight:800;padding:4px 14px;border-radius:20px;background:${c.badge};color:${c.badgeText};letter-spacing:0.1em">
            ${c.label}
          </span>
        </td>
      </tr>
      <tr><td colspan="2" style="padding-top:10px">
        <p style="margin:0;font-size:16px;font-weight:700;color:rgba(255,255,255,0.85)">${label}</p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.50)">${dateRange}</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function sectionTitle(title) {
  return `
  <tr><td style="padding:20px 32px 8px">
    <p style="margin:0;font-size:10px;font-weight:700;color:${T.textDim};letter-spacing:0.14em;text-transform:uppercase">${title}</p>
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
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px">
        <tr>
          ${chunk.map(k => `
          <td style="background:${T.surface};border:1px solid ${T.border};border-radius:10px;padding:13px 14px;vertical-align:top">
            <p style="margin:0 0 3px;font-size:9px;font-weight:700;color:${T.textDim};letter-spacing:0.06em;text-transform:uppercase;white-space:nowrap">${k.label}</p>
            <p style="margin:0;font-size:17px;font-weight:800;color:${T.textPri};letter-spacing:-0.3px;white-space:nowrap">${k.value}</p>
            ${k.sub ? `<p style="margin:2px 0 0;font-size:9px;font-weight:600;color:${T.textDim};white-space:nowrap">${k.sub}</p>` : ''}
            ${k.delta != null ? `<p style="margin:4px 0 0">${fmt.delta(k.delta)}</p>` : ''}
          </td>`).join('')}
        </tr>
      </table>
    </td></tr>`);
  }
  return rows.join('');
}

function divider() {
  return `<tr><td style="padding:0 32px"><div style="height:1px;background:${T.border}"></div></td></tr>`;
}

function paymentMethodsTable(methods) {
  if (!methods?.length) return '';
  const dataRows = methods.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:9px 16px;font-size:13px;font-weight:600;color:${T.textPri};border-bottom:1px solid #F0E8E3">${m.method}</td>
      <td style="padding:9px 16px;font-size:13px;font-weight:700;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(m.amount)}</td>
      <td style="padding:9px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(m.count)} txns</td>
      <td style="padding:9px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3">
        <span style="background:${T.bg};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:${T.textSec}">${fmt.pct(m.share)}</span>
      </td>
    </tr>`).join('');

  const th = `padding:9px 14px;font-size:10px;font-weight:600;color:${T.textDim};white-space:nowrap`;
  return `
  <tr><td style="padding:0 32px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:10px;overflow:hidden">
      <tr style="background:${T.bg}">
        <td style="${th}">method</td>
        <td style="${th};text-align:right">amount</td>
        <td style="${th};text-align:right">volume</td>
        <td style="${th};text-align:right">share</td>
      </tr>
      ${dataRows}
    </table>
  </td></tr>`;
}

function topProductsTable(products, limit = 5) {
  const shown = products.slice(0, limit);
  if (!shown.length) return '';

  // Flat single table — headers and data rows in the same <table> so columns align perfectly
  const dataRows = shown.map((p, i) => `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:9px 16px;border-bottom:1px solid #F0E8E3;vertical-align:middle">
        <span style="display:inline-block;width:20px;height:20px;border-radius:5px;background:${i === 0 ? T.primary : T.bg};color:${i === 0 ? T.accent : T.textDim};font-size:11px;font-weight:800;text-align:center;line-height:20px;margin-right:8px;vertical-align:middle">${p.rank ?? i + 1}</span>
        <span style="font-size:13px;font-weight:600;color:${T.textPri};vertical-align:middle">${p.productName ?? '—'}</span>
        ${p.sku ? `<span style="font-size:10px;color:${T.textDim};margin-left:5px;vertical-align:middle">${p.sku}</span>` : ''}
      </td>
      <td style="padding:9px 16px;font-size:13px;font-weight:700;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.currency(p.netRevenue)}</td>
      <td style="padding:9px 16px;font-size:12px;font-weight:600;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.number(p.qtySold)}</td>
      <td style="padding:9px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">
        ${p.refundRate > 0 ? `<span style="color:${T.error};font-size:11px;font-weight:700">${fmt.pct(p.refundRate)}</span>` : '<span style="color:#C4BAB7;font-size:11px">—</span>'}
      </td>
    </tr>`).join('');

  const th = `padding:9px 14px;font-size:10px;font-weight:600;color:${T.textDim};white-space:nowrap`;
  return `
  <tr><td style="padding:0 32px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:10px;overflow:hidden">
      <tr style="background:${T.bg}">
        <td style="${th}">product</td>
        <td style="${th};text-align:right">net revenue</td>
        <td style="${th};text-align:right">units</td>
        <td style="${th};text-align:right">refund rate</td>
      </tr>
      ${dataRows}
    </table>
  </td></tr>`;
}

function cashierTable(cashiers, limit = 10) {
  const shown = cashiers.slice(0, limit);
  if (!shown.length) return '';
  const dataRows = shown.map((c, i) => `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:9px 16px;border-bottom:1px solid #F0E8E3">
        <span style="font-size:13px;font-weight:600;color:${T.textPri}">${c.name ?? '—'}</span>
        ${c.employeeCode ? `<span style="font-size:10px;color:${T.textDim};margin-left:5px">${c.employeeCode}</span>` : ''}
      </td>
      <td style="padding:9px 16px;font-size:13px;font-weight:700;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(c.netRevenue)}</td>
      <td style="padding:9px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(c.txnCount)}</td>
      <td style="padding:9px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(c.avgTicket)}</td>
      <td style="padding:9px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3">
        ${c.refundRate > 0 ? `<span style="color:${T.error};font-size:11px;font-weight:700">${fmt.pct(c.refundRate)}</span>` : '<span style="color:#C4BAB7;font-size:11px">—</span>'}
      </td>
    </tr>`).join('');

  const th = `padding:9px 14px;font-size:10px;font-weight:600;color:${T.textDim};white-space:nowrap`;
  return `
  <tr><td style="padding:0 32px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:10px;overflow:hidden">
      <tr style="background:${T.bg}">
        <td style="${th}">cashier</td>
        <td style="${th};text-align:right">net revenue</td>
        <td style="${th};text-align:right">trans</td>
        <td style="${th};text-align:right">avg ticket</td>
        <td style="${th};text-align:right">ref rate</td>
      </tr>
      ${dataRows}
    </table>
  </td></tr>`;
}

function refundSummaryBlock(refunds) {
  if (!refunds?.byProduct?.length && !refunds?.byEmployee?.length) return '';
  const productRows = (refunds.byProduct || []).slice(0, 5).map(p => `
    <tr>
      <td style="padding:7px 0;font-size:12px;color:${T.textPri};border-bottom:1px solid #F0E8E3">${p.productName || '—'}</td>
      <td style="padding:7px 0;font-size:12px;color:${T.textPri};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(p.count)}</td>
      <td style="padding:7px 0;font-size:12px;color:${T.error};font-weight:700;text-align:right;border-bottom:1px solid #F0E8E3">${fmt.currency(p.amount)}</td>
    </tr>`).join('');

  return `
  <tr><td style="padding:0 32px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(183,28,28,0.04);border:1px solid rgba(183,28,28,0.18);border-radius:10px;overflow:hidden">
      <tr style="background:rgba(183,28,28,0.08)">
        <td colspan="3" style="padding:10px 16px;font-size:10px;font-weight:700;color:${T.error};letter-spacing:0.10em;text-transform:uppercase">Top Refunded Products</td>
      </tr>
      <tr><td colspan="3" style="padding:0 16px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;font-size:10px;font-weight:700;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em">Product</td>
            <td style="padding:6px 0;font-size:10px;font-weight:700;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em;text-align:right">Count</td>
            <td style="padding:6px 0;font-size:10px;font-weight:700;color:${T.textDim};text-transform:uppercase;letter-spacing:0.06em;text-align:right">Amount</td>
          </tr>
          ${productRows || '<tr><td colspan="3" style="padding:8px 0;font-size:12px;color:#9E9E9E">No refunds in this period</td></tr>'}
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function trendSummaryBlock(trend, groupBy) {
  if (!trend?.current?.length) return '';
  const points = trend.current.slice(-7); // last 7 data points
  if (!points.length) return '';

  const maxRev = Math.max(...points.map(p => p.revenue), 1);
  const bars = points.map(p => {
    const pct = Math.round((p.revenue / maxRev) * 100);
    return `
    <td align="center" valign="bottom" style="padding:0 3px;vertical-align:bottom">
      <div style="width:36px;background:${T.primary};border-radius:4px 4px 0 0;height:${Math.max(pct * 0.8, 4)}px;min-height:4px;margin:0 auto"></div>
      <p style="margin:4px 0 0;font-size:9px;color:${T.textDim};text-align:center;white-space:nowrap">${p.period.slice(-5)}</p>
      <p style="margin:2px 0 0;font-size:9px;font-weight:700;color:${T.textSec};text-align:center">${fmt.currency(p.revenue).replace('$', '$')}</p>
    </td>`;
  }).join('');

  return `
  <tr><td style="padding:0 32px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:10px;padding:14px 16px">
      <tr><td>
        <p style="margin:0 0 14px;font-size:10px;font-weight:700;color:${T.textDim};letter-spacing:0.1em;text-transform:uppercase">Revenue Trend (${groupBy})</p>
        <table cellpadding="0" cellspacing="0"><tr style="vertical-align:bottom">${bars}</tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function groupSalesTable(groups, limit = 8) {
  if (!groups?.length) return '';
  const sorted = [...groups].sort((a, b) => b.stats.revenue - a.stats.revenue).slice(0, limit);
  const topGroup = sorted[0];

  // Top group highlight callout
  const topCallout = topGroup ? `
  <tr><td style="padding:0 32px 10px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(46,125,79,0.06);border:1.5px solid rgba(46,125,79,0.25);border-radius:10px;padding:14px 18px">
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
  </td></tr>` : '';

  const dataRows = sorted.map((g, i) => {
    const s = g.stats;
    const isTop = i === 0;
    return `
    <tr style="background:${i % 2 === 0 ? T.surface : '#FDFBFA'}">
      <td style="padding:9px 16px;border-bottom:1px solid #F0E8E3;vertical-align:middle">
        <span style="display:inline-block;width:20px;height:20px;border-radius:5px;background:${isTop ? T.primary : T.bg};color:${isTop ? T.accent : T.textDim};font-size:11px;font-weight:800;text-align:center;line-height:20px;margin-right:8px;vertical-align:middle">${i + 1}</span>
        <span style="font-size:13px;font-weight:${isTop ? '700' : '600'};color:${T.textPri};vertical-align:middle">${g.groupName}</span>
      </td>
      <td style="padding:9px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(s.memberCount)}</td>
      <td style="padding:9px 16px;font-size:13px;font-weight:700;color:${T.success};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.currency(s.revenue)}</td>
      <td style="padding:9px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3">${fmt.number(s.txnCount)}</td>
      <td style="padding:9px 16px;font-size:12px;color:${T.textSec};text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">${fmt.currency(s.avgTicket)}</td>
      <td style="padding:9px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">
        ${s.refundRate > 0 ? `<span style="color:${s.refundRate > 5 ? T.error : T.warning};font-size:11px;font-weight:700">${fmt.pct(s.refundRate)}</span>` : '<span style="color:#C4BAB7;font-size:11px">—</span>'}
      </td>
      <td style="padding:9px 16px;font-size:12px;text-align:right;border-bottom:1px solid #F0E8E3;white-space:nowrap">
        <span style="color:${s.attendanceRate >= 80 ? T.success : s.attendanceRate >= 50 ? T.warning : T.error};font-size:11px;font-weight:700">${fmt.pct(s.attendanceRate)}</span>
      </td>
    </tr>`;
  }).join('');

  const th = `padding:9px 14px;font-size:10px;font-weight:600;color:${T.textDim};white-space:nowrap`;
  const tableHtml = `
  <tr><td style="padding:0 32px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${T.surface};border:1px solid ${T.border};border-radius:10px;overflow:hidden">
      <tr style="background:${T.bg}">
        <td style="${th}">group</td>
        <td style="${th};text-align:right">members</td>
        <td style="${th};text-align:right">net revenue</td>
        <td style="${th};text-align:right">trans</td>
        <td style="${th};text-align:right">avg ticket</td>
        <td style="${th};text-align:right">refund %</td>
        <td style="${th};text-align:right">attendance</td>
      </tr>
      ${dataRows}
    </table>
  </td></tr>`;

  return topCallout + tableHtml;
}

function viewFullReportButton() {
  const url = (process.env.APP_URL || 'http://localhost:5173') + '/manager/reports/overall';
  return `
  <tr><td style="padding:20px 32px 4px;text-align:center">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto">
      <tr>
        <td style="background:${T.primary};border-radius:10px;padding:0">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:13px 32px;font-size:13px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:0.02em;border-radius:10px">
            View Full Report &rarr;
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:10px 0 0;font-size:11px;color:${T.textDim}">
      Opens the live reports dashboard in your manager portal.
    </p>
  </td></tr>`;
}

function emailFooter(type, generatedAt) {
  return `
  <tr><td style="background:${T.bg};border-top:1px solid ${T.border};border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:${T.textDim}">
      Automated ${type.toLowerCase()} report · POS System
    </p>
    <p style="margin:4px 0 0;font-size:11px;color:${T.textDim}">
      Generated ${new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
    </p>
  </td></tr>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildReportHtml({ type, label, start, end, summary, payments, products, cashiers, refunds, trend, groups }) {
  const cur = summary?.current || {};
  const deltas = summary?.deltas || {};
  const dateRange = `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} – ${new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  const generatedAt = new Date().toISOString();

  const groupByMap = { DAILY: 'hour', WEEKLY: 'day', MONTHLY: 'week', YEARLY: 'month' };
  const groupBy = groupByMap[type] || 'day';

  // Row 1 — mirrors the 4 KPI cards in /manager/reports/overall (labels shortened for email width)
  const kpis = [
    {
      label: 'Net Revn',
      value: fmt.currency(cur.netRevenue),
      sub:   `Gross ${fmt.currency(cur.grossRevenue)}`,
      delta: deltas.netRevenue,
    },
    {
      label: 'Trans',
      value: fmt.number(cur.txnCount),
      sub:   `Avg ${fmt.currency(cur.avgTicket)}`,
      delta: deltas.txnCount,
    },
    {
      label: 'Ref Rate',
      value: fmt.pct(cur.refundRate),
      sub:   `${cur.refundCount ?? 0} refunds · ${fmt.currency(cur.refundedAmount)}`,
      delta: deltas.refundedAmount != null ? -deltas.refundedAmount : null,
    },
    {
      label: 'Tax Coll',
      value: fmt.currency(cur.taxTotal),
      sub:   `Disc ${fmt.currency(cur.discountTotal)}`,
      delta: deltas.taxTotal,
    },
  ];

  // Row 2 — extended metrics for longer periods
  const extendedKpis = type !== 'DAILY' ? [
    { label: 'Gross Revn',   value: fmt.currency(cur.grossRevenue) },
    { label: 'Items Sold',   value: fmt.number(cur.itemsSold) },
    { label: 'Items / Txn',  value: fmt.number(cur.itemsPerTxn) },
    { label: 'Avg Ticket',   value: fmt.currency(cur.avgTicket), delta: deltas.avgTicket },
  ] : [];

  const productLimit = type === 'DAILY' ? 5 : type === 'WEEKLY' ? 8 : 10;
  const cashierLimit = type === 'DAILY' ? 5 : 10;

  const body = `
    ${header(type, label, dateRange)}

    <tr><td style="background:${T.surface};border:1px solid ${T.border};border-top:none">

      <!-- KPIs -->
      ${sectionTitle('Key Performance Indicators')}
      ${kpiGrid(kpis)}
      ${extendedKpis.length ? kpiGrid(extendedKpis) : ''}

      ${divider()}

      <!-- Revenue Trend (weekly+ only) -->
      ${type !== 'DAILY' && trend?.current?.length ? sectionTitle('Revenue Trend') : ''}
      ${type !== 'DAILY' ? trendSummaryBlock(trend, groupBy) : ''}

      ${type !== 'DAILY' ? divider() : ''}

      <!-- Payment Methods -->
      ${sectionTitle('Payment Method Breakdown')}
      ${paymentMethodsTable(payments?.methods)}

      ${divider()}

      <!-- Top Products -->
      ${sectionTitle(`Top ${productLimit} Products by Net Revenue`)}
      ${topProductsTable(products, productLimit)}

      ${divider()}

      <!-- Cashier Performance (weekly+ only) -->
      ${type !== 'DAILY' ? sectionTitle('Cashier Performance') : ''}
      ${type !== 'DAILY' ? cashierTable(cashiers, cashierLimit) : ''}

      ${type !== 'DAILY' ? divider() : ''}

      <!-- Group Sales Report -->
      ${groups?.length ? sectionTitle('Group Sales Report') : ''}
      ${groups?.length ? groupSalesTable(groups) : ''}

      ${groups?.length ? divider() : ''}

      <!-- Refund Analysis (monthly+ only) -->
      ${['MONTHLY', 'YEARLY'].includes(type) ? sectionTitle('Refund Analysis') : ''}
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
