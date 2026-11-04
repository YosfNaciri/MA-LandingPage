import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { processReceipt } from '../_shared/receiptWorker.js';

Deno.serve(async (request: Request) => {
  // Only a server scheduler holding this secret may invoke delivery.
  const secret = Deno.env.get('RECEIPT_WORKER_SECRET');
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) return new Response(null, { status: 401 });
  const env = Object.fromEntries(['RECEIPT_EMAIL_ENABLED','BREVO_API_KEY','RECEIPT_FROM_EMAIL','CABINET_NAME'].map(key => [key, Deno.env.get(key)]));
  if (env.RECEIPT_EMAIL_ENABLED !== 'true') return Response.json({ state: 'disabled' });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const results = [];
  for (let i = 0; i < 10; i++) {
    const result = await processReceipt({ db, env });
    results.push(result.state);
    if (!['sent','failed'].includes(result.state)) break;
  }
  return Response.json({ results });
});
