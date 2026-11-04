import { loadAllConfirmations } from "../lib/clientConfirmations";
import { readIntakePages } from "../lib/adminIntake";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../Components/AdminLayout";
import { getSupabaseClient, intakeTable, confirmClientTable } from "../lib/supabaseClient";

const STATUS_OPTIONS = [
  "Nouveau",
  "En révision",
  "Documents manquants",
  "En traitement",
  "Complété",
  "Archivé",
];

const STATUS_STYLES = {
  Nouveau: {
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    bar: "bg-sky-500",
  },
  "En révision": {
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    bar: "bg-indigo-500",
  },
  "Documents manquants": {
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  "En traitement": {
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  Complété: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
  Archivé: {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
  },
};

const DEFAULT_STATUS_STYLE = {
  badge: "border-ma-separator/60 bg-ma-bg text-ma-muted",
  bar: "bg-ma-primary",
};

function getStatusStyle(status) {
  return STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-CA");
  } catch {
    return value;
  }
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfLast7Days() {
  const date = startOfToday();
  date.setDate(date.getDate() - 6);
  return date;
}

export default function AdminDashboardPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [submissions, setSubmissions] = useState([]);
  const [clientType, setClientType] = useState("");
  const [confirmations, setConfirmations] = useState([]);
  const [confirmationError, setConfirmationError] = useState("");
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
    // Initial load; subsequent refreshes are explicitly requested by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    setConfirmationError("");

    const [submissionsResult, historyResult, confirmationsResult] = await Promise.all([
      readIntakePages(supabase, intakeTable, "id,type_client,nom_legal,courriel,telephone,status,created_at,updated_at"),
      supabase
        .from("client_intake_status_history")
        .select("id,submission_id,old_status,new_status,changed_at,note")
        .order("changed_at", { ascending: false })
        .limit(6),
      loadAllConfirmations(supabase, confirmClientTable)
        .then(data => ({ data, error: null }))
        .catch(() => ({ data: [], error: "Impossible de charger les métriques des confirmations. Veuillez réessayer." })),
    ]);

    setConfirmations(confirmationsResult.data);
    setConfirmationError(confirmationsResult.error || "");

    if (submissionsResult.error) {
      setError(submissionsResult.error.message);
      setLoading(false);
      return;
    }

    if (historyResult.error) {
      setError(historyResult.error.message);
      setLoading(false);
      return;
    }

    setSubmissions((submissionsResult.data || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
    setStatusHistory(historyResult.data || []);
    setLoading(false);
  }

  const statusCounts = STATUS_OPTIONS.map((status) => ({
    status,
    count: submissions.filter((submission) => submission.status === status).length,
  }));

  const totalCount = submissions.length;
  const todayCount = submissions.filter(
    (submission) => new Date(submission.created_at) >= startOfToday()
  ).length;
  const weekCount = submissions.filter(
    (submission) => new Date(submission.created_at) >= startOfLast7Days()
  ).length;
  const activeCount = submissions.filter(
    (submission) => !["Complété", "Archivé"].includes(submission.status)
  ).length;

  const visibleConfirmations = confirmations.filter(row => !clientType || row.client_type === clientType);
  const recentSubmissions = submissions.slice(0, 2);
  const recentSubmissionLogs = submissions.slice(0, 6);
  const maxStatusCount = Math.max(...statusCounts.map((item) => item.count), 1);

  return (
    <AdminLayout subtitle="Tableau de bord admin">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-7 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-0.04em]">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-ma-muted">
              Vue rapide des dossiers, statuts et dernières activités.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="w-fit rounded-full border border-ma-separator bg-white px-5 py-2.5 text-sm font-bold text-ma-muted hover:border-ma-primary hover:text-ma-primary"
          >
            Actualiser
          </button>
        </div>


        {error && (
          <div className="mb-6 rounded-[10px] border border-ma-danger/40 bg-ma-danger/10 px-4 py-3 text-sm font-bold text-ma-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[22px] border border-ma-separator/60 bg-white p-8 text-center text-sm font-bold text-ma-muted shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
            Chargement du dashboard...
          </div>
        ) : (
          <>
            <section aria-label="Métriques des confirmations clients" className="mb-8">
              <h2 className="mb-2 text-xl font-extrabold">Confirmations clients</h2>
              <p className="mb-5 text-sm text-ma-muted">Réponses reçues pour toutes les saisons fiscales.</p>
              <label htmlFor="dashboard-client-type" className="mb-2 block text-sm font-bold">Type de client</label>
              <select id="dashboard-client-type" value={clientType} onChange={event => setClientType(event.target.value)} className="mb-5 rounded-lg border border-ma-separator bg-white p-3 text-sm">
                <option value="">Tous les clients</option><option value="new_client">Nouveaux clients</option><option value="returning_client">Anciens clients</option>
              </select>
              {confirmationError && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">{confirmationError}</p>}
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Total confirmations", visibleConfirmations.length],
                  ["Réponses oui", visibleConfirmations.filter(row => row.wants_tax_service === true).length],
                  ["Réponses non", visibleConfirmations.filter(row => row.wants_tax_service === false).length],
                ].map(([label, value]) => <MetricCard key={label} label={label} value={confirmationError ? "—" : value} />)}
              </div>
              <div aria-label="Bilan des personnes" className="mt-5 grid gap-3 sm:grid-cols-3">
                {[["confirmed", "Places confirmées", "confirmed_count"], ["review", "Demandes à évaluer", "review_count"], ["verify", "À vérifier", "verify_count"]].map(([status, label, field]) => <Link key={status} to={`/admin/people?status=${status}`} className="rounded-xl border border-ma-separator bg-white p-4 text-sm"><span className="block font-bold">{label}</span><span className="mt-2 block text-2xl font-bold text-ma-primary">{confirmationError ? "—" : visibleConfirmations.reduce((total, row) => total + (row[field] || 0), 0)}</span></Link>)}
              </div>
              <section aria-label="Dernières confirmations" className="mt-6 rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div><h3 className="text-xl font-extrabold">Dernières confirmations</h3><p className="mt-1 text-sm text-ma-muted">Les dernières réponses reçues.</p></div>
                  <Link to="/admin/confirmations" className="shrink-0 rounded-full bg-ma-primary px-4 py-2 text-xs font-extrabold text-white hover:bg-ma-primary-dark">Voir tout</Link>
                </div>
                <div className="space-y-3">
                  {visibleConfirmations.slice(0, 2).map(row => (
                    <Link key={row.id} to={`/admin/confirmations?id=${encodeURIComponent(row.id)}`} className="block rounded-2xl border border-ma-separator/60 bg-white p-4 transition hover:border-ma-primary hover:bg-ma-bg">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0"><div className="break-words font-extrabold">{[row.respondent_first_name, row.respondent_last_name].filter(Boolean).join(" ") || "Client sans nom"}</div><div className="mt-1 break-all text-xs text-ma-muted">{row.no_email ? "Aucun courriel" : row.email || "—"}</div></div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${row.wants_tax_service === true ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.wants_tax_service === false ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{row.wants_tax_service === true ? "Oui" : row.wants_tax_service === false ? "Non" : "À préciser"}</span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-ma-primary">{row.client_type === "new_client" ? "Nouveau client · new_client" : "Ancien client · returning_client"}</p>
                      <p className="mt-3 text-xs text-ma-muted">Saison {row.tax_season || "—"} · {formatDateTime(row.created_at)}</p>
                    </Link>
                  ))}
                  {!confirmationError && !visibleConfirmations.length && <p className="rounded-xl bg-ma-bg p-5 text-center text-sm text-ma-muted">Aucune confirmation pour le moment.</p>}
                </div>
              </section>
            </section>
            <h2 className="mb-5 text-xl font-extrabold">Dossiers d’ouverture existants</h2>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total dossiers" value={totalCount} />
              <MetricCard label="Nouveaux aujourd’hui" value={todayCount} />
              <MetricCard label="7 derniers jours" value={weekCount} />
              <MetricCard label="Dossiers actifs" value={activeCount} />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
                <div className="mb-5">
                  <h2 className="text-xl font-extrabold">Statuts</h2>
                  <p className="mt-1 text-sm text-ma-muted">
                    Répartition des dossiers par statut.
                  </p>
                </div>

                <div className="space-y-4">
                  {statusCounts.map((item) => (
                    <div key={item.status}>
                      <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                        <span className="font-bold text-ma-text">
                          {item.status}
                        </span>
                        <span className="font-mono text-xs text-ma-muted">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ma-bg">
                        <div
                          className={[
                            "h-full rounded-full",
                            getStatusStyle(item.status).bar,
                          ].join(" ")}
                          style={{
                            width: `${Math.round(
                              (item.count / maxStatusCount) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Nouvelles soumissions
                    </h2>
                    <p className="mt-1 text-sm text-ma-muted">
                      Les derniers dossiers reçus.
                    </p>
                  </div>
                  <Link
                    to="/admin/submissions"
                    className="rounded-full bg-ma-primary px-4 py-2 text-xs font-extrabold text-white hover:bg-ma-primary-dark"
                  >
                    Voir tout
                  </Link>
                </div>

                <div className="space-y-3">
                  {recentSubmissions.map((submission) => (
                    <Link
                      key={submission.id}
                      to="/admin/submissions"
                      className="block rounded-2xl border border-ma-separator/60 bg-white p-4 transition hover:border-ma-primary hover:bg-ma-bg"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-extrabold text-ma-text">
                            {submission.nom_legal || "Sans nom"}
                          </div>
                          <div className="mt-1 text-xs text-ma-muted">
                            {submission.courriel || "—"}
                          </div>
                        </div>
                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-xs font-bold",
                            getStatusStyle(submission.status).badge,
                          ].join(" ")}
                        >
                          {submission.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ma-muted">
                        <span>{submission.type_client || "—"}</span>
                        <span>•</span>
                        <span>{formatDateTime(submission.created_at)}</span>
                      </div>
                    </Link>
                  ))}

                  {recentSubmissions.length === 0 && (
                    <div className="rounded-xl bg-ma-bg p-5 text-center text-sm text-ma-muted">
                      Aucune soumission pour le moment.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold">Logs d’activité</h2>
                  <p className="mt-1 text-sm text-ma-muted">
                    Changements récents de statut et arrivées de nouveaux dossiers.
                  </p>
                </div>
                <Link
                  to="/admin/logs"
                  className="shrink-0 rounded-full bg-ma-primary px-4 py-2 text-xs font-extrabold text-white hover:bg-ma-primary-dark"
                >
                  Voir tout
                </Link>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <ActivityList
                  title="Dernières nouvelles soumissions"
                  items={recentSubmissionLogs.map((submission) => ({
                    id: submission.id,
                    title: submission.nom_legal || "Sans nom",
                    meta: `${submission.status || "—"} • ${formatDateTime(
                      submission.created_at
                    )}`,
                  }))}
                  empty="Aucune nouvelle soumission."
                />

                <ActivityList
                  title="Derniers changements de statut"
                  items={statusHistory.map((entry) => ({
                    id: entry.id,
                    title: `${entry.old_status || "—"} → ${entry.new_status}`,
                    meta: `${entry.note || "Statut modifié"} • ${formatDateTime(
                      entry.changed_at
                    )}`,
                  }))}
                  empty="Aucun changement de statut."
                />
              </div>
            </section>
          </>
        )}
      </main>
    </AdminLayout>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
      <div className="text-sm font-bold text-ma-muted">{label}</div>
      <div className="mt-3 text-4xl font-extrabold tracking-[-0.04em] text-ma-text">
        {value}
      </div>
    </div>
  );
}

function ActivityList({ title, items, empty }) {
  return (
    <div className="rounded-2xl border border-ma-separator/60 p-4">
      <h3 className="mb-3 text-sm font-extrabold text-ma-text">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-ma-bg px-4 py-3">
            <div className="text-sm font-bold text-ma-text">{item.title}</div>
            <div className="mt-1 text-xs text-ma-muted">{item.meta}</div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="rounded-xl bg-ma-bg p-4 text-center text-sm text-ma-muted">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}
