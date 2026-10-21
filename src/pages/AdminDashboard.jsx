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
  relationLabels,
} from "../lib/clientConfirmations";
import { createRowsExcel } from "../lib/createSubmissionExcel";

const panel = "rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm";
const button = "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-200/75 bg-white px-3.5 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15";

export default function AdminConfirmationsPage() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [loading, setLoading] = useState(true);
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
    if (exportPending.current) return;
    exportPending.current = true;
    const signal = requestController.current?.signal;
    exportDialogRef.current?.close();
    setExporting(true);
    setError("");
    try {
      // Reload all pages so exports include all confirmations, regardless of filters.
      const data = await loadAllConfirmations(getSupabaseClient(), confirmClientTable, signal);
      if (signal?.aborted) return;
      const exportRows = data.map(confirmationExportRow);
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
  const filtered = rows.filter((row) => (!season || String(row.tax_season) === season)
    && normalize(`${row.respondent_first_name} ${row.respondent_last_name} ${row.email} ${row.phone} ${(row.people || []).map(personFullName).join(" ")}`).includes(normalize(search.trim())));
  const selected = filtered.find((row) => row.id === selectedId) || filtered[0];
  const seasons = [...new Set(rows.map((row) => String(row.tax_season ?? "")).filter(Boolean))].sort().reverse();

  return (
    <AdminLayout subtitle="Confirmations pour la prochaine saison">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div><h1 className="text-3xl font-extrabold tracking-[-0.04em]">Tableau de bord</h1><p className="mt-2 text-sm text-gray-600">Consultez les réponses et les coordonnées pour la prochaine saison fiscale.</p></div>
          <button type="button" onClick={refresh} disabled={loading || exporting || deleting} className={button}>Actualiser</button>
        </div>
        <section aria-label="Statistiques des confirmations" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Confirmations reçues", rows.length], ["Réponses oui", rows.filter((row) => row.wants_tax_service === true).length], ["Réponses non", rows.filter((row) => row.wants_tax_service === false).length], ["Personnes à vérifier", rows.reduce((total, row) => total + (Number(row.to_validate_count) || 0), 0)]].map(([label, value]) => <div key={label} className={panel}><p className="text-sm text-gray-600">{label}</p><p className="mt-2 text-3xl font-bold text-blue-600">{loading || error ? "—" : value}</p></div>)}
        </section>
        <section className={`${panel} mb-6 flex flex-wrap items-center justify-between gap-4`}>
          <div><h2 className="font-extrabold">Exporter toutes les confirmations</h2><p className="mt-1 text-sm text-gray-600">Un seul fichier, toutes les saisons, indépendamment des filtres. Excel conserve les zéros initiaux du NAS et du téléphone.</p></div>
          <button type="button" onClick={() => exportDialogRef.current?.showModal()} disabled={loading || exporting || deleting || !rows.length} aria-haspopup="dialog" className={button}>
            {exporting ? "Export en cours…" : "Exporter"}
          </button>
          {exporting && <p role="status" className="text-sm text-gray-600">Préparation de l’export complet…</p>}
        </section>
        <dialog ref={exportDialogRef} aria-labelledby="export-format-title" aria-describedby="export-format-description" className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200/60 bg-white p-6 text-gray-800 shadow-xl backdrop:bg-black/40">
          <h2 id="export-format-title" className="text-xl font-extrabold">Choisir le format d’export</h2>
          <p id="export-format-description" className="mt-2 text-sm text-gray-600">Toutes les confirmations seront regroupées dans un seul fichier.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => exportAll("csv")} className={button}>CSV (.csv)</button>
            <button type="button" onClick={() => exportAll("xlsx")} className={button}>Excel (.xlsx)</button>
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
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className={panel}>
            <p className="mb-4 text-sm font-bold text-gray-600">{filtered.length} confirmation(s) affichée(s) sur {rows.length}</p>
            <label htmlFor="confirmation-search" className="text-sm font-bold">Rechercher un client</label>
            <input id="confirmation-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, courriel, téléphone…" className={`${input} mt-2 mb-4`} />
            <label htmlFor="confirmation-season" className="text-sm font-bold">Saison fiscale</label>
            <select id="confirmation-season" value={season} onChange={(event) => setSeason(event.target.value)} className={`${input} mt-2 mb-5`}><option value="">Toutes les saisons</option>{seasons.map((value) => <option key={value}>{value}</option>)}</select>
            {loading ? <p role="status">Chargement des confirmations…</p> : (
              <div className="max-h-[65vh] space-y-3 overflow-y-auto">
                {filtered.map((row) => <div key={row.id} className="relative">
                <button type="button" onClick={() => setSelectedId(row.id)} aria-pressed={selected?.id === row.id} className={`w-full rounded-2xl border p-4 pr-14 text-left ${selected?.id === row.id ? "border-blue-600 bg-blue-600/10" : "border-slate-200/60 hover:bg-blue-50"}`}>
                  <span className="block font-extrabold">{[row.respondent_first_name, row.respondent_last_name].filter(Boolean).join(" ") || "Client sans nom"}</span>
                  <span className="mt-1 block break-all text-xs text-gray-600">{row.no_email ? "Aucun courriel" : row.email}</span>
                  <span className={`mt-3 inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${row.wants_tax_service ? "bg-blue-600/10 text-blue-600" : "bg-red-600/10 text-red-600"}`}>
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
          <section className={panel}>
            {!loading && selected ? <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-2xl font-extrabold">{[selected.respondent_first_name, selected.respondent_last_name].filter(Boolean).join(" ") || "Client sans nom"}</h2>
                <div className="flex flex-wrap gap-2">
                <button type="button" disabled={loading || exporting || deleting} onClick={() => { setNotice(""); setEditing(selected); }} className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">Modifier</button>
                <button type="button" disabled={loading || exporting || deleting} onClick={() => requestDelete(selected)} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"><TrashIcon />Supprimer</button>
                </div>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Nom" value={selected.respondent_last_name} />
                <Info label="Prénom" value={selected.respondent_first_name} />
                <Info label="Téléphone" value={selected.phone} />
                <Info label="Courriel" value={selected.no_email ? "Aucun courriel" : selected.email} />
                <Info label="Remise des documents" value={documentMethodLabels[selected.document_method] || selected.document_method} />
                {selected.document_method_note && <Info label="Précision au besoin — remise des documents" value={selected.document_method_note} />}
                <Info label="Le NAS appartient à" value={selected.identification_person_name} />
                <Info label="Trois derniers chiffres du NAS" value={!selected.sin_last_three ? "" : String(selected.sin_last_three).padStart(3, "0")} />
              </dl>

              <section className="mt-6 rounded-2xl bg-blue-50 p-5">
                <h3 className="text-lg font-extrabold text-blue-600">Personnes concernées</h3>
                <div className="mt-4 space-y-3">
                  {(selected.people || []).map((person, index) => (
                    <div key={`${person.id}-${index}`} className="rounded-xl bg-white p-4">
                      <p className="font-extrabold">{personFullName(person)}</p>
                      <p className="mt-1 text-sm text-gray-600">{relationLabels[person.relation] || person.relation}</p>
                      <p className="mt-2 text-sm">
                        {person.sin_unknown ? "NAS inconnu" : person.sin_last_three ? `NAS ***${person.sin_last_three}` : "NAS non fourni"}
                      </p>
                    </div>
                  ))}
                  {!(selected.people || []).length && <p className="text-sm text-gray-600">Aucune personne enregistrée.</p>}
                </div>
              </section>

              <section className="mt-6 rounded-2xl bg-blue-50 p-5">
                <h3 className="text-lg font-extrabold text-blue-600">Particularités à prévoir</h3>
                {selected.particularities?.length ? (
                  <div className="mt-4 space-y-3">
                    {selected.particularities.map((item, index) => (
                      <div key={`${item.type}-${index}`} className="rounded-xl bg-white p-4">
                        <p className="font-extrabold">{particularityLabels[item.type] || item.type}</p>
                        {item.person_name && <p className="mt-1 text-sm text-gray-600">Personne concernée : {item.person_name}</p>}
                        {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm"><span className="font-semibold">Précision au besoin : </span>{item.note}</p>}
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

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-blue-50 p-4">
      <dt className="text-xs font-bold text-gray-600">{label}</dt>
      <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-bold">{value === "" || value == null ? "—" : value}</dd>
    </div>
  );
}

function TrashIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>;
}
