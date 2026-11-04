import { FiCheckCircle, FiClock, FiSearch, FiArrowUpRight, FiPhone, FiMail, FiSave, FiUser, FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminLayout from "../Components/AdminLayout";
import { getSupabaseClient } from "../lib/supabaseClient";
import { PERSON_STATUS, CABINET_DECISIONS } from "../lib/confirmationRules";
import { relationLabels, formatExportDate } from "../lib/clientConfirmations";
import { createRowsExcel } from "../lib/createSubmissionExcel";

const columns =
  "id,response_id,person_key,first_name,last_name,relation,prepared_2025,calculated_status,cabinet_decision,decision_at,cabinet_response_sent,cabinet_response_sent_at,version,response:client_tax_season_confirmations(id,first_name,last_name,phone,email,client_type,tax_year,wants_tax_service,created_at)";
const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-60";
const categoryStyles = {
  confirmed: { title: "Capacité", hint: "Places confirmées", description: "Les personnes déjà confirmées pour la saison.", icon: FiCheckCircle, tone: "text-emerald-700", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", active: "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/15", bar: "bg-emerald-500" },
  review: { title: "Demandes à suivre", hint: "Demandes à évaluer", description: "Les demandes qui nécessitent une décision du cabinet.", icon: FiClock, tone: "text-amber-700", badge: "bg-amber-50 text-amber-800 ring-amber-200", active: "border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/15", bar: "bg-amber-500" },
  verify: { title: "À vérifier", hint: "Informations à confirmer", description: "Les dossiers dont les renseignements restent à vérifier.", icon: FiSearch, tone: "text-blue-700", badge: "bg-blue-50 text-blue-700 ring-blue-200", active: "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/15", bar: "bg-blue-500" },
};
export function personExportRow(person) {
  const r = person.response || {};
  return {
    "Identifiant de réponse": person.response_id,
    "Identifiant de personne": person.person_key,
    Prénom: person.first_name,
    Nom: person.last_name,
    Relation: relationLabels[person.relation] || person.relation,
    "Impôts 2025":
      { yes: "Oui", no: "Non", unknown: "Je ne sais pas" }[
        person.prepared_2025
      ] || "Non renseigné",
    "Statut calculé": PERSON_STATUS[person.calculated_status],
    "Décision du cabinet": person.cabinet_decision || "",
    "Date de décision": formatExportDate(person.decision_at),
    "Réponse du cabinet envoyée": person.cabinet_response_sent ? "Oui" : "Non",
    "Date de réponse du cabinet": formatExportDate(
      person.cabinet_response_sent_at,
    ),
    Répondant: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
    Téléphone: r.phone || "",
    Courriel: r.email || "",
    "Type de client": r.client_type || "",
    "Saison fiscale": r.tax_year,
    "Date de confirmation": formatExportDate(r.created_at),
  };
}
export default function AdminPeople() {
  const [params, setParams] = useSearchParams();
  const view = ["confirmed", "verify", "review"].includes(params.get("status"))
    ? params.get("status")
    : "confirmed";
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("");
  const [clientType, setClientType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    (async () => {
      const all = [];
      for (let offset = 0; ; ) {
        const { data, error } = await getSupabaseClient()
          .from("client_confirmation_people")
          .select(columns)
          .order("id")
          .range(offset, offset + 499)
          .abortSignal(controller.signal);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...data);
        offset += data.length;
      }
      if (!controller.signal.aborted)
        setRows(all.filter((row) => row.response?.wants_tax_service === true));
    })()
      .catch(() => {
        if (!controller.signal.aborted) {
          setRows([]);
          setError(
            "Impossible de charger les personnes. Vérifiez la migration et les droits administrateur.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const scope = rows.filter(
    (p) =>
      (!season || String(p.response?.tax_year) === season) &&
      (!clientType || p.response?.client_type === clientType) &&
      `${p.first_name} ${p.last_name} ${p.response?.first_name} ${p.response?.last_name} ${p.response?.email} ${p.response?.phone}`
        .toLocaleLowerCase("fr")
        .includes(search.trim().toLocaleLowerCase("fr")),
  );
  const filtered = scope.filter((p) => p.calculated_status === view);
  function exportFiltered() {
    const blob = createRowsExcel(filtered.map(personExportRow));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personnes-${view}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <AdminLayout subtitle="Capacité et suivi des personnes">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-extrabold">Capacité et suivi</h1>
        <p className="mt-3 text-sm text-gray-600">
          La capacité compte les statuts calculés Confirmé. Les décisions du
          cabinet restent séparées et ne modifient pas ce bilan. Les refus du
          service sont exclus.
        </p>
        <div className="my-7 grid gap-4 md:grid-cols-3">
          {["confirmed", "review", "verify"].map(key => {
            const style = categoryStyles[key];
            const Icon = style.icon;
            const active = view === key;
            const total = scope.filter(person => person.calculated_status === key).length;
            return <button type="button" key={key} onClick={() => setParams({ status: key })} aria-pressed={active}
              className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 sm:p-6 ${active ? style.active : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <span className={`absolute inset-x-0 top-0 h-1 ${style.bar}`} />
              <span className="flex items-center justify-between gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ring-inset ${style.badge}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? style.badge : "bg-slate-50 text-slate-500"}`}>{active ? "Vue sélectionnée" : "Voir les personnes"}</span>
              </span>
              <span className="mt-5 block text-sm font-bold text-slate-700">{style.title}</span>
              <span className="mt-2 flex flex-wrap items-baseline gap-x-2"><span className={`text-4xl font-extrabold tracking-tight tabular-nums ${style.tone}`}>{loading || error ? "—" : total}</span><span className="text-sm text-slate-500">{total === 1 ? "personne" : "personnes"}</span></span>
              <span className="mt-2 text-xs font-semibold text-slate-500">{style.hint}</span>
              <span className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-4 text-sm text-slate-600"><span>{style.description}</span><FiArrowRight aria-hidden="true" className={`h-5 w-5 shrink-0 ${style.tone}`} /></span>
            </button>;
          })}
        </div>
        <section
          aria-label="Filtres des personnes"
          className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3"
        >
          <label className="text-sm font-bold">
            Rechercher
            <input
              className={input}
              placeholder="Nom, répondant, courriel ou téléphone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            Saison fiscale
            <select
              className={input}
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            >
              <option value="">Toutes</option>
              {[...new Set(rows.map((p) => p.response?.tax_year))]
                .filter(Boolean)
                .sort()
                .map((year) => (
                  <option key={year}>{year}</option>
                ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Type de client
            <select
              className={input}
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
            >
              <option value="">Tous</option>
              <option value="new_client">Nouveau client</option>
              <option value="returning_client">Ancien client</option>
            </select>
          </label>
        </section>
        <div className="my-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setRevision((x) => x + 1)}
            disabled={loading}
            className="rounded-lg border border-blue-600 px-4 py-2 font-bold text-blue-700"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={exportFiltered}
            disabled={loading || !!error || !filtered.length}
            className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            Exporter cette vue en Excel
          </button>
          <p className="self-center text-sm text-gray-600">
            Une ligne par personne, filtres appliqués. L’export global reste
            dans Confirmations.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <p role="status">Chargement…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 py-2"><h2 className="text-lg font-bold text-slate-900">{categoryStyles[view].title}</h2><p className="text-sm text-slate-500">{filtered.length} personne(s) dans cette vue</p></div>
            {filtered.map((person) => (
              <PersonDecision
                key={`${person.id}-${person.version}`}
                person={person}
                onSaved={(saved) =>
                  setRows((current) =>
                    current.map((row) =>
                      row.id === saved.id ? { ...row, ...saved } : row,
                    ),
                  )
                }
              />
            ))}
            {!error && !filtered.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><FiCheckCircle aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p className="font-semibold text-slate-700">Aucune personne dans cette vue.</p><p className="mt-2 text-sm text-slate-500">Choisissez une autre catégorie ou ajustez vos filtres.</p></div>
            )}
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
function PersonDecision({ person, onSaved }) {
  const [decision, setDecision] = useState(person.cabinet_decision || "");
  const [sent, setSent] = useState(person.cabinet_response_sent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await getSupabaseClient()
        .from("client_confirmation_people")
        .update({
          cabinet_decision: decision || null,
          cabinet_response_sent: sent,
        })
        .eq("id", person.id)
        .eq("version", person.version)
        .select(
          "id,cabinet_decision,decision_at,cabinet_response_sent,cabinet_response_sent_at,version",
        );
      if (error || data?.length !== 1)
        throw new Error(
          "Enregistrement non confirmé : la personne a changé ou vos droits sont insuffisants. Actualisez avant de réessayer.",
        );
      onSaved(data[0]);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const style = categoryStyles[person.calculated_status] || categoryStyles.verify;
  const StatusIcon = style.icon;
  const response = person.response || {};
  const dirty = decision !== (person.cabinet_decision || "") || Boolean(sent) !== Boolean(person.cabinet_response_sent);
  const initials = `${person.first_name?.[0] || ""}${person.last_name?.[0] || ""}`.toLocaleUpperCase("fr");
  return (
    <article className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className={`absolute inset-y-0 left-0 w-1 ${style.bar}`} />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div aria-hidden="true" className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-extrabold ring-1 ring-inset ${style.badge}`}>{initials || <FiUser className="h-5 w-5" />}</div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-xl font-bold tracking-tight text-slate-900">{person.first_name} {person.last_name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-slate-500">{relationLabels[person.relation] || person.relation || "Lien non renseigné"}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}><StatusIcon aria-hidden="true" className="h-3.5 w-3.5" />{PERSON_STATUS[person.calculated_status]}</span></div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Répondant</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">{[response.first_name, response.last_name].filter(Boolean).join(" ") || "Non renseigné"}</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex min-w-0 items-start gap-2"><FiPhone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{response.phone ? <a href={`tel:${response.phone.replace(/[^+0-9]/g, "")}`} className="break-words text-slate-600 hover:text-blue-700 hover:underline">{response.phone}</a> : <span className="text-slate-400">Téléphone non renseigné</span>}</div>
              <div className="flex min-w-0 items-start gap-2"><FiMail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{response.email ? <a href={`mailto:${encodeURIComponent(response.email)}`} className="break-all text-slate-600 hover:text-blue-700 hover:underline">{response.email}</a> : <span className="text-slate-400">Sans courriel</span>}</div>
            </div>
          </div>
          <Link to={`/admin/confirmations?id=${encodeURIComponent(person.response_id)}`} className="mt-4 inline-flex items-center gap-2 rounded-lg py-2 text-sm font-bold text-blue-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Ouvrir la réponse<FiArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        <form onSubmit={save} className="min-w-0 space-y-4 border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Suivi du cabinet</h3>{dirty && <span role="status" className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Modifications non enregistrées</span>}</div>
          <label htmlFor={`decision-${person.id}`} className="block text-sm font-medium text-slate-600">Décision du cabinet
            <select id={`decision-${person.id}`} aria-label="Décision du cabinet" className={input} disabled={busy} value={decision} onChange={e => setDecision(e.target.value)}>
              {CABINET_DECISIONS.map(value => <option key={value} value={value}>{value || "Aucune décision"}</option>)}
            </select>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${sent ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
            <input type="checkbox" aria-label="Réponse du cabinet envoyée (suivi manuel)" disabled={busy} checked={Boolean(sent)} onChange={e => setSent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
            <span className="min-w-0 text-sm font-semibold text-slate-700">Réponse du cabinet envoyée (suivi manuel)<span className="mt-1 block text-xs font-normal leading-5 text-slate-500">Cochez après avoir contacté le client. Aucun courriel n’est envoyé ici.</span></span>
          </label>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><p>Décision : <span className="font-medium text-slate-700">{formatExportDate(person.decision_at) || "—"}</span></p><p>Réponse : <span className="font-medium text-slate-700">{formatExportDate(person.cabinet_response_sent_at) || "—"}</span></p></div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy || !dirty} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"><FiSave aria-hidden="true" className="h-4 w-4" />{busy ? "Enregistrement…" : "Enregistrer le suivi"}</button>
        </form>
      </div>
    </article>
  );
}
