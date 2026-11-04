import test from 'node:test';
import assert from 'node:assert/strict';
import { processReceipt } from '../../supabase/functions/_shared/receiptWorker.js';
import { buildReceipt, receiptEmail } from '../../supabase/functions/_shared/confirmationRules.js';
import { scenarios } from '../confirmation-fixtures.mjs';
const env={RECEIPT_EMAIL_ENABLED:'true',BREVO_API_KEY:'fake-test-key',RECEIPT_FROM_EMAIL:'test@example.test'};
function database(job) {
 const calls=[];
 return {
  calls,
  rpc: async (name,args) => { calls.push([name,args]); return name==='claim_confirmation_receipt' ? {data:job?[job]:[]} : {data:true}; },
  from() { return {
   update(patch) { job.delivery_payload=patch.delivery_payload; return this; },
   eq() { return this; },
   select() { return Promise.resolve({data:[{response_id:job.response_id}]}); },
  }; },
 };
}
for(const scenario of [scenarios[0],scenarios[2],scenarios[8]])test(`courriel simulé ${scenario.variant} identique à l’écran`,async()=>{
 const snapshot={wants_tax_service:scenario.wants!==false,people:scenario.people};
 const job={response_id:'response-1',lease_token:'lease',recipient:'test@example.test',snapshot};const db=database(job);
 let body;let headers;
 const result=await processReceipt({db,env,fetcher:async(_url,options)=>{assert.equal(_url,'https://api.brevo.com/v3/smtp/email');body=JSON.parse(options.body);headers=options.headers;return {ok:true,json:async()=>({messageId:'fake-provider-id'})};}});
 assert.equal(result.state,'sent');assert.equal(body.htmlContent,receiptEmail(snapshot).html);assert.equal(receiptEmail(snapshot).variant,buildReceipt(snapshot).variant);assert.equal(body.textContent,undefined);
 assert.equal(body.headers.IdempotencyKey,'response-1');assert.equal(headers['api-key'],'fake-test-key');assert.deepEqual(body.to,[{email:'test@example.test'}]);assert.equal(db.calls.at(-1)[1].p_provider_id,'fake-provider-id');
});
test('désactivé ou secrets manquants : aucune requête ni prise en charge',async()=>{
 const db=database({});const fail=()=>{throw new Error('must not call network');};
 assert.equal((await processReceipt({db,env:{},fetcher:fail})).state,'disabled');
 assert.equal((await processReceipt({db,env:{RECEIPT_EMAIL_ENABLED:'true'},fetcher:fail})).state,'unconfigured');
 assert.equal(db.calls.length,0);
});
test('sans courriel : aucune tâche envoyable et aucun appel fournisseur',async()=>{
 const db=database(null);assert.equal((await processReceipt({db,env,fetcher:()=>{throw new Error('must not send');}})).state,'idle');
});
test('échec/reprise : même payload et même clé, ne supprime pas la réponse',async()=>{
 const job={response_id:'retry',lease_token:'lease',recipient:'test@example.test',snapshot:{wants_tax_service:true,people:scenarios[2].people}};const db=database(job);const requests=[];
 const fetcher=async(_url,options)=>{requests.push(options);if(requests.length===1)throw new Error('network private details');return {ok:true,json:async()=>({messageId:'sent-once'})};};
 assert.equal((await processReceipt({db,env,fetcher})).state,'failed');assert.equal(db.calls.at(-1)[1].p_error,'delivery_uncertain');
 assert.equal((await processReceipt({db,env:{...env,RECEIPT_FROM_EMAIL:'changed@example.test'},fetcher})).state,'sent');
 assert.equal(requests[0].body,requests[1].body);assert.deepEqual(requests[0].headers,requests[1].headers);
});

test('Brevo : aucune reprise après 14 minutes, aucun transfert d’un ancien payload Resend', async()=>{
 for (const extra of [{first_attempt_at:new Date(Date.now()-14*60*1000).toISOString()}, {delivery_payload:{from:'old@example.test',text:'Old payload'}}]) {
  const job={response_id:'guard',lease_token:'lease',recipient:'test@example.test',snapshot:{wants_tax_service:false},...extra};
  const db=database(job);
  const result=await processReceipt({db,env,fetcher:()=>{throw new Error('must not call provider');}});
  assert.equal(result.state,'failed');
  assert.equal(db.calls.at(-1)[1].p_error,extra.first_attempt_at?'delivery_window_expired':'provider_payload_mismatch');
 }
});

test('anciens envois texte : une reprise conserve exactement le contenu figé',async()=>{
 const payload={sender:{email:'test@example.test'},to:[{email:'client@example.test'}],subject:'Ancien message',textContent:'Texte original',headers:{IdempotencyKey:'legacy'}};
 const job={response_id:'legacy',lease_token:'lease',delivery_payload:payload};
 let body;
 const result=await processReceipt({db:database(job),env,fetcher:async(_url,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({messageId:'legacy-id'})};}});
 assert.equal(result.state,'sent');assert.deepEqual(body,payload);
});
