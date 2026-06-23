import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildReceiptHtml(sale) {
  const dateStr = sale.createdAt
    ? new Date(sale.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  const isRefund = sale.transactionType === 'RF';
  const methodLabels = { CASH: 'Cash', CREDIT: 'Credit Card', DEBIT: 'Debit Card', MISC: 'Miscellaneous' };
  const methodLabel = methodLabels[sale.method] || sale.method || 'N/A';
  const cardRef = sale.card ? ` •••• ${sale.card.last4}` : '';
  const total = sale.grandTotal ?? sale.amount ?? 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt — ${sale.invoiceNo}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f3f1; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrap { max-width: 520px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(62,39,35,0.10); }
    .header { background: linear-gradient(135deg, #3E2723 0%, #5D4037 100%); padding: 24px 28px; }
    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .brand { font-size: 20px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
    .badge { font-size: 11px; font-weight: 800; padding: 3px 12px; border-radius: 20px; letter-spacing: 0.1em;
      background: ${isRefund ? 'rgba(183,28,28,0.25)' : 'rgba(46,125,79,0.25)'};
      border: 1px solid ${isRefund ? 'rgba(183,28,28,0.45)' : 'rgba(46,125,79,0.45)'};
      color: ${isRefund ? '#ff8a80' : '#69f0ae'}; }
    .invoice-label { font-size: 12px; color: rgba(255,255,255,0.55); font-weight: 500; letter-spacing: 0.04em; }
    .body { padding: 24px 28px; }
    .amount-row { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 0; border-bottom: 1.5px dashed #E6DAD5; margin-bottom: 16px; }
    .amount-label { font-size: 12px; font-weight: 600; color: #A09490; text-transform: uppercase; letter-spacing: 0.07em; }
    .amount-value { font-size: 32px; font-weight: 800; color: #2B1D1A; letter-spacing: -1px; }
    .amount-currency { font-size: 18px; font-weight: 700; color: #D4A373; margin-right: 2px; }
    .row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F0E8E3; }
    .row:last-child { border-bottom: none; }
    .row-label { font-size: 12px; font-weight: 600; color: #A09490; text-transform: uppercase; letter-spacing: 0.06em; }
    .row-value { font-size: 13px; font-weight: 600; color: #2B1D1A; }
    .product-code { display: inline-block; padding: 2px 10px; border-radius: 6px; background: #3E2723; color: #D4A373; font-size: 12px; font-weight: 800; letter-spacing: 0.06em; margin-right: 6px; }
    .footer { background: #F5F0EC; border-top: 1px solid #DDD2CC; padding: 14px 28px; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #A09490; line-height: 18px; }
    .footer strong { color: #6B5B57; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-top">
        <span class="brand">POS System</span>
        <span class="badge">${isRefund ? 'REFUND' : 'SALE'}</span>
      </div>
      <div class="invoice-label">Invoice ${sale.invoiceNo} &nbsp;·&nbsp; ${dateStr}</div>
    </div>
    <div class="body">
      <div class="amount-row">
        <span class="amount-label">Total ${isRefund ? 'Refunded' : 'Paid'}</span>
        <span class="amount-value"><span class="amount-currency">$</span>${total}</span>
      </div>

      <div class="row">
        <span class="row-label">Product</span>
        <span class="row-value">
          <span class="product-code">${sale.product?.code ?? ''}</span>
          ${sale.product?.name ?? ''}
        </span>
      </div>

      <div class="row">
        <span class="row-label">Payment</span>
        <span class="row-value">${methodLabel}${cardRef}</span>
      </div>

      ${sale.buyer?.name ? `
      <div class="row">
        <span class="row-label">Buyer</span>
        <span class="row-value">${sale.buyer.name}</span>
      </div>` : ''}

      ${sale.buyer?.phone ? `
      <div class="row">
        <span class="row-label">Phone</span>
        <span class="row-value">${sale.buyer.phone}</span>
      </div>` : ''}

      <div class="row">
        <span class="row-label">Date</span>
        <span class="row-value">${dateStr}</span>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for your purchase!</p>
      <p style="margin-top:4px">Keep this receipt for your records. &nbsp;<strong>Invoice ${sale.invoiceNo}</strong></p>
    </div>
  </div>
</body>
</html>`;
}

function buildVerificationHtml(name, verifyUrl, expiresMinutes = 15) {
  const firstName = name.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your POS account</title>
</head>
<body style="margin:0;padding:0;background:#F5F3F1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3F1;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3E2723 0%,#5D4037 100%);border-radius:14px 14px 0 0;padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">POS System</span>
                  </td>
                  <td align="right">
                    <span style="font-size:10px;font-weight:800;color:#D4A373;letter-spacing:0.12em;text-transform:uppercase;border:1px solid rgba(212,163,115,0.45);padding:4px 12px;border-radius:20px;">Account Setup</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:6px;">
                    <span style="font-size:12px;color:rgba(255,255,255,0.5);font-weight:500;">Powered by Staffing Betit</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:36px 36px 28px;">
              <!-- Icon row -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="width:52px;height:52px;background:rgba(62,39,35,0.07);border-radius:14px;text-align:center;vertical-align:middle;">
                    <span style="font-size:26px;line-height:52px;">&#9993;</span>
                  </td>
                  <td style="padding-left:16px;">
                    <p style="margin:0;font-size:20px;font-weight:800;color:#2B1D1A;letter-spacing:-0.3px;">Verify Your Email</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#A09490;font-weight:500;">One step away from accessing the portal</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;color:#2B1D1A;font-weight:600;">Hello, ${firstName},</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6B5B57;line-height:22px;">
                We received a request to create a POS terminal account linked to your
                <strong style="color:#3E2723;">Staffing Betit</strong> profile.
                Click the button below to verify your email address and activate your account.
              </p>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}"
                       style="display:inline-block;padding:15px 40px;background:#3E2723;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Verify Email &amp; Activate Account
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#FFF8F0;border:1px solid rgba(212,163,115,0.35);border-radius:8px;padding:12px 16px;">
                    <p style="margin:0;font-size:12px;color:#8D6E3A;line-height:18px;">
                      <strong>&#9203; This link expires in ${expiresMinutes} minutes.</strong>
                      If you did not request this, you can safely ignore this email — no account will be created.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 6px;font-size:12px;color:#A09490;line-height:18px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="margin:0;font-size:11px;color:#3E2723;word-break:break-all;line-height:17px;">${verifyUrl}</p>
            </td>
          </tr>

          <!-- Divider row -->
          <tr>
            <td style="background:#ffffff;padding:0 36px;">
              <div style="border-top:1px solid #EDE5DF;"></div>
            </td>
          </tr>

          <!-- Security notice -->
          <tr>
            <td style="background:#ffffff;padding:20px 36px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:20px;vertical-align:top;padding-right:10px;">
                    <span style="font-size:14px;color:#A09490;">&#128274;</span>
                  </td>
                  <td>
                    <p style="margin:0;font-size:11px;color:#A09490;line-height:17px;">
                      <strong style="color:#6B5B57;">Security notice:</strong>
                      This verification was triggered because someone used this email to sign up on your POS portal.
                      If this wasn't you, no action is needed — the link will expire automatically.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F0EAE5;border-radius:0 0 14px 14px;border-top:1px solid #DDD2CC;padding:18px 36px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#A09490;line-height:18px;">
                &copy; ${new Date().getFullYear()} POS System &nbsp;&middot;&nbsp; Powered by Staffing Betit
              </p>
              <p style="margin:0;font-size:11px;color:#C4B5AF;">This is an automated message — please do not reply to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('Email service is not configured (SMTP_HOST missing).');
    err.statusCode = 503;
    throw err;
  }
  const html = buildVerificationHtml(name, verifyUrl, 15);
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'POS System <noreply@pos.local>',
    to,
    subject: 'Verify your email — POS Account Setup',
    html,
  });
}

// Generic low-level send — accepts pre-built HTML and a custom subject.
// Used by cronReportService to deliver scheduled reports.
export async function sendReportEmail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('Email service is not configured (SMTP_HOST missing).');
    err.statusCode = 503;
    throw err;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'POS System <noreply@pos.local>',
    to,
    subject,
    html,
  });
}

export async function sendReceiptEmail({ to, sale }) {
  const transporter = getTransporter();
  if (!transporter) {
    const err = new Error('Email service is not configured on this server.');
    err.statusCode = 503;
    throw err;
  }

  const html = buildReceiptHtml(sale);

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'POS System <noreply@pos.local>',
    to,
    subject: `Your Receipt — Invoice ${sale.invoiceNo}`,
    html,
  });
}
