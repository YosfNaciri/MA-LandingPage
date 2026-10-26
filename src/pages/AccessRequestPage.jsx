import { useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "../lib/supabaseClient";

export default function AccessRequestPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendAccessLink(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Veuillez saisir votre adresse email.");
      return;
    }

    try {
      setLoading(true);

      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/ouverture-dossier`,
          shouldCreateUser: true,
        },
      });
      


      if (error) {
        setErrorMessage(
          "Impossible d’envoyer le lien d’accès. Veuillez réessayer.",
        );
        return;
      }

      setMessage(
        "Un lien sécurisé vient de vous être envoyé par email. Veuillez vérifier votre boîte de réception.",
      );
    } catch {
      setErrorMessage(
        "Impossible d’envoyer le lien d’accès. Veuillez réessayer.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ma-form-theme grid min-h-screen place-items-center bg-linear-to-b from-white to-blue-50 px-4 py-12 text-ma-text">
      <section className="w-full max-w-xl rounded-2xl border border-ma-separator/60 bg-white/90 p-7 shadow-[0_22px_55px_rgba(15,23,42,0.10)] backdrop-blur sm:p-10">
        <Link to="/" className="text-2xl font-extrabold text-ma-primary">
          Martine Adam CPA
        </Link>
        <div className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-ma-primary">
          Ouverture de dossier sécurisée
        </div>

        <form onSubmit={handleSendAccessLink} className="mt-5 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-[-0.04em]">
            Ouverture de dossier
          </h1>
          <p className="mt-4 leading-7 text-ma-muted">
            Pour accéder au formulaire d’ouverture de dossier Martine Adam CPA,
            veuillez saisir votre adresse email. Vous recevrez un lien sécurisé.
          </p>
          <div className="pt-4">
            <label
              htmlFor="access-email"
              className="block text-sm font-bold text-ma-text"
            >
              Adresse email
            </label>
            <input
              id="access-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="exemple@email.com"
              className="mt-2 w-full rounded-lg border border-ma-separator/75 bg-white px-4 py-3.5 text-ma-text outline-none focus:border-ma-primary focus:ring-4 focus:ring-ma-primary/15"
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-ma-danger/40 bg-ma-danger/10 px-4 py-3 text-sm font-bold text-ma-danger"
            >
              {errorMessage}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-lg border border-ma-primary/30 bg-ma-primary/10 px-4 py-3 text-sm font-bold text-ma-primary"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-ma-primary px-7 py-3.5 text-sm font-extrabold text-white hover:bg-ma-primary-dark disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? "Envoi en cours..." : "Recevoir mon lien d’accès"}
          </button>
        </form>
      </section>
    </main>
  );
}
