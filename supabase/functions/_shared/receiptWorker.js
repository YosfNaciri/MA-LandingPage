import { receiptEmail, BUSINESS_NAME } from './confirmationRules.js';

// Dependency injection keeps tests offline. No personal data or provider bodies
// are logged or returned by this worker.
export async function processReceipt({ db, env, fetcher = fetch }) {
  if (env.RECEIPT_EMAIL_ENABLED !== 'true') return { state: 'disabled' };
  if (!env.BREVO_API_KEY || !env.RECEIPT_FROM_EMAIL) return { state: 'unconfigured' };
  const { data: jobs, error } = await db.rpc('claim_confirmation_receipt');
  if (error) return { state: 'database_error' };
  const job = jobs?.[0];
  if (!job) return { state: 'idle' };
  try {
    // Brevo keeps idempotency keys for 15 minutes; never retry outside our 14-minute window.
    if (job.first_attempt_at && Date.now() - Date.parse(job.first_attempt_at) >= 14 * 60 * 1000) throw new Error('delivery_window_expired');
    let payload = job.delivery_payload;
    if (payload && (!payload.sender || !payload.headers?.IdempotencyKey)) throw new Error('provider_payload_mismatch');
    if (!payload) {
      const message = receiptEmail(job.snapshot, env.CABINET_NAME || BUSINESS_NAME);
      payload = { sender: { email: env.RECEIPT_FROM_EMAIL, name: env.CABINET_NAME || BUSINESS_NAME }, to: [{ email: job.recipient }], subject: message.subject, htmlContent: message.html, headers: { IdempotencyKey: job.response_id } };
      const { data, error: saveError } = await db.from('confirmation_receipts').update({ delivery_payload: payload })
        .eq('response_id', job.response_id).eq('lease_token', job.lease_token).eq('state', 'sending').select('response_id');
      if (saveError || data?.length !== 1) return { state: 'database_error' };
    }
    const response = await fetcher('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    const body = await response.json();
    if (!body.messageId) throw new Error('provider_invalid_response');
    const finished = await db.rpc('finish_confirmation_receipt', { p_id: job.response_id, p_lease: job.lease_token, p_provider_id: body.messageId, p_error: null });
    return { state: !finished.error && finished.data ? 'sent' : 'database_error' };
  } catch (error) {
    const code = /^(provider_http_\d+|delivery_window_expired|provider_payload_mismatch)$/.test(error.message) ? error.message : 'delivery_uncertain';
    const result = await db.rpc('finish_confirmation_receipt', { p_id: job.response_id, p_lease: job.lease_token, p_provider_id: null, p_error: code });
    return { state: result.error ? 'database_error' : 'failed' };
  }
}
