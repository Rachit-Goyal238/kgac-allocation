export function generateInvoiceHTML(invoice: any) {
  const dateStr = new Date(invoice.created_at).toLocaleDateString();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice #${invoice.id.split('-')[0].toUpperCase()}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; }
    .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
    .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
    .invoice-box table td { padding: 5px; vertical-align: top; }
    .invoice-box table tr td:nth-child(2) { text-align: right; }
    .invoice-box table tr.top table td { padding-bottom: 20px; }
    .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; font-weight: bold; }
    .invoice-box table tr.information table td { padding-bottom: 40px; }
    .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
    .invoice-box table tr.details td { padding-bottom: 20px; }
    .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
    .invoice-box table tr.item.last td { border-bottom: none; }
    .invoice-box table tr.total td:nth-child(2) { border-top: 2px solid #eee; font-weight: bold; }
    .status-badge { display: inline-block; padding: 5px 15px; border-radius: 50px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
    .status-paid { background-color: #dcfce7; color: #166534; }
    .status-pending { background-color: #fef3c7; color: #92400e; }
    @media print { .invoice-box { box-shadow: none; border: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-box">
    <table cellpadding="0" cellspacing="0">
      <tr class="top">
        <td colspan="2">
          <table>
            <tr>
              <td class="title">
                <div style="color: #2563eb; font-size: 36px; letter-spacing: -1px;">KGAC</div>
                <div style="font-size: 12px; font-weight: normal; color: #666; margin-top: -10px;">Kumar Aggarwal Gaurav and Co.</div>
              </td>
              <td>
                Invoice #: ${invoice.id.split('-')[0].toUpperCase()}<br>
                Created: ${dateStr}<br>
                Status: <span class="status-badge status-${invoice.status}">${invoice.status}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr class="information">
        <td colspan="2">
          <table>
            <tr>
              <td>
                <strong>Billed To:</strong><br>
                KGAC Head Office<br>
                Delhi, India<br>
                accounts@kgac.in
              </td>
              <td>
                <strong>Payable To:</strong><br>
                ${invoice.vendor?.name || 'Unknown Vendor'}<br>
                ${invoice.vendor?.contact_email || ''}<br>
                ${invoice.vendor?.contact_phone || ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr class="heading">
        <td>Description</td>
        <td>Amount (INR)</td>
      </tr>
      <tr class="item last">
        <td>
          <strong>Audit Services</strong><br>
          ${invoice.audit?.store_name || 'Unknown Audit'}<br>
          <span style="font-size: 13px; color: #666;">Date: ${invoice.audit?.audit_date || ''}</span>
          ${invoice.notes ? `<br><span style="font-size: 13px; color: #666;">Notes: ${invoice.notes}</span>` : ''}
        </td>
        <td>&#x20B9;${Number(invoice.amount).toLocaleString()}</td>
      </tr>
      <tr class="total">
        <td></td>
        <td>Total: &#x20B9;${Number(invoice.amount).toLocaleString()}</td>
      </tr>
    </table>
    <div style="margin-top: 50px; text-align: center; color: #888; font-size: 12px;">
      This is a computer-generated document. No signature is required.
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `;
}

export function printInvoice(invoice: any) {
  const html = generateInvoiceHTML(invoice);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
