import { FiUser, FiUsers, FiEdit2, FiShield, FiFileText, FiClipboard, FiCheckCircle, FiClock, FiSearch } from "react-icons/fi";
import { PERSON_STATUS } from "../lib/confirmationRules";
import ConfirmationReceiptStatus from "../Components/ConfirmationReceiptStatus";
import { useSearchParams } from "react-router-dom";
import EditConfirmation from "../Components/EditConfirmation";
import { useEffect, useRef, useState } from "react";
import AdminLayout from "../Components/AdminLayout";
import { confirmClientTable, getSupabaseClient } from "../lib/supabaseClient";
import {
  confirmationExportRow,
  deleteConfirmation,
  responseLabel,
  formatConfirmationDate,
  createConfirmationsCsv,
  documentMethodLabels,
  formatParticularitiesForDisplay,
  loadAllConfirmations,
  particularityLabels,
  personFullName,
  prepared2025Labels,
  relationLabels,
} from "../lib/clientConfirmations";
import { createRowsExcel } from "../lib/createSubmissionExcel";

const exportColumns = Object.keys(confirmationExportRow({}));

const panel = "rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm";
const button = "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-200/75 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15";

export default function AdminConfirmationsPage() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(() => searchParams.get("id"));
  const [search, setSearch] = useState("");
  const [clientType, setClientType] = useState("");
  const [season, setSeason] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState(exportColumns);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const deleteDialogRef = useRef(null);
  const deletePending = useRef(false);
  const exportDialogRef = useRef(null);
  const requestController = useRef(null);
  const exportPending = useRef(false);

  useEffect(() => {
    if (notice !== "La soumission a été supprimée.") return;
    const timeout = window.setTimeout(() => setNotice(""), 10000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function refresh() {
    const signal = requestController.current?.signal;
    setLoading(true);
    setError("");
    try {
      const data = await loadAllConfirmations(getSupabaseClient(), confirmClientTable, signal);
      if (signal?.aborted) return;
      setRows(data);
      setSelectedId((id) => data.some((row) => row.id === id) ? id : data[0]?.id);
    } catch {
      if (signal?.aborted) return;
      setRows([]);
      setSelectedId(null);
      setError("Impossible de charger les confirmations. Vérifiez votre connexion et les droits de lecture de la table des confirmations dans Supabase, puis réessayez.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }

  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;
    refresh();
    return () => controller.abort();
  }, []);

  async function exportAll(format) {
    if (exportPending.current || !selectedColumns.length) return;
    exportPending.current = true;
    const signal = requestController.current?.signal;
    exportDialogRef.current?.close();
    setExporting(true);
    setError("");
    try {
      // Reload all pages so exports include all confirmations, regardless of filters.
      const data = await loadAllConfirmations(getSupabaseClient(), confirmClientTable, signal);
      if (signal?.aborted) return;
      const exportRows = data.map(row => {
        const full = confirmationExportRow(row);
        return Object.fromEntries(exportColumns.filter(column => selectedColumns.includes(column)).map(column => [column, full[column]]));
      });
      if (!exportRows.length) throw new Error("Aucune confirmation à exporter.");
      const blob = format === "xlsx" ? createRowsExcel(exportRows)
        : new Blob([createConfirmationsCsv(exportRows)], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `confirmations-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (signal?.aborted) return;
      setError("Impossible d’exporter les confirmations. Vérifiez qu’il existe des confirmations accessibles, puis réessayez.");
    } finally { exportPending.current = false; if (!signal?.aborted) setExporting(false); }
  }

  function requestDelete(row) {
    if (loading || exporting || deletePending.current) return;
    setDeleteTarget(row);
    setDeleteError("");
    setNotice("");
    deleteDialogRef.current?.showModal();
  }

  async function confirmDelete() {
    if (!deleteTarget || deletePending.current) return;
    deletePending.current = true;
    setDeleting(true);
    setDeleteError("");
    const id = deleteTarget.id;
    try {
      await deleteConfirmation(getSupabaseClient(), confirmClientTable, id);
      if (requestController.current?.signal.aborted) return;
      setRows(current => current.filter(row => row.id !== id));
      setSelectedId(current => current === id ? null : current);
      setNotice("La soumission a été supprimée.");
      deleteDialogRef.current?.close();
      setDeleteTarget(null);
    } catch {
      if (!requestController.current?.signal.aborted) setDeleteError("Suppression non confirmée. Vérifiez votre connexion et vos droits administrateur, puis actualisez la liste avant de réessayer.");
    } finally {
      deletePending.current = false;
      if (!requestController.current?.signal.aborted) setDeleting(false);
    }
  }

  const normalize = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = rows.filter((row) => (!clientType || row.client_type === clientType) && (!season || String(row.tax_season) === season)
    && normalize(`${row.respondent_first_name} ${row.respondent_last_name} ${row.email} ${row.phone} ${(row.people || []).map(personFullName).join(" ")}`).includes(normalize(search.trim())));
  const selected = filtered.find((row) => row.id === selectedId) || filtered[0];
  const seasons = [...new Set(rows.map((row) => String(row.tax_season ?? "")).filter(Boolean))].sort().reverse();

  return (
    <AdminLayout subtitle="Confirmations et nouveaux dossiers">
      <main className="mx-auto flex min-h-dvh max-w-7xl flex-col px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-3xl font-extrabold tracking-[-0.04em]">Confirmations clients</h1><p className="mt-2 text-sm text-gray-600">Consultez les confirmations des anciens clients et les dossiers des nouveaux clients.</p></div>
          <button type="button" onClick={refresh} disabled={loading || exporting || deleting} className={button}>Actualiser</button>
        </div>
        <h2 className="mb-5 text-2xl font-extrabold">Anciens clients — confirmations</h2>
        <section aria-label="Statistiques des confirmations" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Confirmations reçues", rows.length], ["Réponses oui", rows.filter((row) => row.wants_tax_service === true).length], ["Réponses non", rows.filter((row) => row.wants_tax_service === false).length], ["Personnes à vérifier", rows.reduce((total, row) => total + (Number(row.to_validate_count) || 0), 0)]].map(([label, value]) => <div key={label} className={panel}><p className="text-sm text-gray-600">{label}</p><p className="mt-2 text-3xl font-bold text-blue-600">{loading || error ? "—" : value}</p></div>)}
        </section>
        <section className={`${panel} mb-6 flex flex-wrap items-center justify-between gap-4`}>
          <div><h2 className="font-extrabold">Export global — toutes les confirmations</h2><p className="mt-1 text-sm text-gray-600">Un seul fichier, toutes les saisons, indépendamment des filtres. Excel conserve les zéros initiaux du NAS et du téléphone.</p></div>
          <button type="button" onClick={() => exportDialogRef.current?.showModal()} disabled={loading || exporting || deleting || !rows.length} aria-haspopup="dialog" className={button}>
            {exporting ? "Export en cours…" : "Exporter"}
          </button>
          {exporting && <p role="status" className="text-sm text-gray-600">Préparation de l’export complet…</p>}
        </section>
        <dialog ref={exportDialogRef} aria-labelledby="export-format-title" aria-describedby="export-format-description" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border border-slate-200/60 bg-white p-6 text-gray-800 shadow-xl backdrop:bg-black/40">
          <h2 id="export-format-title" className="text-xl font-extrabold">Choisir le format d’export</h2>
          <p id="export-format-description" className="mt-2 text-sm text-gray-600">Toutes les confirmations seront regroupées dans un seul fichier avec les colonnes choisies. Dates au format jj/mm/aaaa (UTC).</p>
          <fieldset className="mt-5">
            <legend className="font-bold">Colonnes à exporter</legend>
            <div className="my-3 flex flex-wrap gap-3 text-sm">
              <button type="button" onClick={() => setSelectedColumns(exportColumns)} className="font-bold text-blue-700 underline">Tout sélectionner</button>
              <button type="button" onClick={() => setSelectedColumns([])} className="font-bold text-blue-700 underline">Tout désélectionner</button>
              <span className="text-gray-600">{selectedColumns.length} / {exportColumns.length} colonnes</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {exportColumns.map(column => <label key={column} className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={selectedColumns.includes(column)} onChange={event => setSelectedColumns(current => event.target.checked ? [...current, column] : current.filter(value => value !== column))} className="mt-0.5 h-4 w-4 accent-blue-600" />
                {column}
              </label>)}
            </div>
          </fieldset>
          {!selectedColumns.length && <p role="status" className="mt-4 text-sm text-red-700">Sélectionnez au moins une colonne.</p>}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => exportAll("csv")} disabled={!selectedColumns.length} className={button}>CSV (.csv)</button>
            <button type="button" onClick={() => exportAll("xlsx")} disabled={!selectedColumns.length} className={button}>Excel (.xlsx)</button>
          </div>
          <form method="dialog" className="mt-4 text-center">
            <button type="submit" className="rounded-lg px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-blue-50">Annuler</button>
          </form>
        </dialog>
        <dialog ref={deleteDialogRef} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { if (deletePending.current) event.preventDefault(); }} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-gray-800 shadow-xl backdrop:bg-black/40">
          <h2 id="delete-title" className="text-xl font-extrabold">Supprimer cette soumission ?</h2>
          <p id="delete-description" className="mt-3 text-sm leading-6">La réponse de <strong>{[deleteTarget?.respondent_first_name, deleteTarget?.respondent_last_name].filter(Boolean).join(" ") || "ce client"}</strong> pour {deleteTarget?.tax_season} sera définitivement supprimée. Cette action est irréversible.</p>
          {deleteError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{deleteError}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" autoFocus disabled={deleting} onClick={() => deleteDialogRef.current?.close()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-50">Annuler</button>
            <button type="button" disabled={deleting} onClick={confirmDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">{deleting ? "Suppression…" : "Supprimer définitivement"}</button>
          </div>
        </dialog>
        {notice && <p role="status" className="mb-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
        {error && <p role="alert" className="mb-6 rounded-xl border border-red-600/40 bg-red-600/10 p-4 text-sm text-red-600">{error}</p>}
        <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className={`${panel} flex min-h-0 min-w-0 flex-col overflow-hidden lg:min-h-[36rem] lg:[contain:size]`}>
            <p className="mb-4 text-sm font-bold text-gray-600">{filtered.length} confirmation(s) affichée(s) sur {rows.length}</p>
            <label htmlFor="confirmation-search" className="text-sm font-bold">Rechercher un client</label>
            <input id="confirmation-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, courriel, téléphone…" className={`${input} mt-2 mb-4`} />
            <label htmlFor="confirmation-client-type" className="text-sm font-bold">Type de client</label>
            <select id="confirmation-client-type" value={clientType} onChange={event => setClientType(event.target.value)} className={`${input} mt-2 mb-4`}>
              <option value="">Tous les clients</option><option value="new_client">Nouveaux clients</option><option value="returning_client">Anciens clients</option>
            </select>
            <label htmlFor="confirmation-season" className="text-sm font-bold">Saison fiscale</label>
            <select id="confirmation-season" value={season} onChange={(event) => setSeason(event.target.value)} className={`${input} mt-2 mb-5`}><option value="">Toutes les saisons</option>{seasons.map((value) => <option key={value}>{value}</option>)}</select>
            {loading ? <p role="status">Chargement des confirmations…</p> : (
              <div className="max-h-[65vh] space-y-3 overflow-y-auto overscroll-contain pr-1 lg:min-h-0 lg:max-h-none lg:flex-1">
                {filtered.map((row) => <div key={row.id} className="relative">
                <button type="button" onClick={() => setSelectedId(row.id)} aria-pressed={selected?.id === row.id} className={`w-full rounded-2xl border p-4 pr-14 text-left ${selected?.id === row.id ? "border-blue-600 bg-blue-600/10" : "border-slate-200/60 hover:bg-blue-50"}`}>
                  <span className="block font-extrabold">{[row.respondent_first_name, row.respondent_last_name].filter(Boolean).join(" ") || "Client sans nom"}</span>
                 {row.client_type === "new_client" ?  <span className="mt-2 block text-xs font-bold text-green-700">Nouveau client</span> : <span className="mt-2 block text-xs font-bold text-blue-700">Ancien client</span>}
                  <span className="mt-1 block break-all text-xs text-gray-600">{row.no_email ? "Aucun courriel" : row.email}</span>
                  <span className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${row.wants_tax_service ? "bg-green-600/10 text-green-600" : "bg-red-600/10 text-red-600"}`}>
                    {responseLabel(row.wants_tax_service)} pour {row.tax_season}
                  </span>
                  <span className="mt-3 block text-xs text-gray-600">Saison {row.tax_season} · {formatConfirmationDate(row.created_at)} · {row.total_people || 0} personne(s)</span>
                </button>
                <button type="button" aria-label={`Supprimer la soumission de ${[row.respondent_first_name, row.respondent_last_name].filter(Boolean).join(" ") || "ce client"}`} title="Supprimer la soumission" disabled={loading || exporting || deleting} onClick={() => requestDelete(row)} className="absolute right-2 top-2 rounded-lg p-2.5 text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"><TrashIcon /></button>
                </div>)}
                {!filtered.length && <p className="rounded-xl bg-blue-50 p-5 text-sm text-gray-600">{rows.length ? "Aucune confirmation ne correspond aux filtres." : "Aucune confirmation reçue pour le moment."}</p>}
              </div>
            )}
          </aside>
          <section aria-label="Fiche de confirmation" className={`${panel} min-w-0 overflow-hidden`}>
            {!loading && selected ? <>
              <header className="overflow-hidden rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/80 via-white to-slate-50">
                <div className="h-1 bg-blue-600" />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm"><FiUser className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Confirmation client</p>
                      <h2 className="mt-1 break-words text-2xl font-extrabold tracking-tight text-slate-900">{[selected.respondent_first_name, selected.respondent_last_name].filter(Boolean).join(" ") || "Client sans nom"}</h2>
                      <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{selected.client_type === "new_client" ? "Nouveau client" : "Ancien client"}</span><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${selected.wants_tax_service === true ? "border-emerald-200 bg-emerald-50 text-emerald-700" : selected.wants_tax_service === false ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{responseLabel(selected.wants_tax_service)} · {selected.tax_season}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200/70 bg-slate-50/80 px-5 py-3">
                  <button type="button" disabled={loading || exporting || deleting} onClick={() => { setNotice(""); setEditing(selected); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"><FiEdit2 aria-hidden="true" className="h-4 w-4" />Modifier</button>
                  <button type="button" disabled={loading || exporting || deleting} onClick={() => requestDelete(selected)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-50"><TrashIcon />Supprimer</button>
                </div>
              </header>
              <ConfirmationReceiptStatus key={selected.id} responseId={selected.id} />
              <div aria-label="Bilan de la confirmation" className="mt-5 grid gap-3 sm:grid-cols-3">
                {[["Places confirmées", selected.confirmed_count, <FiCheckCircle aria-hidden="true" className="h-4 w-4" />, "border-emerald-100 bg-emerald-50/50 text-emerald-700"], ["Demandes à évaluer", selected.review_count, <FiClock aria-hidden="true" className="h-4 w-4" />, "border-amber-100 bg-amber-50/50 text-amber-700"], ["À vérifier", selected.verify_count, <FiSearch aria-hidden="true" className="h-4 w-4" />, "border-blue-100 bg-blue-50/50 text-blue-700"]].map(([label, count, icon, tone]) => <div key={label} className={`min-w-0 rounded-xl border p-3.5 ${tone}`}><div className="flex items-center justify-between gap-2">{icon}<span className="text-2xl font-extrabold tabular-nums">{count ?? 0}</span></div><p className="mt-2 text-xs font-semibold">{label}</p></div>)}
              </div>
              <div className="mt-6 flex items-center gap-2 text-slate-800"><FiFileText aria-hidden="true" className="h-5 w-5 text-blue-600" /><h3 className="text-base font-bold">Coordonnées et renseignements</h3></div>
              <dl className="mt-3 grid gap-3 xl:grid-cols-2">
                <Info label="Nom" value={selected.respondent_last_name} />
                <Info label="Prénom" value={selected.respondent_first_name} />
                <Info label="Client 2025" value={prepared2025Labels[selected.people?.find(person => person.relation === "self")?.prepared_2025] || "Non renseigné"} />
                <Info label="Téléphone" value={selected.phone} href={selected.phone ? `tel:${selected.phone.replace(/[^+0-9]/g, "")}` : undefined} />
                <Info label="Courriel" value={selected.no_email ? "Aucun courriel" : selected.email} href={!selected.no_email && selected.email ? `mailto:${encodeURIComponent(selected.email)}` : undefined} />
                <Info label="Remise des documents" value={documentMethodLabels[selected.document_method] || selected.document_method} />
                {selected.document_method_note && <Info label="Précision au besoin — remise des documents" value={selected.document_method_note} />}
                <Info label="Le NAS appartient à" value={selected.identification_person_name} />
                <Info sensitive label="Trois derniers chiffres du NAS" value={!selected.sin_last_three ? "" : String(selected.sin_last_three).padStart(3, "0")} />
              </dl>

              <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4"><h3 className="flex items-center gap-2 text-base font-bold text-slate-800"><FiUsers aria-hidden="true" className="h-5 w-5 text-blue-600" />Personnes concernées</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{selected.people?.length || 0} personne(s)</span></div>
                <div className="mt-4 space-y-3">
                  {(selected.people || []).map((person, index) => (
                    <div key={`${person.id}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex items-start gap-3"><span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-blue-600">{index + 1}</span><div className="min-w-0"><p className="break-words font-bold text-slate-800">{personFullName(person)}</p><p className="mt-1 text-xs text-slate-500">{relationLabels[person.relation] || person.relation}</p></div></div>
                      <p className="mt-3 text-sm text-slate-600">Client 2025 : <span className="font-semibold text-slate-800">{prepared2025Labels[person.prepared_2025] || "Non renseigné"}</span></p>
                      <div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${person.calculated_status === "confirmed" ? "bg-emerald-50 text-emerald-700" : person.calculated_status === "review" ? "bg-amber-50 text-amber-800" : person.calculated_status === "verify" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{PERSON_STATUS[person.calculated_status] || "Refus de service — hors capacité"}</span><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><FiShield aria-hidden="true" className="h-3.5 w-3.5" />{person.sin_unknown ? "NAS inconnu" : person.sin_last_three ? `NAS ***${person.sin_last_three}` : "NAS non fourni"}</span></div>
                    </div>
                  ))}
                  {!(selected.people || []).length && <p className="text-sm text-gray-600">Aucune personne enregistrée.</p>}
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="flex items-center gap-2 border-b border-slate-100 pb-4 text-base font-bold text-slate-800"><FiClipboard aria-hidden="true" className="h-5 w-5 text-blue-600" />Particularités à prévoir</h3>
                {selected.particularities?.length ? (
                  <div className="mt-4 space-y-3">
                    {selected.particularities.map((item, index) => (
                      <div key={`${item.type}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                        <p className="font-bold text-slate-800">{particularityLabels[item.type] || item.type}</p>
                        {item.person_name && <p className="mt-1 text-sm text-gray-600">Personne concernée : {item.person_name}</p>}
                        {item.note && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg border-l-2 border-blue-200 bg-white p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-700">Précision au besoin : </span>{item.note}</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="mt-3 text-sm text-gray-600">{formatParticularitiesForDisplay(selected.particularities) || "Aucune particularité indiquée."}</p>}
              </section>
            </> : <p className="rounded-xl bg-blue-50 p-6 text-sm text-gray-600">{loading ? "Chargement…" : "Sélectionnez une confirmation pour consulter les renseignements."}</p>}
          </section>
        </div>
      </main>
      {editing && <EditConfirmation key={editing.id} row={editing} onClose={() => setEditing(null)} onSaved={saved => {
        setRows(current => current.map(row => row.id === saved.id ? saved : row));
        setSelectedId(saved.id);
        setEditing(null);
        setNotice("Les modifications ont été enregistrées.");
      }} />}
    </AdminLayout>
  );
}

function Info({ label, value, href, sensitive = false }) {
  return (
    <div className={`min-w-0 rounded-xl border p-4 ${sensitive ? "border-amber-100 bg-amber-50/40" : "border-slate-100 bg-slate-50/60"}`}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">{sensitive && <FiShield aria-hidden="true" className="h-3.5 w-3.5" />}{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800">{href ? <a href={href} className="break-all text-blue-700 hover:underline">{value}</a> : value === "" || value == null ? "—" : value}</dd>
    </div>
  );
}

function TrashIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>;
}
