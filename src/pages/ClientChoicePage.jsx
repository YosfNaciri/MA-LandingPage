import { Link } from "react-router-dom";

export default function ClientChoicePage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-white to-blue-50 px-4 pb-16 pt-32 text-gray-800 sm:pt-40">
      <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-xl sm:p-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Votre dossier client</h1>
        <p className="mt-4 leading-7 text-gray-600">
          Êtes-vous déjà client du cabinet Martine Adam CPA ? Choisissez votre situation pour accéder au formulaire adapté.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <article className="flex flex-col rounded-xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="text-xl font-bold">Ancien client</h2>
            <p className="mb-6 mt-3 flex-1 leading-6 text-gray-600">
              Vous avez déjà un dossier au cabinet. Confirmez vos besoins pour la prochaine saison fiscale.
            </p>
            <Link to="/confirmation-client/formulaire" className="inline-flex justify-center rounded-md bg-blue-600 px-5 py-3.5 text-center font-bold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
              Je suis déjà client
            </Link>
          </article>
          <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Nouveau client</h2>
            <p className="mb-6 mt-3 flex-1 leading-6 text-gray-600">
              Vous êtes nouveau au cabinet. Remplissez le formulaire pour nous transmettre vos besoins pour la prochaine saison fiscale.
            </p>
            <Link to="/confirmation-client/nouveau" className="inline-flex justify-center rounded-md border border-blue-600 bg-white px-5 py-3.5 text-center font-bold text-blue-600 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
              Je suis nouveau client
            </Link>
          </article>
        </div>
        <p className="mt-8 border-t border-blue-100 pt-6 text-center text-sm leading-7 text-gray-600">
          <strong className="font-semibold text-blue-700">Martine Adam devient Groupe Axolu CPA Inc.</strong>{" "}
          Un nouveau nom, la même équipe à vos côtés et la même attention portée à votre dossier,
          avec l’engagement de vous offrir un service toujours plus simple, personnalisé et attentionné.
        </p>
      </section>
    </main>
  );
}
