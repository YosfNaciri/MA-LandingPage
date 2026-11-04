// Email-safe layout: inline styles, presentation tables, no external fonts or images.
export function escapeEmailHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function renderReceiptHtml(receipt, businessName) {
  const escape = escapeEmailHtml;
  const themes = {
    A: { title: 'Vos places sont confirmées', label: 'Confirmation', color: '#166534', background: '#f0fdf4' },
    B: { title: 'Votre réponse est bien reçue', label: 'Suivi de votre demande', color: '#92400e', background: '#fffbeb' },
    Non: { title: 'Votre réponse a été enregistrée', label: 'Accusé de réception', color: '#475569', background: '#f1f5f9' },
  };
  const theme = themes[receipt.variant];
  const paragraphs = receipt.paragraphs.map((paragraph, index) => {
    const confirmed = receipt.variant !== 'Non' && index === 1;
    const pending = receipt.variant === 'B' && index === 2;
    if (confirmed || pending) {
      // Split only the fixed label; never interpret names as markup.
      const separator = paragraph.indexOf(' : ');
      const label = paragraph.slice(0, separator);
      const names = paragraph.slice(separator + 3);
      const color = pending ? '#92400e' : '#1d4ed8';
      const background = pending ? '#fffbeb' : '#eff6ff';
      return `<tr><td style="padding:0 24px 16px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${background};border:1px solid ${pending ? '#fde68a' : '#bfdbfe'};border-radius:12px;"><tr><td style="padding:18px;overflow-wrap:anywhere;word-break:break-word;"><p style="margin:0 0 8px;font-size:14px;line-height:22px;font-weight:700;color:${color};">${escape(label)}</p><p style="margin:0;font-size:16px;line-height:26px;color:#0f172a;">${escape(names)}</p></td></tr></table></td></tr>`;
    }
    return `<tr><td style="padding:0 24px 20px;font-size:16px;line-height:27px;color:#475569;overflow-wrap:anywhere;word-break:break-word;">${escape(paragraph)}</td></tr>`;
  }).join('\n');
  return `<!doctype html>
<html lang="fr-CA"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escape(receipt.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f6fc;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escape(receipt.subject)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fc;"><tr><td align="center" style="padding:28px 12px;">
<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;table-layout:fixed;background:#ffffff;border:1px solid #dbe5f3;border-radius:18px;overflow:hidden;">
<tr><td style="padding:26px 24px;background:#2563eb;color:#ffffff;overflow-wrap:anywhere;"><p style="margin:0;font-size:22px;line-height:30px;font-weight:700;">${escape(businessName)}</p><p style="margin:6px 0 0;font-size:13px;line-height:20px;color:#ffffff;letter-spacing:1px;">IMPÔTS 2026</p></td></tr>
<tr><td style="padding:28px 24px 14px;"><span style="display:inline-block;padding:6px 12px;border-radius:20px;background:${theme.background};color:${theme.color};font-size:12px;line-height:18px;font-weight:700;">${theme.label}</span><h1 style="margin:16px 0 0;font-size:27px;line-height:35px;color:#0f172a;">${theme.title}</h1></td></tr>
${paragraphs}
<tr><td style="padding:20px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;"><p style="margin:0;color:#64748b;font-size:12px;line-height:20px;">${escape(businessName)} · Confirmation de votre réponse au formulaire</p></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}
