import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import IntakePage from "./IntakePage";
import MonDossierPage from "../Components/MonDossierPage";
import {
  getSupabaseClient,
  intakeDocumentsTable,
  intakeTable,
} from "../lib/supabaseClient";

function ClientAccessBar({ email, onSignOut, signingOut }) {
  return (
    <div className="border-b border-ma-separator/60 bg-white px-4 py-3 text-sm text-ma-muted shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <span>
          Connecté avec :{" "}
          <strong className="font-extrabold text-ma-text">
            {email || "adresse email vérifiée"}
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
  );
}

export default function OuvertureDossierPage() {
  const [loading, setLoading] = useState(true);
  const [clientEmail, setClientEmail] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  async function signOutClient() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("/demande-acces");
    } catch {
      setLoadError("Impossible de vous déconnecter. Veuillez réessayer.");
      setSigningOut(false);
    }
  }

  useEffect(() => {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function checkClientAccess() {
      setLoading(true);
      setLoadError("");

      // The shared client consumes the magic-link callback once, including
      // React StrictMode's double effect initialization.
      const sessionResult = await supabase.auth.getSession();

      const session = sessionResult.data.session;
      if (!mounted) return;

      if (sessionResult.error || !session) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const user = session.user;
      setIsAuthenticated(true);
      setClientEmail(user.email || null);

      const { data: existingSubmission, error: submissionError } =
        await supabase
          .from(intakeTable)
          .select(
            "id, user_id, created_at, status, type_client, nom_legal, courriel, payload",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (!mounted) return;

      if (submissionError) {
        console.error("Erreur chargement soumission :", submissionError);
        setLoadError("Impossible de charger votre dossier pour le moment.");
        setLoading(false);
        return;
      }

      setSubmission(existingSubmission || null);

      if (existingSubmission) {
        const { data: existingDocuments, error: documentsError } =
          await supabase
            .from(intakeDocumentsTable)
            .select(
              "submission_id, original_filename, document_type, status, uploaded_at, storage_path, mime_type",
            )
            .eq("user_id", user.id)
            .eq("submission_id", existingSubmission.id)
            .order("uploaded_at", { ascending: false });

        if (!mounted) return;
        if (documentsError) {
          console.error("Erreur chargement documents :", documentsError);
        } else {
          setDocuments(existingDocuments || []);
        }
      }

      setLoading(false);
    }

    checkClientAccess().catch(() => {
      if (!mounted) return;
      setLoadError("Impossible de charger votre dossier pour le moment.");
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setClientEmail(null);
          setSubmission(null);
          setDocuments([]);
        } else if (session) {
          setIsAuthenticated(true);
          setClientEmail(session.user.email || null);
        }
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <main className="ma-form-theme grid min-h-screen place-items-center bg-ma-bg px-4 text-ma-text">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-ma-separator border-t-ma-primary" />
          <p className="mt-4 text-sm font-bold text-ma-muted">
            Vérification de votre accès...
          </p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="ma-form-theme grid min-h-screen place-items-center bg-linear-to-b from-white to-blue-50 px-4 text-ma-text">
        <section className="w-full max-w-lg rounded-2xl border border-ma-separator/60 bg-white p-8 text-center shadow-[0_22px_55px_rgba(15,23,42,0.10)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ma-primary/10 text-2xl text-ma-primary">
            ✉
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.04em]">
            Accès non autorisé
          </h1>
          <p className="mt-4 leading-7 text-ma-muted">
            Ce formulaire est accessible uniquement depuis le lien sécurisé
            reçu par email.
          </p>
          <Link
            to="/demande-acces"
            className="mt-7 inline-flex rounded-full bg-ma-primary px-7 py-3 text-sm font-extrabold text-white hover:bg-ma-primary-dark"
          >
            Recevoir un lien d’accès
          </Link>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="ma-form-theme min-h-screen bg-ma-bg text-ma-text">
        <ClientAccessBar
          email={clientEmail}
          onSignOut={signOutClient}
          signingOut={signingOut}
        />
        <section className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-2xl border border-ma-danger/30 bg-white p-8 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <h1 className="text-2xl font-extrabold">Dossier indisponible</h1>
            <p className="mt-4 text-ma-danger">{loadError}</p>
          </div>
        </section>
      </main>
    );
  }

  if (submission) {
    return (
      <MonDossierPage
        clientEmail={clientEmail}
        submission={submission}
        documents={documents}
        onSignOut={signOutClient}
        signingOut={signingOut}
      />
    );
  }

  return (
    <div className="ma-form-theme min-h-screen bg-ma-bg text-ma-text">
      <ClientAccessBar
        email={clientEmail}
        onSignOut={signOutClient}
        signingOut={signingOut}
      />
      <IntakePage successPath="/ouverture-dossier" reloadOnSuccess />
    </div>
  );
}
