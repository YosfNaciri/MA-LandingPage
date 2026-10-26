import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../Components/AdminLayout";
import { getSupabaseClient, intakeTable } from "../lib/supabaseClient";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-CA");
  } catch {
    return value;
  }
}

export default function AdminActivityLogsPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);

  const [submissions, setSubmissions] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
    // Initial load; subsequent refreshes are explicitly requested by the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError("");

    const [submissionsResult, historyResult] = await Promise.all([
      supabase
        .from(intakeTable)
        .select("id,type_client,nom_legal,courriel,status,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("client_intake_status_history")
        .select("id,submission_id,old_status,new_status,changed_at,note")
        .order("changed_at", { ascending: false })
        .limit(50),
    ]);

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

    setSubmissions(submissionsResult.data || []);
    setStatusHistory(historyResult.data || []);
    setLoading(false);
  }

  const activityItems = [
    ...submissions.map((submission) => ({
      id: `submission-${submission.id}`,
      type: "Nouvelle soumission",
      title: submission.nom_legal || "Sans nom",
      detail: `${submission.type_client || "—"} • ${submission.status || "—"}`,
      date: submission.created_at,
    })),
    ...statusHistory.map((entry) => ({
      id: `status-${entry.id}`,
      type: "Changement de statut",
      title: `${entry.old_status || "—"} → ${entry.new_status}`,
      detail: entry.note || "Statut modifié depuis l’espace admin",
      date: entry.changed_at,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <AdminLayout subtitle="Journal d’activité admin">
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-7 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-0.04em]">
              Logs d’activité
            </h1>
            <p className="mt-2 text-sm text-ma-muted">
              Dernières soumissions et changements de statut.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLogs}
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

        <section className="rounded-[22px] border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(36,71,139,0.08)]">
          {loading ? (
            <div className="rounded-xl bg-ma-bg p-6 text-center text-sm font-bold text-ma-muted">
              Chargement des logs...
            </div>
          ) : activityItems.length === 0 ? (
            <div className="rounded-xl bg-ma-bg p-6 text-center text-sm text-ma-muted">
              Aucun log pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-ma-separator/50">
              {activityItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 py-4 md:grid-cols-[180px_1fr_220px]"
                >
                  <div>
                    <span className="rounded-full bg-ma-primary/10 px-2.5 py-1 text-xs font-bold text-ma-primary">
                      {item.type}
                    </span>
                  </div>

                  <div>
                    <div className="font-extrabold text-ma-text">
                      {item.title}
                    </div>
                    <div className="mt-1 text-sm text-ma-muted">
                      {item.detail}
                    </div>
                  </div>

                  <div className="text-sm text-ma-muted md:text-right">
                    {formatDateTime(item.date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </AdminLayout>
  );
}
