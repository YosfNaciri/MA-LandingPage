import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { formatConfirmationDate } from '../lib/clientConfirmations';
const labels = { queued:'En attente',sending:'En cours',sent:'Envoyé',failed:'Échec — reprise possible',manual_review:'Vérification manuelle requise',skipped_no_email:'Non envoyé : sans courriel',skipped_legacy:'Réponse historique : aucun envoi rétroactif' };
export default function ConfirmationReceiptStatus({responseId}) {
  const [row,setRow]=useState(null); const [message,setMessage]=useState(''); const [revision,setRevision]=useState(0); const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true; setRow(null);setMessage('');
    getSupabaseClient().from('confirmation_receipts').select('response_id,variant,state,sent_at,attempts').eq('response_id',responseId).maybeSingle().then(({data,error})=>{if(active){setRow(data);if(error)setMessage('Suivi de l’accusé indisponible.');}}).catch(()=>{if(active)setMessage('Suivi de l’accusé indisponible.');});
    return()=>{active=false;};
  },[responseId,revision]);
  async function retry(){setBusy(true);try{const {data,error}=await getSupabaseClient().rpc('retry_confirmation_receipt',{p_id:responseId});setMessage(!error && data?'Reprise planifiée.':'Reprise impossible. Vérifiez le prestataire avant toute nouvelle tentative.');}catch{setMessage('Reprise impossible.');}finally{setBusy(false);}}
  return <section className="mt-5 rounded-xl bg-blue-50 p-4"><h3 className="font-bold">Accusé automatique du formulaire</h3>{row?.state && <p className="mt-2 text-sm">Variante {row.variant} · {labels[row.state] || row.state} · {row.sent_at?formatConfirmationDate(row.sent_at,true):'Aucune date d’envoi'}</p>}{row?.state==='failed' && <button type="button" disabled={busy} onClick={retry} className="mt-2 font-bold text-blue-700 underline">Planifier une reprise</button>}<button type="button" onClick={()=>setRevision(x=>x+1)} disabled={busy} className="ml-3 mt-2 text-sm font-bold underline">Actualiser le suivi</button>{message && <p className="mt-2 text-sm">{message}</p>}</section>;
}
