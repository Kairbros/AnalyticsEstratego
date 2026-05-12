import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
  if (!host || !user || !pass) {
    throw new Error('SMTP no configurado: revisa SMTP_HOST, SMTP_USER y SMTP_PASSWORD en .env');
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function enviarCorreoDiagnosticoCompletado({
  clienteEmail,
  clienteNombre,
  vendedorNombre,
  diagnosticoId,
  diagnosticoNombre,
  password,
  fechaCompletado,
  adjuntos = [],
  propuestaPlan = null,
}) {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const linkDiagnostico = `${baseUrl}/cliente/diagnosticos/${diagnosticoId}`;
  const linkLogin = `${baseUrl}/login`;
  const nombreMostrar = diagnosticoNombre?.trim() || `Diagnóstico #${diagnosticoId}`;
  const fechaStr = new Date(fechaCompletado).toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const subject = `Tu diagnóstico comercial está listo — ${nombreMostrar}`;

  const lineaPropuesta = propuestaPlan
    ? `\nSe adjunta también la propuesta comercial personalizada (plan ${propuestaPlan.toUpperCase()}).\n`
    : '';

  const text =
    `Hola ${clienteNombre || ''},\n\n` +
    `${vendedorNombre || 'Tu asesor'} acaba de completar tu diagnóstico comercial "${nombreMostrar}" en AnalyticsEstratego.\n\n` +
    `Fecha: ${fechaStr}\n` +
    lineaPropuesta +
    `\nPara ver tus resultados entra con tus credenciales:\n` +
    `  Correo: ${clienteEmail}\n` +
    `  Contraseña: ${password}\n\n` +
    `Enlace directo al diagnóstico:\n${linkDiagnostico}\n\n` +
    `Enlace de login:\n${linkLogin}\n\n` +
    `Si tienes dudas responde a este correo.\n\n` +
    `— Equipo Estratego`;

  const html = `
<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><title>${escaparHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#08080f;font-family:Segoe UI, Arial, sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#08080f;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#13131f;border:1px solid #2a2a3f;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#e9c158;">AnalyticsEstratego</p>
          <h1 style="margin:6px 0 0;font-size:22px;color:#f8fafc;">Tu diagnóstico está listo</h1>
        </td></tr>
        <tr><td style="padding:20px 32px;font-size:14px;line-height:1.55;color:#cbd5e1;">
          <p style="margin:0 0 16px;">Hola <strong style="color:#f8fafc;">${escaparHtml(clienteNombre || '')}</strong>,</p>
          <p style="margin:0 0 16px;">
            <strong style="color:#f8fafc;">${escaparHtml(vendedorNombre || 'Tu asesor')}</strong>
            acaba de completar el diagnóstico comercial
            <strong style="color:#e9c158;">${escaparHtml(nombreMostrar)}</strong>.
          </p>
          <p style="margin:0 0 20px;color:#94a3b8;font-size:13px;">Completado el ${escaparHtml(fechaStr)}</p>
          ${
            propuestaPlan
              ? `<p style="margin:0 0 20px;font-size:13px;color:#cbd5e1;background:#0b0b15;border:1px solid #2a2a3f;border-radius:10px;padding:12px 16px;">
                  📎 Adjunta la <strong style="color:#e9c158;">propuesta comercial personalizada</strong> (plan ${escaparHtml(
                    propuestaPlan.toUpperCase(),
                  )}). También puedes descargarla en cualquier momento desde tu diagnóstico.
                </p>`
              : ''
          }
          <div style="background:#0b0b15;border:1px solid #2a2a3f;border-radius:12px;padding:16px 20px;margin:0 0 20px;">
            <p style="margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">Tus credenciales</p>
            <p style="margin:2px 0;font-size:14px;"><span style="color:#94a3b8;">Correo:</span> <span style="font-family:Consolas,monospace;color:#f8fafc;">${escaparHtml(clienteEmail)}</span></p>
            <p style="margin:2px 0;font-size:14px;"><span style="color:#94a3b8;">Contraseña:</span> <span style="font-family:Consolas,monospace;color:#e9c158;">${escaparHtml(password)}</span></p>
            <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">Guárdala en un lugar seguro. Puedes cambiarla luego desde tu perfil.</p>
          </div>
          <p style="margin:0 0 18px;text-align:center;">
            <a href="${escaparHtml(linkDiagnostico)}" style="display:inline-block;background:#e9c158;color:#0b0b15;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:14px;">Ver mis resultados</a>
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            O ingresa directamente en
            <a href="${escaparHtml(linkLogin)}" style="color:#e9c158;">${escaparHtml(linkLogin)}</a>.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid #2a2a3f;font-size:12px;color:#94a3b8;">
          ¿Dudas? Responde este correo y te contactamos.<br/>— Equipo Estratego
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: clienteEmail,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    subject,
    text,
    html,
    attachments: adjuntos.length > 0 ? adjuntos : undefined,
  });

  return info;
}
