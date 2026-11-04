let memoryPending;
// Persist only a random request token and digest, never the form's personal data.
export async function submitConfirmation(client, record) {
  const stable = { ...record };
  delete stable.initial_response_at;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(stable)));
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  const storageKey = 'ma-confirmation-pending';
  let pending = memoryPending;
  try { pending = JSON.parse(sessionStorage.getItem(storageKey)) || pending; } catch { /* storage may be unavailable */ }
  if (pending?.fingerprint !== fingerprint) pending = { fingerprint, id: crypto.randomUUID() };
  memoryPending = pending;
  try { sessionStorage.setItem(storageKey, JSON.stringify(pending)); } catch { /* server remains idempotent for this request */ }
  const { data, error } = await client.rpc('submit_tax_confirmation', { p_record: stable, p_request_id: pending.id });
  if (error) throw error;
  if (!data?.id || !data?.receipt_snapshot) throw new Error('Enregistrement non confirmé. Réessayez sans fermer la page.');
  // Keep token after success as well: Back/retry must not create another response.
  return data;
}
