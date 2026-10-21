import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  const responsible = import.meta.env.VITE_PRIVACY_CONTACT_NAME?.trim() || "Responsable de la protection des renseignements personnels";
  const email = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL?.trim() || "gabriel@adamcowen.com";
  const retention = import.meta.env.VITE_PRIVACY_RETENTION?.trim();
  const hosting = import.meta.env.VITE_PRIVACY_HOSTING?.trim();
  const incomplete = !responsible || !email || !retention || !hosting;
  return (
    <main className="min-h-screen bg-linear-to-b from-white to-blue-50 px-4 pb-16 pt-32 text-gray-800 sm:pt-40">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold text-blue-600">Martine Adam CPA</p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Politique de confidentialité</h1>
        <p className="mt-3 text-sm text-gray-600">Version préparée le 18 octobre 2026</p>
        {incomplete && <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Projet à compléter et à valider par le cabinet avant publication : durée de conservation et lieux d’hébergement.</p>}

        <Section title="1. Objet de cette politique">
          <p>Cette politique explique le traitement des renseignements recueillis par le formulaire de confirmation de la saison fiscale de Martine Adam CPA (le « cabinet »). Elle est préparée dans le cadre de la Loi sur la protection des renseignements personnels dans le secteur privé du Québec, modifiée notamment par la Loi 25.</p>
          <p>Elle concerne ce formulaire et son administration. Les autres formulaires intégrés au site, notamment ceux fournis par Fillout, peuvent entraîner des traitements supplémentaires à préciser dans leurs avis respectifs.</p>
        </Section>
        <Section title="2. Renseignements recueillis et finalités">
          <ul className="list-disc space-y-2 pl-5">
            <li>Votre prénom et votre nom : rattacher votre réponse à votre dossier.</li>
            <li>Votre téléphone et votre courriel : confirmer vos coordonnées et communiquer avec vous au sujet de votre réponse et du suivi du dossier.</li>
            <li>Les trois derniers chiffres du NAS et le nom de leur titulaire : faciliter le rapprochement avec le dossier existant. Ne transmettez pas votre NAS complet dans ce formulaire ou dans les champs libres.</li>
            <li>Votre réponse Oui ou Non, l’année fiscale et les renseignements sur les personnes concernées : organiser la prochaine saison et préciser les personnes pour lesquelles vous sollicitez le service.</li>
            <li>Les particularités déclarées, vos précisions et votre préférence de remise des documents : préparer le suivi adapté à votre situation.</li>
            <li>La date de la réponse et, selon le parcours, une indication du navigateur : assurer le suivi technique et administratif de l’envoi.</li>
          </ul>
          <p>Les renseignements sont transmis lorsque vous envoyez le formulaire. Les champs marqués d’un astérisque sont nécessaires à son envoi en ligne. Si vous ne souhaitez pas les fournir par ce moyen, contactez le cabinet pour discuter d’une autre façon de répondre.</p>
        </Section>
        <Section title="3. Renseignements concernant une autre personne">
          <p>Lorsque vous renseignez le formulaire pour un conjoint, un enfant ou un parent, assurez-vous d’être autorisé à communiquer ses renseignements et informez cette personne de leur utilisation. Limitez vos précisions aux renseignements utiles à la demande.</p>
        </Section>
        <Section title="4. Accès et prestataires">
          <p>Au sein du cabinet, les renseignements sont destinés aux membres autorisés de l’équipe qui assurent le suivi des clients et la préparation des dossiers. L’administration permet à ces personnes de consulter les réponses et de les exporter en CSV ou en Excel ; ces copies doivent bénéficier de protections appropriées.</p>
          <p>Le formulaire utilise Supabase pour le stockage des réponses et l’authentification des administrateurs. Les fournisseurs d’hébergement et de soutien technique peuvent traiter des renseignements dans le cadre de leurs services. Toute autre communication doit reposer sur votre consentement ou sur une autorisation prévue par la loi.</p>
        </Section>
        <Section title="5. Hébergement et communications hors Québec">
          <p>Selon les lieux d’hébergement et les services utilisés, des renseignements peuvent être traités ou conservés à l’extérieur du Québec. Les modalités applicables doivent être évaluées par le cabinet, notamment au moyen de l’évaluation des facteurs relatifs à la vie privée et des ententes requises avant un tel transfert.</p>
          <p><strong>Lieux et prestataires concernés : </strong>{hosting || "à confirmer par le cabinet avant publication."}</p>
        </Section>
        <Section title="6. Conservation et protection">
          <p>La conservation doit être limitée à ce qui est nécessaire aux finalités annoncées et aux obligations légales ou professionnelles applicables. Lorsque ces finalités sont accomplies, les renseignements doivent être détruits ou, lorsque la loi le permet, anonymisés. Cette gestion concerne également les exports et les copies conservées par le cabinet.</p>
          <p><strong>Durée ou critères de conservation du formulaire : </strong>{retention || "à préciser par le cabinet avant publication ; aucune suppression automatique à échéance n’est annoncée."}</p>
          <p>L’accès à l’administration nécessite une authentification et un rôle autorisé. Des mesures techniques et organisationnelles adaptées à la sensibilité des renseignements doivent compléter cette protection. Aucun moyen informatique ne garantit une sécurité absolue.</p>
        </Section>
        <Section title="7. Vos droits et vos demandes">
          <p>Vous pouvez demander l’accès à vos renseignements, leur rectification et, lorsque les conditions légales sont remplies, une copie de vos renseignements informatisés dans un format technologique structuré et couramment utilisé. Vous pouvez aussi demander le retrait de votre consentement pour les traitements qui en dépendent, sous réserve des obligations légales de conservation et des conséquences sur les services demandés.</p>
          <p>Adressez votre demande ou votre plainte au responsable ci-dessous. Votre identité peut être vérifiée de façon proportionnée. Les demandes d’accès et de rectification doivent recevoir une réponse écrite dans les délais légaux, généralement 30 jours. Un recours peut être exercé auprès de la Commission d’accès à l’information du Québec.</p>
        </Section>
        <Section title="8. Responsable de la protection des renseignements personnels">
          <p><strong>Nom ou titre : </strong>{responsible || "à compléter par le cabinet avant publication."}</p>
          <p><strong>Courriel professionnel : </strong>{email ? <a href={`mailto:${email}`} className="text-blue-700 underline">{email}</a> : "à compléter par le cabinet avant publication."}</p>
          <p>N’envoyez pas de NAS complet ni de documents fiscaux sensibles dans une simple demande de renseignements par courriel.</p>
        </Section>
        <Section title="9. Stockage local, liens et mises à jour">
          <p>La connexion administrateur utilise le stockage local du navigateur pour maintenir la session. Les liens externes et les formulaires tiers relèvent aussi des pratiques de leurs fournisseurs. Les technologies supplémentaires de suivi éventuellement ajoutées au site doivent être décrites et gérées conformément aux règles applicables.</p>
          <p>Cette politique sera ajustée aux changements de pratiques du cabinet. La version et la date seront mises à jour ; les changements importants seront portés à l’attention des personnes concernées selon les exigences applicables.</p>
        </Section>
        <p className="mt-8 border-t border-slate-200 pt-5 text-sm text-gray-600">Références : <a className="text-blue-700 underline" href="https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/collecte-renseignements-personnels_entreprises" target="_blank" rel="noopener noreferrer">Commission d’accès à l’information</a> et <a className="text-blue-700 underline" href="https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1" target="_blank" rel="noopener noreferrer">loi québécoise applicable</a>.</p>
        <Link to="/confirm-client" className="mt-6 inline-block font-semibold text-blue-700 underline">Accéder au formulaire</Link>
      </article>
    </main>
  );
}

function Section({ title, children }) {
  return <section className="mt-8 space-y-3 leading-7"><h2 className="text-xl font-bold text-blue-700">{title}</h2>{children}</section>;
}
