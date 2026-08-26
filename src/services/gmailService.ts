import { getGoogleAccessToken } from './googleAuth';
import { DailyLog, Occurrence } from '../types';

export interface EmailRecipient {
  email: string;
  name?: string;
  type?: 'to' | 'cc' | 'bcc';
}

export interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  labelIds: string[];
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

// Convert UTF-8 string to base64url without padding
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Creates an RFC 2822 compliant email string
 */
function createRawEmail(params: SendEmailParams): string {
  const toList = Array.isArray(params.to) ? params.to.join(', ') : params.to;
  const ccList = params.cc ? (Array.isArray(params.cc) ? params.cc.join(', ') : params.cc) : '';
  const bccList = params.bcc ? (Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc) : '';

  const headers: string[] = [
    `To: ${toList}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];

  if (ccList) headers.push(`Cc: ${ccList}`);
  if (bccList) headers.push(`Bcc: ${bccList}`);

  const email = `${headers.join('\r\n')}\r\n\r\n${params.bodyHtml}`;
  return base64UrlEncode(email);
}

/**
 * Get Gmail User Profile
 */
export async function getGmailUserProfile(): Promise<GmailUserProfile> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Não autenticado com a conta Google/Gmail.');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro ao carregar perfil do Gmail (${res.status})`);
  }

  return await res.json();
}

/**
 * Send an email directly using Gmail API
 */
export async function sendGmailEmail(params: SendEmailParams): Promise<{ id: string; threadId: string }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Não autenticado com a conta Google/Gmail. Faça login para continuar.');

  const raw = createRawEmail(params);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro ao enviar e-mail pelo Gmail (${res.status})`);
  }

  return await res.json();
}

/**
 * Create a draft email in Gmail
 */
export async function createGmailDraft(params: SendEmailParams): Promise<{ id: string; message: { id: string } }> {
  const token = await getGoogleAccessToken();
  if (!token) throw new Error('Não autenticado com a conta Google/Gmail.');

  const raw = createRawEmail(params);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Erro ao criar rascunho no Gmail (${res.status})`);
  }

  return await res.json();
}

/**
 * List recent messages / sent emails
 */
export async function listRecentGmailMessages(maxResults = 10, query = 'label:SENT'): Promise<GmailMessageSummary[]> {
  const token = await getGoogleAccessToken();
  if (!token) return [];

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.set('maxResults', maxResults.toString());
  if (query) url.searchParams.set('q', query);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error('Falha ao listar mensagens do Gmail');
    return [];
  }

  const data = await res.json();
  if (!data.messages || !Array.isArray(data.messages)) return [];

  // Fetch summaries in parallel for fast rendering
  const messageDetails = await Promise.all(
    data.messages.slice(0, maxResults).map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();

        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(Sem Assunto)';
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find((h: any) => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

        return {
          id: detail.id,
          threadId: detail.threadId,
          subject,
          from,
          to,
          date,
          snippet: detail.snippet || '',
          labelIds: detail.labelIds || [],
        };
      } catch (e) {
        return null;
      }
    })
  );

  return messageDetails.filter((m): m is GmailMessageSummary => m !== null);
}

// -------------------------------------------------------------
// HTML Email Templates for RDO & Field Notifications
// -------------------------------------------------------------

export function generateRdoEmailHtml(log: DailyLog): string {
  const dateFormatted = log.date ? log.date.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
  const hasOccurrences = Boolean(log.hasOccurrence && log.occurrence);

  const servicesBadgesHtml = (log.services || [])
    .map(
      (s) => `
      <span style="display: inline-block; background-color: #dbeafe; color: #1e40af; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin: 0 4px 6px 0;">
        ${s}
      </span>
    `
    )
    .join('');

  const helpersListHtml = (log.helpersPresent || [])
    .map((h) => `<li style="margin-bottom: 4px; color: #334155;">👷 <strong>${h.name}</strong> ${h.role ? `(${h.role})` : ''}</li>`)
    .join('');

  const occurrencesHtml = hasOccurrences && log.occurrence
    ? `
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin-top: 20px;">
      <h3 style="color: #991b1b; margin-top: 0; margin-bottom: 10px; font-size: 15px; display: flex; align-items: center;">
        ⚠️ OCORRÊNCIA REGISTRADA
      </h3>
      <div style="color: #7f1d1d; font-size: 13px;">
        <p style="margin: 0 0 6px 0;"><strong>[${log.occurrence.urgency}] ${log.occurrence.category}:</strong></p>
        <p style="margin: 0; background-color: #fff; padding: 8px 12px; border-radius: 6px; border: 1px solid #fee2e2;">${log.occurrence.description}</p>
        ${log.occurrence.adminObservation ? `<p style="margin: 8px 0 0 0; color: #1e293b;"><strong>Tratativa Administrativa:</strong> ${log.occurrence.adminObservation}</p>` : ''}
      </div>
    </div>
  `
    : `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 20px; color: #166534; font-size: 13px;">
      ✅ <strong>Dia sem ocorrências anormais:</strong> Atividades executadas conforme o planejamento e sem impedimentos graves.
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Relatório de Obra</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
      <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; border-bottom: 4px solid #2563eb;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="background-color: #2563eb; color: white; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                Relatório de Obra
              </span>
              <h1 style="margin: 8px 0 4px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                ${log.worksiteName || 'Obra Geral'}
              </h1>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                Localização: <strong style="color: #e2e8f0;">${log.city || '-'}/${log.state || 'PR'}</strong> ${log.worksiteLocationDetail ? `(${log.worksiteLocationDetail})` : ''}
              </p>
            </div>
            <div style="text-align: right; background-color: rgba(255,255,255,0.1); padding: 8px 14px; border-radius: 8px;">
              <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Data do Registro</div>
              <div style="font-size: 16px; font-weight: 800; color: #ffffff;">${dateFormatted}</div>
            </div>
          </div>
        </div>

        <!-- Content Body -->
        <div style="padding: 24px;">
          
          <!-- Team & Execution Info Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
              <div>
                <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Equipe Responsável</span>
                <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${log.teamName}</div>
              </div>
              <div>
                <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Chefe de Equipe</span>
                <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${log.leaderName} (${log.leaderPhone || '-'})</div>
              </div>
              <div>
                <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Status e Clima</span>
                <div style="font-weight: 600; color: #334155; margin-top: 2px;">Status: ${log.status} | Clima: ${log.weather || 'Ensolarado'}</div>
              </div>
              <div>
                <span style="color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 600;">Efetivo em Campo</span>
                <div style="font-weight: 600; color: #334155; margin-top: 2px;">${(log.helpersPresent || []).length + 1} profissionais</div>
              </div>
            </div>
          </div>

          <!-- Helpers Details -->
          ${
            (log.helpersPresent || []).length > 0
              ? `
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 8px 0; font-size: 13px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px;">
                Ajudantes Presentes neste dia (${(log.helpersPresent || []).length}):
              </h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
                ${helpersListHtml}
              </ul>
            </div>
          `
              : ''
          }

          <!-- Services Performed -->
          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">
              Serviços Executados
            </h3>
            <div style="margin-bottom: 12px;">
              ${servicesBadgesHtml}
            </div>
            ${log.serviceDescription ? `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-size: 13px; color: #334155; line-height: 1.5;">
                <strong>Detalhamento dos Serviços:</strong><br/>
                ${log.serviceDescription}
              </div>
            ` : ''}
          </div>

          <!-- General Observations -->
          ${
            log.observations
              ? `
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: bold; color: #1d4ed8; text-transform: uppercase;">Observações Gerais da Obra:</span>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155; line-height: 1.5;">${log.observations}</p>
            </div>
          `
              : ''
          }

          <!-- Occurrences Block -->
          ${occurrencesHtml}

          <!-- Footer Signature -->
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p style="margin: 0 0 4px 0;"><strong>Registro validado e transmitido via Sistema de Gestão de Obras</strong></p>
            <p style="margin: 0;">Encarregado da Obra: <strong>${log.leaderName}</strong></p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8;">Mensagem gerada e autenticada automaticamente pela integração Google Workspace / Gmail.</p>
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateOccurrenceAlertEmailHtml(occurrence: Occurrence): string {
  const isHigh = occurrence.urgency === 'ALTA';
  const urgencyColor = isHigh ? '#dc2626' : occurrence.urgency === 'MEDIA' ? '#d97706' : '#2563eb';
  const urgencyBg = isHigh ? '#fef2f2' : occurrence.urgency === 'MEDIA' ? '#fffbeb' : '#eff6ff';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Alerta de Ocorrência em Campo</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #fecaca; box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.1);">
        
        <!-- Header -->
        <div style="background-color: ${urgencyColor}; color: #ffffff; padding: 20px 24px;">
          <span style="background-color: rgba(0,0,0,0.2); color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
            ALERTA OPERACIONAL DE CAMPO - URGÊNCIA ${occurrence.urgency}
          </span>
          <h1 style="margin: 10px 0 4px 0; font-size: 18px; font-weight: 700;">
            ${occurrence.category}
          </h1>
          <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.9);">
            Data: <strong>${occurrence.date.split('-').reverse().join('/')}</strong> | Município: <strong>${occurrence.city}</strong>
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 24px;">
          
          <div style="background-color: ${urgencyBg}; border: 1px solid ${urgencyColor}40; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <span style="color: ${urgencyColor}; font-size: 11px; font-weight: 800; text-transform: uppercase;">Descrição Detalhada do Problema:</span>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #1e293b; line-height: 1.5; font-weight: 500;">
              "${occurrence.description}"
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Obra / Local:</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${occurrence.worksiteName || 'Obra em andamento'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Equipe:</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${occurrence.teamName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Chefe de Equipe:</td>
              <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${occurrence.leaderName} (${occurrence.leaderPhone || '-'})</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Status Atual:</td>
              <td style="padding: 8px 0; font-weight: 700; color: ${occurrence.status === 'PENDENTE' ? '#dc2626' : '#d97706'};">
                ${occurrence.status}
              </td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px; text-align: center; border: 1px dashed #cbd5e1;">
            <p style="margin: 0; font-size: 12px; color: #475569;">
              Favor tomar providências imediatas na Central Administrativa para reposição de materiais, agendamento de oficina ou deslocamento de suporte.
            </p>
          </div>

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 11px;">
            Enviado via Sistema de Gestão de Obras & Notificações Integradas Gmail.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
