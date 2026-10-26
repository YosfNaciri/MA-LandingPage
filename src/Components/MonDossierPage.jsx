function formatDateTime(value) {
  if (!value) return "Date non disponible";
  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value) {
  return value
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value ?? "");
}

export default function MonDossierPage({
  clientEmail,
  submission,
  documents = [],
  onSignOut,
  signingOut = false,
}) {
  const [documentViewer, setDocumentViewer] = useState({
    document: null,
    previewUrl: "",
    downloadUrl: "",
    loading: false,
    error: "",
  });
  const formData = submission.payload?.form_data || {};
  const visibleFields = Object.entries(formData).filter(
    ([key, value]) =>
      !key.startsWith("_") &&
      value !== "" &&
      value !== null &&
      value !== undefined,
  );

  async function openDocument(document) {
    if (!document.storage_path) return;
    setDocumentViewer({
      document,
      previewUrl: "",
      downloadUrl: "",
      loading: true,
      error: "",
    });

    const supabase = getSupabaseClient();
    const [previewResult, downloadResult] = await Promise.all([
      supabase.storage
        .from(intakeFilesBucket)
        .createSignedUrl(document.storage_path, 60 * 5),
      supabase.storage
        .from(intakeFilesBucket)
        .createSignedUrl(document.storage_path, 60 * 5, {
          download: document.original_filename || "document",
        }),
    ]);

    if (previewResult.error || downloadResult.error) {
      setDocumentViewer((current) => ({
        ...current,
        loading: false,
        error: "Impossible d’ouvrir ce document.",
      }));
      return;
    }

    setDocumentViewer({
      document,
      previewUrl: previewResult.data.signedUrl,
      downloadUrl: downloadResult.data.signedUrl,
      loading: false,
      error: "",
    });
  }

  const canPreview =
    documentViewer.document?.mime_type?.startsWith("image/") ||
    documentViewer.document?.mime_type === "application/pdf";

  return (
    <main className="ma-form-theme min-h-screen bg-linear-to-b from-white to-blue-50 text-ma-text">
      <div className="border-b border-ma-separator/60 bg-white px-4 py-3 text-sm text-ma-muted shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <span>
            Connecté avec :{" "}
            <strong className="font-extrabold text-ma-text">
              {clientEmail || "adresse email vérifiée"}
            </strong>
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-ma-primary/10 px-3 py-1 text-xs font-bold text-ma-primary sm:inline-flex">
              Accès sécurisé
            </span>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="rounded-full border border-ma-separator/80 bg-white px-4 py-2 text-xs font-extrabold text-ma-muted hover:border-ma-primary hover:text-ma-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? "Déconnexion..." : "Quitter"}
            </button>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-ma-separator/60 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.14em] text-ma-primary">
                Espace client
              </div>
              <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.04em]">
                Mon dossier
              </h1>
              <p className="mt-3 text-sm text-ma-muted">
                Soumission envoyée le {formatDateTime(submission.created_at)}
              </p>
            </div>
            <span className="rounded-full border border-ma-primary/25 bg-ma-primary/10 px-3 py-1.5 text-xs font-extrabold text-ma-primary">
              {submission.status || "Nouveau"}
            </span>
          </div>

          <div className="mt-8 rounded-2xl bg-ma-bg p-5">
            <h2 className="text-lg font-extrabold">
              {submission.nom_legal || "Ouverture de dossier"}
            </h2>
            <p className="mt-1 text-sm text-ma-muted">
              {submission.courriel || clientEmail}
            </p>
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-extrabold">Informations transmises</h2>
            <dl className="mt-4 grid gap-x-7 sm:grid-cols-2">
              {visibleFields.map(([key, value]) => (
                <div key={key} className="border-b border-ma-separator/50 py-3">
                  <dt className="text-xs font-bold uppercase tracking-wide text-ma-muted">
                    {formatLabel(key)}
                  </dt>
                  <dd className="mt-1 wrap-break-word text-sm font-bold text-ma-text">
                    {formatValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-extrabold">Documents transmis</h2>
            {documents.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {documents.map((document, index) => (
                  <li
                    key={`${document.document_type}-${index}`}
                    className="flex items-center justify-between gap-4 rounded-xl bg-ma-bg px-4 py-3 text-sm"
                  >
                    <span className="break-all font-bold">
                      {document.original_filename || document.document_type}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs font-bold text-ma-primary">
                        {document.status || "Reçu"}
                      </span>
                      <button
                        type="button"
                        onClick={() => openDocument(document)}
                        disabled={!document.storage_path}
                        className="rounded-full border border-ma-primary px-4 py-2 text-xs font-extrabold text-ma-primary hover:bg-ma-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Visualiser
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ma-muted">
                Aucun document transmis.
              </p>
            )}
          </section>
        </div>
      </section>

      {documentViewer.document && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ma-primary-dark/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDocumentViewer((current) => ({ ...current, document: null }));
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Aperçu du document"
            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-ma-separator/60 px-5 py-4">
              <h2 className="truncate font-extrabold text-ma-text">
                {documentViewer.document.original_filename || "Document"}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setDocumentViewer((current) => ({ ...current, document: null }))
                }
                className="rounded-full border border-ma-separator px-4 py-2 text-sm font-extrabold text-ma-muted hover:text-ma-primary"
              >
                Fermer
              </button>
            </header>

            <div className="min-h-72 flex-1 overflow-auto bg-ma-bg p-4">
              {documentViewer.loading ? (
                <div className="grid min-h-72 place-items-center text-sm font-bold text-ma-muted">
                  Chargement du document...
                </div>
              ) : documentViewer.error ? (
                <div className="grid min-h-72 place-items-center text-sm font-bold text-ma-danger">
                  {documentViewer.error}
                </div>
              ) : canPreview &&
                documentViewer.document.mime_type?.startsWith("image/") ? (
                <img
                  src={documentViewer.previewUrl}
                  alt={documentViewer.document.original_filename || "Document"}
                  className="mx-auto max-h-[68vh] max-w-full rounded-lg object-contain"
                />
              ) : canPreview ? (
                <iframe
                  src={documentViewer.previewUrl}
                  title={documentViewer.document.original_filename || "Document"}
                  className="h-[68vh] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="grid min-h-72 place-items-center text-center">
                  <div>
                    <p className="font-extrabold text-ma-text">
                      L’aperçu de ce format n’est pas disponible dans le navigateur.
                    </p>
                    <p className="mt-2 text-sm text-ma-muted">
                      Téléchargez le fichier pour le consulter.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {documentViewer.downloadUrl && (
              <footer className="border-t border-ma-separator/60 px-5 py-4 text-right">
                <a
                  href={documentViewer.downloadUrl}
                  className="inline-flex rounded-full bg-ma-primary px-6 py-3 text-sm font-extrabold text-white hover:bg-ma-primary-dark"
                >
                  Télécharger le fichier
                </a>
              </footer>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
import { useState } from "react";
import {
  getSupabaseClient,
  intakeFilesBucket,
} from "../lib/supabaseClient";
