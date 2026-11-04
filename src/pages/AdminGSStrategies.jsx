import { gsDate, gsPriceRanges } from '../lib/gsSubmissionData';
import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiDownload, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi';
import AdminLayout from '../Components/AdminLayout';
import { gsExport, gsLanguages, gsRequest, gsStatuses } from '../lib/gsStrategies';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const input = 'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';

export default function AdminGSStrategies() {
  const [tab, setTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [criteria, setCriteria] = useState({ province: '', city: '', sale_delay: '', price: '' });
  const [filters, setFilters] = useState({ search: '', language: '', page: 1 });
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);

  useEffect(() => {
    let active = true;
    gsRequest('list', filters).then(result => {
      if (active) { setData(result); setError(''); }
    }).catch(err => { if (active) { setError(err.message); setData(null); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, revision]);

  function refresh() { setLoading(true); setRevision(value => value + 1); }
  async function open(row) {
    const request = ++sequence.current;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await gsRequest('detail', { id: row.id });
      if (request === sequence.current) { setSelected(result); setStatus(result.status); }
    } catch (err) { if (request === sequence.current) setError(err.message); }
    finally { if (request === sequence.current) setBusy(false); }
  }
  async function save() {
    setBusy(true); setError(''); setNotice('');
    try { const result = await gsRequest('status', { id: selected.id, status, previousStatus: selected.status }); setSelected(result); setNotice('Statut enregistré dans Supabase.'); refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(`Supprimer définitivement le dossier de ${selected.seller_name || `soumission #${selected.id}`} et toutes ses réponses dans Supabase ?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await gsRequest('delete', { id: selected.id, confirm_delete: true });
      if (result.deleted !== true || result.id !== selected.id) throw new Error('La suppression n’a pas été confirmée. Actualisez avant de réessayer.');
      setSelected(null); setNotice('Soumission supprimée dans Supabase.'); setLoading(true); setFilters(current => ({ ...current, page: 1 }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function exportRows() {
    setBusy(true); setError(''); setNotice('');
    try { await gsExport(filters); setNotice('Export CSV téléchargé avec tous les résultats des filtres appliqués.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  function showAll() { setTab('submissions'); setSearch(''); setLanguage(''); setCriteria({ province: '', city: '', sale_delay: '', price: '' }); setLoading(true); setFilters({ search: '', language: '', page: 1 }); }
  return <AdminLayout subtitle="GS Strategies · Formulaires vendeurs">
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Formulaires de vente</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">GS Strategies</h1><p className="mt-2 text-sm text-slate-500">Vos demandes de vente, réunies dans votre espace de gestion.</p></div><button className={secondary} disabled={loading || busy} onClick={() => selected ? open(selected) : refresh()}><FiRefreshCw />Actualiser</button></header>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      <nav aria-label="Sections GS Strategies" className="mb-6 flex flex-wrap gap-2">{[['dashboard','Vue d’ensemble'],['submissions','Soumissions']].map(([key,label]) => <button key={key} disabled={busy} aria-current={!selected && tab === key ? 'page' : undefined} className={!selected && tab === key ? button : secondary} onClick={() => { setSelected(null); setTab(key); }}>{label}</button>)}</nav>
      {selected ? <>
        <button disabled={busy} className={`${secondary} mb-5`} onClick={() => setSelected(null)}><FiArrowLeft />Retour à la liste</button>
        <div className="grid items-start gap-5 xl:grid-cols-[320px_1fr]">
          <aside className={`${panel} overflow-hidden border-t-4 border-t-blue-500`}><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Dossier #{selected.id}</p><h2 className="mt-3 break-words text-2xl font-extrabold text-slate-900">{selected.seller_name || 'Fiche vendeur'}</h2><p className="mt-2 break-words text-sm text-slate-500">{selected.role || 'Rôle non renseigné'}</p><dl className="mt-5 space-y-4">{[['Cabinet',selected.company_name],['Courriel',selected.email],['Langue',gsLanguages[selected.language] || 'Non précisée'],['Formulaire',selected.form_name],['Date de réponse',gsDate(selected.created_at)],['Statut',gsStatuses[selected.status] || selected.status]].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value || '—'}</dd></div>)}</dl>
            <form onSubmit={event => { event.preventDefault(); save(); }} className="mt-6 border-t border-slate-100 pt-5"><label htmlFor="gs-status" className="text-sm font-bold">Modifier le statut</label><select id="gs-status" className={`${input} mt-2 w-full`} value={status} onChange={event => setStatus(event.target.value)} disabled={busy}>{!gsStatuses[status] && <option value={status} disabled>{status || 'Choisir'}</option>}{Object.entries(gsStatuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><button className={`${button} mt-3 w-full`} disabled={busy || status === selected.status || !gsStatuses[status]}>Enregistrer le statut</button></form>
            <button onClick={remove} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><FiTrash2 />Supprimer la soumission</button>
          </aside>
          <div className="min-w-0 space-y-5">{selected.groups?.length ? selected.groups.map((group,index) => <section key={index} className={panel}><h3 className="flex items-center gap-3 border-b border-slate-100 pb-4 font-bold text-slate-900"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm text-blue-600">{index+1}</span>{group.title}</h3><dl className="mt-4 grid gap-3 sm:grid-cols-2">{group.answers.map(answer => <div key={answer.id} className={`min-w-0 rounded-xl bg-slate-50 p-4 ${answer.value.length > 120 || answer.value.includes('\n') ? 'sm:col-span-2' : ''}`}><dt className="text-xs font-medium text-slate-500">{answer.label}</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{answer.value || '—'}</dd></div>)}</dl></section>) : <p className={panel}>Aucune réponse lisible pour ce dossier.</p>}</div>
        </div>
      </> : loading ? <p role="status" className={panel}>Chargement des réponses GS Strategies…</p> : data && <>
        {tab === 'dashboard' ? <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Total des demandes',data.stats.total,'blue'],['Nouveaux dossiers',data.stats.new,'emerald'],['Formulaires français',data.stats.fr,'blue'],['Formulaires anglais',data.stats.en,'blue']].map(([label,value,tone]) => <div key={label} className={panel}><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-3 text-4xl font-extrabold tabular-nums ${tone === 'emerald' ? 'text-emerald-600' : 'text-blue-600'}`}>{value}</p></div>)}</div>
          <section className={panel}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Les dernières soumissions</h2><button className={secondary} onClick={showAll} disabled={busy}>Tout voir</button></div><SubmissionRows rows={data.latest} busy={busy} onOpen={open} /></section>
        </> : <section className={panel}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Soumissions <span className="ml-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">{data.total}</span></h2><button onClick={exportRows} disabled={busy || !data.total} className={secondary}><FiDownload />Exporter en CSV</button></div>
          <form onSubmit={event => { event.preventDefault(); setLoading(true); setFilters({ search, language, ...criteria, page: 1 }); }} className="mb-5 flex flex-wrap gap-3"><input aria-label="Rechercher les soumissions GS Strategies" className={`${input} min-w-0 flex-1`} placeholder="Vendeur, courriel, cabinet ou réponse…" value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Langue du formulaire" className={input} value={language} onChange={event => setLanguage(event.target.value)}><option value="">Toutes les langues</option>{Object.entries(gsLanguages).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['province','Province du cabinet'],['city','Ville du cabinet'],['sale_delay','Délai de vente']].map(([key,label]) => <label key={key} className="min-w-0 text-xs font-semibold text-slate-600">{label}<select className={`${input} mt-1.5 w-full`} value={criteria[key]} onChange={event => setCriteria(current => ({ ...current, [key]: event.target.value }))}><option value="">Tous</option>{(data.options?.[key] || []).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}<label className="min-w-0 text-xs font-semibold text-slate-600">Prix de vente<select className={`${input} mt-1.5 w-full`} value={criteria.price} onChange={event => setCriteria(current => ({ ...current, price: event.target.value }))}><option value="">Tous les prix</option>{Object.entries(gsPriceRanges).map(([key,range]) => <option key={key} value={key}>{range.label}</option>)}<option value="unknown">Non renseigné / à déterminer</option></select></label></div><p className="w-full text-xs text-slate-500">Les fourchettes déclarées sont incluses lorsqu’elles recoupent l’intervalle choisi.</p><button className={button} disabled={busy}><FiSearch />Appliquer</button><button type="button" className={secondary} disabled={busy} onClick={showAll}>Réinitialiser</button></form>
          <div role="region" aria-label="Toutes les soumissions GS Strategies" tabIndex={0} className="max-h-[65vh] overflow-y-auto overscroll-contain rounded-xl pr-2 focus-visible:outline-blue-500"><SubmissionRows rows={data.rows} busy={busy} onOpen={open} /></div>

        </section>}
      </>}
    </main>
  </AdminLayout>;
}
function SubmissionRows({ rows, busy, onOpen }) {
  if (!rows?.length) return <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Aucune soumission trouvée.</p>;
  return <div className="space-y-3">{rows.map(row => <button key={row.id} disabled={busy} onClick={() => onOpen(row)} className="flex w-full flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-50"><div className="min-w-0"><p className="break-words font-bold text-slate-800">{row.seller_name || `Soumission #${row.id}`}</p><p className="mt-1 break-words text-sm text-slate-500">{row.company_name || '—'} · {row.email || 'Sans courriel'}</p></div><div className="flex flex-wrap items-center gap-3 text-xs"><span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">{gsLanguages[row.language] || 'Non précisée'}</span><span className={`rounded-full px-2.5 py-1 font-semibold ${row.status === 'new' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{gsStatuses[row.status] || row.status}</span><span className="text-slate-500">{gsDate(row.created_at)}</span><span className="font-bold text-blue-600">Consulter →</span></div></button>)}</div>;
}
