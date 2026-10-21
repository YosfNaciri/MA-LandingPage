import { toConfirmationRecord } from "../lib/clientConfirmations";
import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { confirmClientTable, getSupabaseClient } from "../lib/supabaseClient";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-200/75 bg-white px-4 py-3.5 text-gray-800 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15";
const textareaClass = `${inputClass} min-h-28 resize-y`;
const buttonClass =
  "inline-flex justify-center rounded-md bg-blue-600 px-7 py-3.5 text-sm font-extrabold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600";
const secondaryButtonClass =
  "inline-flex justify-center rounded-md border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-extrabold text-blue-600 hover:bg-blue-50";

const relationLabels = {
  self: "Moi-même",
  spouse: "Conjoint ou conjointe",
  child: "Enfant",
  parent: "Parent",
  other: "Autre personne déjà cliente",
};

const preparedLabels = {
  yes: "Ancien client 2025",
  no: "Ajout à valider",
  unknown: "À vérifier",
};

const particularityLabels = {
  self_employed: "Travail autonome",
  rental_income: "Revenus d’immeuble locatif",
  dependent: "Autre situation à signaler",
  none: "Aucune",
  unknown: "Je ne sais pas",
};

function PageLayout({ children }) {
  return (
    <main className="min-h-screen bg-linear-to-b from-white to-blue-50 px-4 pb-16 pt-32 text-gray-800 sm:pt-40">
      <div className="mx-auto max-w-3xl">
        <section className="mt-8 rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-xl sm:p-10">
          {children}
        </section>
        <p className="mt-6 text-center text-sm text-gray-600">
          Martine Adam CPA · Préparation de votre prochaine saison fiscale
        </p>
      </div>
    </main>
  );
}

function PrivacyNotice() {
  const policyUrl = "/politique-de-confidentialite";
  return (
    <p className="text-xs leading-5 text-gray-600">
      Les trois derniers chiffres de votre NAS servent à retrouver votre dossier ;
      votre téléphone et votre courriel servent au suivi de votre réponse.
      Au cabinet, seuls les membres autorisés de l’équipe chargés de votre dossier
      ont accès à ces renseignements.
      {policyUrl && <> {" "}<a href={policyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800">Politique de confidentialité<span className="sr-only"> (nouvel onglet)</span></a>.</>}
    </p>
  );
}

function Field({ label, id, required = true, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        name={id}
        required={required}
        className={inputClass}
        {...props}
      />
    </div>
  );
}

function Choices({ legend, name, options, value, onChange, help }) {
  return (
    <fieldset>
      <legend className="text-sm font-bold">{legend} *</legend>
      {help && <p className="mt-2 text-xs leading-5 text-gray-600">{help}</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        {options.map(([optionValue, label]) => (
          <label
            key={optionValue}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/60 px-4 py-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600/5"
          >
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              required
              onChange={(event) => onChange(event.target.value)}
              className="h-4 w-4 accent-blue-600"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function emptyPerson(id, relation = "child") {
  return {
    id,
    firstName: "",
    lastName: "",
    relation,
    prepared2025: "",
    sinLastThree: "",
    sinUnknown: false,
    contact: "",
  };
}

function PersonCard({
  person,
  index,
  respondent,
  onChange,
  onRemove,
  canRemove,
  allowSelf,
  hasSpouse,
  lockRelation,
}) {
  const isRespondent = person.relation === "self";
  const canSkipSin =
    person.relation === "child" || person.relation === "parent";

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-blue-50/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-extrabold text-blue-600">Personne {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600/10"
          >
            Retirer
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {isRespondent ? (
          <>
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold text-gray-600">Prénom</p>
              <p className="mt-1 font-bold">
                {respondent.firstName || "À compléter plus haut"}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold text-gray-600">Nom</p>
              <p className="mt-1 font-bold">
                {respondent.lastName || "À compléter plus haut"}
              </p>
            </div>
          </>
        ) : (
          <>
            <Field
              label="Prénom"
              id={`person-${person.id}-first-name`}
              value={person.firstName}
              onChange={(event) => onChange({ firstName: event.target.value })}
              pattern=".*\S.*"
              maxLength={100}
            />
            <Field
              label="Nom"
              id={`person-${person.id}-last-name`}
              value={person.lastName}
              onChange={(event) => onChange({ lastName: event.target.value })}
              pattern=".*\S.*"
              maxLength={100}
            />
          </>
        )}

        <div>
          <label
            htmlFor={`person-${person.id}-relation`}
            className="block text-sm font-bold"
          >
            Relation *
          </label>
          <select
            id={`person-${person.id}-relation`}
            value={person.relation}
            disabled={isRespondent || lockRelation}
            required
            onChange={(event) =>
              onChange({ relation: event.target.value, sinUnknown: false })
            }
            className={inputClass}
          >
            <option value="self" disabled={!allowSelf}>
              Moi-même
            </option>
            <option
              value="spouse"
              disabled={hasSpouse && person.relation !== "spouse"}
            >
              Conjoint ou conjointe
            </option>
            <option value="child">Enfant</option>
            <option value="parent">Parent</option>
            <option value="other">Autre personne déjà cliente</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={`person-${person.id}-prepared`}
            className="block text-sm font-bold"
          >
            Avons-nous préparé ses impôts 2025 ? *
          </label>
          <select
            id={`person-${person.id}-prepared`}
            value={person.prepared2025}
            required
            onChange={(event) => onChange({ prepared2025: event.target.value })}
            className={inputClass}
          >
            <option value="" disabled>
              Sélectionnez une réponse
            </option>
            <option value="yes">Oui</option>
            <option value="no">Non</option>
            <option value="unknown">Je ne sais pas</option>
          </select>
        </div>
      </div>

      {!["self", "spouse"].includes(person.relation) && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`person-${person.id}-sin`}
              className="block text-sm font-bold"
            >
              3 derniers chiffres du NAS{canSkipSin ? "" : " *"}
            </label>
            <input
              id={`person-${person.id}-sin`}
              value={person.sinLastThree}
              required={!canSkipSin && !person.sinUnknown}
              disabled={person.sinUnknown}
              onChange={(event) =>
                onChange({
                  sinLastThree: event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 3),
                })
              }
              type="text"
              inputMode="numeric"
              autoComplete="off"
              minLength={3}
              maxLength={3}
              pattern="[0-9]{3}"
              className={inputClass}
            />
            {canSkipSin && (
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={person.sinUnknown}
                  onChange={(event) =>
                    onChange({
                      sinUnknown: event.target.checked,
                      sinLastThree: event.target.checked
                        ? ""
                        : person.sinLastThree,
                    })
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                Je ne les connais pas
              </label>
            )}
          </div>
          <div>
            <label
              htmlFor={`person-${person.id}-contact`}
              className="block text-sm font-bold"
            >
              Coordonnées si connues
            </label>
            <input
              id={`person-${person.id}-contact`}
              value={person.contact}
              onChange={(event) => onChange({ contact: event.target.value })}
              className={inputClass}
              placeholder="Téléphone ou courriel"
              maxLength={200}
            />
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Si elles sont inconnues, l’équipe les demandera au répondant.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function personName(person, respondent) {
  const firstName =
    person?.relation === "self" ? respondent.firstName : person?.firstName;
  const lastName =
    person?.relation === "self" ? respondent.lastName : person?.lastName;
  return (
    `${firstName || ""} ${lastName || ""}`.trim() ||
    relationLabels[person?.relation] ||
    "Personne"
  );
}

function peoplePayload(people, respondent) {
  return people.map((person) => ({
    id: person.id,
    first_name:
      person.relation === "self"
        ? respondent.firstName.trim()
        : person.firstName.trim(),
    last_name:
      person.relation === "self"
        ? respondent.lastName.trim()
        : person.lastName.trim(),
    relation: person.relation,
    prepared_2025: person.prepared2025,
    sin_last_three: ["self", "spouse"].includes(person.relation)
      ? null
      : person.sinLastThree || null,
    sin_unknown: person.sinUnknown,
    contact: person.contact.trim() || null,
  }));
}

function particularitiesPayload(selected, details, people, respondent) {
  return selected.map((key) => {
    const detail = details[key] || {};
    const person = people.find((item) => item.id === detail.personId);
    return {
      type: key,
      person_id: detail.personId || null,
      person_name: person ? personName(person, respondent) : null,
      note: detail.note?.trim() || null,
    };
  });
}

export default function ConfirmClientPage() {
  const navigate = useNavigate();
  const [wantsService, setWantsService] = useState("");
  const [declineScope, setDeclineScope] = useState("");
  const [respondent, setRespondent] = useState({ firstName: "", lastName: "" });
  const [people, setPeople] = useState([emptyPerson(1, "self")]);
  const [nextPersonId, setNextPersonId] = useState(2);
  const [coupleSinPersonId, setCoupleSinPersonId] = useState(1);
  const [coupleSinLastThree, setCoupleSinLastThree] = useState("");
  const [particularities, setParticularities] = useState([]);
  const [particularityDetails, setParticularityDetails] = useState({});
  const [documentMethod, setDocumentMethod] = useState("");
  const [documentMethodNote, setDocumentMethodNote] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [noEmail, setNoEmail] = useState(false);
  const [declineSin, setDeclineSin] = useState("");
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const hasSpouse = people.some((person) => person.relation === "spouse");
  const childrenCount = people.filter(
    (person) => person.relation === "child",
  ).length;
  const oldClientsCount = people.filter(
    (person) => person.prepared2025 === "yes",
  ).length;
  const toValidateCount = people.filter(
    (person) =>
      person.prepared2025 === "no" || person.prepared2025 === "unknown",
  ).length;
  const activePeople = useMemo(
    () =>
      people.filter(
        (person) =>
          person.relation === "self" ||
          person.firstName.trim() ||
          person.lastName.trim(),
      ),
    [people],
  );

  // The displayed default and submitted person must always match, including
  // after the previously selected person is removed from the household.
  const resolvedParticularityDetails = Object.fromEntries(
    particularities
      .filter((key) => !["none", "unknown"].includes(key))
      .map((key) => {
        const detail = particularityDetails[key] || {};
        const personId = activePeople.some(
          (person) => person.id === detail.personId,
        )
          ? detail.personId
          : activePeople[0]?.id;
        return [key, { ...detail, personId }];
      }),
  );

  function changeDeclineScope(scope) {
    setDeclineScope(scope);
    if (scope === "self") {
      setPeople((current) =>
        current.filter((person) => person.relation === "self"),
      );
      setCoupleSinPersonId(1);
    }
    if (scope === "couple") {
      setPeople((current) => {
        const couple = current.filter((person) =>
          ["self", "spouse"].includes(person.relation),
        );
        return couple.some((person) => person.relation === "spouse")
          ? couple
          : [...couple, emptyPerson(nextPersonId, "spouse")];
      });
      if (!hasSpouse) setNextPersonId((current) => current + 1);
      setCoupleSinPersonId(1);
    }
  }

  function changeWantsService(value) {
    setWantsService(value);
    setSubmitError("");
    setDeclineScope("");
  }

  function updatePerson(id, patch) {
    setPeople((current) =>
      current.map((person) =>
        person.id === id
          ? {
              ...person,
              ...patch,
              ...(patch.relation
                ? { sinLastThree: "", sinUnknown: false, contact: "" }
                : {}),
            }
          : person,
      ),
    );
    if (patch.relation && coupleSinPersonId === id) setCoupleSinPersonId(1);
  }

  function addPerson(relation = "child") {
    setPeople((current) => [...current, emptyPerson(nextPersonId, relation)]);
    setNextPersonId((current) => current + 1);
  }

  function removePerson(id) {
    setPeople((current) => current.filter((person) => person.id !== id));
    if (coupleSinPersonId === id) setCoupleSinPersonId(1);
    setParticularityDetails((current) =>
      Object.fromEntries(
        Object.entries(current).map(([key, detail]) => [
          key,
          detail.personId === id ? { ...detail, personId: null } : detail,
        ]),
      ),
    );
  }

  function toggleParticularity(key) {
    setParticularities((current) => {
      if (key === "none" || key === "unknown")
        return current.includes(key) ? [] : [key];
      const withoutExclusive = current.filter(
        (item) => !["none", "unknown"].includes(item),
      );
      return withoutExclusive.includes(key)
        ? withoutExclusive.filter((item) => item !== key)
        : [...withoutExclusive, key];
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current || !event.currentTarget.reportValidity()) return;
    if (!wantsService) return;
    if (
      wantsService === "yes" &&
      particularities.some(
        (key) =>
          !["none", "unknown"].includes(key) &&
          !activePeople.some(
            (person) =>
              person.id === resolvedParticularityDetails[key]?.personId,
          ),
      )
    ) {
      setSubmitError(
        "Sélectionnez la personne concernée pour chaque particularité.",
      );
      return;
    }
    submitting.current = true;
    setLoading(true);
    setSubmitError("");
    const identificationPerson =
      people.find((person) => person.id === Number(coupleSinPersonId)) ||
      activePeople[0];

    const payload = {
      tax_season: "2026",
      wants_tax_service: wantsService === "yes",
      decline_scope: wantsService === "no" ? declineScope : null,
      respondent_first_name: respondent.firstName.trim(),
      respondent_last_name: respondent.lastName.trim(),
      people: peoplePayload(activePeople, respondent),
      total_people: activePeople.length,
      old_clients_count: oldClientsCount,
      to_validate_count: toValidateCount,
      is_couple: hasSpouse,
      has_children: childrenCount > 0,
      children_count: childrenCount,
      identification_person_name: personName(identificationPerson, respondent),
      sin_last_three: coupleSinLastThree.trim() || null,
      particularities:
        wantsService === "yes"
          ? particularitiesPayload(
              particularities,
              resolvedParticularityDetails,
              activePeople,
              respondent,
            )
          : [],
      document_method:
        wantsService === "yes" ? documentMethod : "not_applicable",
      document_method_note:
        wantsService === "yes" ? documentMethodNote.trim() || null : null,
      phone: phone.trim(),
      email: noEmail ? null : email.trim(),
      no_email: noEmail,
      user_agent: navigator.userAgent || null,
    };

    try {
      const supabase = getSupabaseClient();
      const record =
        wantsService === "no"
          ? {
              tax_year: 2026,
              wants_tax_service: false,
              first_name: respondent.firstName.trim(),
              last_name: respondent.lastName.trim(),
              email: email.trim(),
              phone: phone.trim(),
              people: [
                {
                  id: 1,
                  relation: "self",
                  first_name: respondent.firstName.trim(),
                  last_name: respondent.lastName.trim(),
                },
              ],
              people_count: 1,
              yes_data: {},
              no_data: {
                decline_scope: "self",
                sin_last_three: declineSin,
                identification_person_name: `${respondent.firstName.trim()} ${respondent.lastName.trim()}`,
                no_email: false,
                document_method: "not_applicable",
                particularities: [],
                old_clients_count: 0,
                to_validate_count: 1,
                is_couple: false,
                has_children: false,
                children_count: 0,
              },
              initial_response_at: new Date().toISOString(),
              status: "completed",
            }
          : toConfirmationRecord(payload);
      const { error } = await supabase.from(confirmClientTable).insert(record);

      if (error) throw error;

      navigate("/confirmation-client/merci", {
        replace: true,
        state: { validated: true, wantsService: wantsService === "yes" },
      });
    } catch (error) {
      const setupError = [
        "42501",
        "PGRST204",
        "PGRST205",
        "42P01",
        "42703",
      ].includes(error?.code);
      setSubmitError(
        setupError
          ? "L’enregistrement n’est pas encore activé dans la base. Veuillez contacter notre équipe. Vos renseignements restent dans ce formulaire."
          : "Votre réponse n’a pas pu être enregistrée. Vos renseignements sont conservés dans ce formulaire : veuillez réessayer ou contacter notre équipe.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <PageLayout>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-blue-600">
        Impôts 2026
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
        Confirmez votre place
      </h1>
      <p className="mt-4 leading-7 text-gray-600">
        Indiquez si vous souhaitez nous confier vos impôts 2026 et quelles
        personnes doivent être incluses dans votre réponse.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200/70 bg-blue-50 p-4 text-sm leading-6">
        <strong className="text-blue-600">
          Votre confirmation est nécessaire.
        </strong>{" "}
        Si vous ne confirmez pas votre intention, nous ne pouvons pas garantir
        que votre dossier sera traité pour la prochaine saison fiscale.
      </div>

      <form onSubmit={handleSubmit} aria-busy={loading} className="mt-8">
        <fieldset disabled={loading} className="space-y-8">
          <p className="text-xs text-gray-600">
            Les champs marqués d’un astérisque (*) sont obligatoires.
          </p>

          <Choices
            legend="Souhaitez-vous nous confier vos impôts 2026 ?"
            name="wants-service"
            value={wantsService}
            onChange={changeWantsService}
            options={[
              ["yes", "Oui"],
              ["no", "Non"],
            ]}
          />

          {wantsService === "no" && (
            <fieldset className="space-y-5">
              <legend className="mb-5 text-xl font-extrabold text-blue-600">
                Confirmez votre identité et vos coordonnées
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Prénom"
                  id="first-name"
                  value={respondent.firstName}
                  onChange={(event) =>
                    setRespondent((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  autoComplete="given-name"
                  pattern={".*\\S.*"}
                  maxLength={100}
                />
                <Field
                  label="Nom"
                  id="last-name"
                  value={respondent.lastName}
                  onChange={(event) =>
                    setRespondent((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  autoComplete="family-name"
                  pattern={".*\\S.*"}
                  maxLength={100}
                />
              </div>
              <Field
                label="Numéro de téléphone"
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                maxLength={40}
                pattern={
                  "\\+?[ \\(]*[0-9](?:[ \\(\\).\\-]*[0-9]){9,14}[ \\).]*"
                }
                title="Saisissez de 10 à 15 chiffres."
                placeholder="514 555-0123"
              />
              <Field
                label="Adresse courriel"
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
              />
              <Field
                label="Trois derniers chiffres du NAS"
                id="decline-sin"
                value={declineSin}
                onChange={(event) =>
                  setDeclineSin(
                    event.target.value.replace(/[^0-9]/g, "").slice(0, 3),
                  )
                }
                inputMode="numeric"
                pattern="[0-9]{3}"
                minLength={3}
                maxLength={3}
                autoComplete="off"
                title="Saisissez exactement les trois derniers chiffres du NAS."
              />
            </fieldset>
          )}

          {wantsService !== "no" && (
            <>
              <fieldset className="space-y-5">
                <legend className="mb-5 text-xl font-extrabold text-blue-600">
                  Identification du répondant
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Prénom"
                    id="first-name"
                    value={respondent.firstName}
                    onChange={(event) =>
                      setRespondent((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    autoComplete="given-name"
                    pattern=".*\S.*"
                    maxLength={100}
                  />
                  <Field
                    label="Nom"
                    id="last-name"
                    value={respondent.lastName}
                    onChange={(event) =>
                      setRespondent((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    autoComplete="family-name"
                    pattern=".*\S.*"
                    maxLength={100}
                  />
                </div>
              </fieldset>

              {wantsService === "no" && (
                <Choices
                  legend="Pour quelles personnes cette réponse s’applique-t-elle ?"
                  name="decline-scope"
                  value={declineScope}
                  onChange={changeDeclineScope}
                  options={[
                    ["self", "Moi seulement"],
                    ["couple", "Moi et mon conjoint ou ma conjointe"],
                    ["all", "Toutes les personnes indiquées ci-dessous"],
                  ]}
                />
              )}

              {(wantsService === "yes" ||
                (wantsService === "no" && declineScope)) && (
                <fieldset className="space-y-5 border-t border-slate-200/40 pt-6">
                  <legend className="pr-3 text-xl font-extrabold text-blue-600">
                    Personnes concernées
                  </legend>
                  <p className="text-sm leading-6 text-gray-600">
                    Inscrivez chaque personne une seule fois. Le nombre total
                    est calculé automatiquement. Les nouveaux dossiers
                    concernant les parents ou les enfants devront être validés
                    par notre équipe avant toute réservation.
                  </p>
                  <p className="text-sm leading-6 text-gray-600">
                  Inscrire seulement les enfants pour lesquels une déclaration
                    de revenus distincte doit être effectuée (enfants de 18 ans
                    et +, enfant de moins de 18 ans si les impôts retenus à la
                    source sont supérieurs à 125 $)
                  </p>
                  {people.map((person, index) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      index={index}
                      respondent={respondent}
                      onChange={(patch) => updatePerson(person.id, patch)}
                      onRemove={() => removePerson(person.id)}
                      canRemove={
                        person.relation !== "self" &&
                        !(wantsService === "no" && declineScope === "couple")
                      }
                      hasSpouse={hasSpouse}
                      lockRelation={
                        wantsService === "no" && declineScope === "couple"
                      }
                      allowSelf={person.relation === "self"}
                    />
                  ))}
                  {(wantsService === "yes" || declineScope === "all") && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={hasSpouse}
                        onClick={() => addPerson("spouse")}
                        className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        Ajouter un conjoint
                      </button>
                      <button
                        type="button"
                        onClick={() => addPerson("child")}
                        className={secondaryButtonClass}
                      >
                        Ajouter un enfant
                      </button>
                      <button
                        type="button"
                        onClick={() => addPerson("parent")}
                        className={secondaryButtonClass}
                      >
                        Ajouter un parent
                      </button>
                    </div>
                  )}
                  <p className="rounded-xl bg-white p-4 text-sm font-bold text-blue-600">
                    Total : {activePeople.length} personne(s)
                  </p>
                </fieldset>
              )}

              {(wantsService === "yes" ||
                (wantsService === "no" && declineScope)) && (
                <fieldset className="space-y-5 border-t border-slate-200/40 pt-6">
                  <legend className="pr-3 text-xl font-extrabold text-blue-600">
                    Identification utile
                  </legend>
                  {hasSpouse ? (
                    <>
                      <p className="text-sm leading-6 text-gray-600">
                        Indiquez les trois derniers chiffres du NAS d’une seule
                        des deux personnes du couple.
                      </p>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="couple-sin-person"
                            className="block text-sm font-bold"
                          >
                            Ces chiffres appartiennent à *
                          </label>
                          <select
                            id="couple-sin-person"
                            value={coupleSinPersonId}
                            required
                            onChange={(event) =>
                              setCoupleSinPersonId(Number(event.target.value))
                            }
                            className={inputClass}
                          >
                            {activePeople
                              .filter((person) =>
                                ["self", "spouse"].includes(person.relation),
                              )
                              .map((person) => (
                                <option key={person.id} value={person.id}>
                                  {personName(person, respondent)}
                                </option>
                              ))}
                          </select>
                        </div>
                        <Field
                          label="3 derniers chiffres du NAS"
                          id="couple-sin"
                          value={coupleSinLastThree}
                          onChange={(event) =>
                            setCoupleSinLastThree(
                              event.target.value.replace(/\D/g, "").slice(0, 3),
                            )
                          }
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          minLength={3}
                          maxLength={3}
                          pattern="[0-9]{3}"
                          title="Saisissez exactement 3 chiffres."
                        />
                      </div>
                    </>
                  ) : (
                    <Field
                      label="3 derniers chiffres du NAS de la personne seule"
                      id="single-sin"
                      value={coupleSinLastThree}
                      onChange={(event) =>
                        setCoupleSinLastThree(
                          event.target.value.replace(/\D/g, "").slice(0, 3),
                        )
                      }
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      minLength={3}
                      maxLength={3}
                      pattern="[0-9]{3}"
                      title="Saisissez exactement 3 chiffres."
                    />
                  )}
                  <p className="text-xs leading-5 text-gray-600">
                    Pour les parents ou enfants dont les renseignements
                    d’identification manquent, vous pouvez envoyer le formulaire
                    quand même. La vérification se fera ensuite.
                  </p>
                </fieldset>
              )}

              {wantsService === "yes" && (
                <fieldset className="space-y-5 border-t border-slate-200/40 pt-6">
                  <legend className="pr-3 text-xl font-extrabold text-blue-600">
                    Particularités à prévoir en 2026
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(particularityLabels).map(([key, label]) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/60 px-4 py-3 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-600/5"
                      >
                        <input
                          type="checkbox"
                          checked={particularities.includes(key)}
                          onChange={() => toggleParticularity(key)}
                          className="mt-1 h-4 w-4 accent-blue-600"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  {particularities
                    .filter((key) => !["none", "unknown"].includes(key))
                    .map((key) => (
                      <div
                        key={key}
                        className="rounded-2xl border border-slate-200/60 bg-blue-50/60 p-4"
                      >
                        <h3 className="font-extrabold text-blue-600">
                          {particularityLabels[key]}
                        </h3>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`particularity-${key}-person`}
                              className="block text-sm font-bold"
                            >
                              Qui est concerné ? *
                            </label>
                            <select
                              id={`particularity-${key}-person`}
                              value={
                                resolvedParticularityDetails[key]?.personId ||
                                ""
                              }
                              required
                              onChange={(event) =>
                                setParticularityDetails((current) => ({
                                  ...current,
                                  [key]: {
                                    ...current[key],
                                    personId: Number(event.target.value),
                                  },
                                }))
                              }
                              className={inputClass}
                            >
                              <option value="" disabled>
                                Sélectionnez une personne
                              </option>
                              {activePeople.map((person) => (
                                <option key={person.id} value={person.id}>
                                  {personName(person, respondent)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor={`particularity-${key}-note`}
                              className="block text-sm font-bold"
                            >
                              Courte précision
                            </label>
                            <input
                              id={`particularity-${key}-note`}
                              value={particularityDetails[key]?.note || ""}
                              onChange={(event) =>
                                setParticularityDetails((current) => ({
                                  ...current,
                                  [key]: {
                                    ...current[key],
                                    note: event.target.value,
                                  },
                                }))
                              }
                              className={inputClass}
                              maxLength={200}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </fieldset>
              )}

              {wantsService === "yes" && (
                <fieldset className="space-y-5 border-t border-slate-200/40 pt-6">
                  <legend className="pr-3 text-xl font-extrabold text-blue-600">
                    Remise des documents
                  </legend>
                  <Choices
                    legend="Comment prévoyez-vous nous remettre vos documents ?"
                    name="document-method"
                    value={documentMethod}
                    onChange={setDocumentMethod}
                    help="Les deux formats sont acceptés. Si le format diffère selon les personnes, vous pouvez nous le préciser ci-dessous."
                    options={[
                      ["paper", "Papier"],
                      ["electronic", "Électroniquement"],
                      ["unknown", "Je ne sais pas encore"],
                    ]}
                  />
                  <div>
                    <label
                      htmlFor="document-method-note"
                      className="block text-sm font-bold"
                    >
                      Précision au besoin
                    </label>
                    <textarea
                      id="document-method-note"
                      value={documentMethodNote}
                      onChange={(event) =>
                        setDocumentMethodNote(event.target.value)
                      }
                      className={textareaClass}
                      maxLength={500}
                    />
                  </div>
                </fieldset>
              )}

              {wantsService && (
                <fieldset className="space-y-5 border-t border-slate-200/40 pt-6">
                  <legend className="pr-3 text-xl font-extrabold text-blue-600">
                    Vos coordonnées à jour
                  </legend>
                  <Field
                    label="Numéro de téléphone"
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    maxLength={40}
                    pattern={
                      "\\+?[ \\(]*[0-9](?:[ \\(\\).\\-]*[0-9]){9,14}[ \\).]*"
                    }
                    title="Saisissez de 10 à 15 chiffres. Les espaces, parenthèses, points et tirets sont acceptés."
                    placeholder="514 555-0123"
                  />
                  <div>
                    <Field
                      label="Adresse courriel"
                      id="email"
                      type="email"
                      value={email}
                      required={!noEmail}
                      disabled={noEmail}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      maxLength={254}
                      placeholder="exemple@courriel.com"
                    />
                    <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={noEmail}
                        onChange={(event) => {
                          setNoEmail(event.target.checked);
                          if (event.target.checked) setEmail("");
                        }}
                        className="h-4 w-4 accent-blue-600"
                      />
                      Je n’ai pas de courriel
                    </label>
                  </div>
                </fieldset>
              )}

              {wantsService && (
                <section className="rounded-2xl border border-slate-200/60 bg-blue-50 p-5">
                  <h2 className="text-xl font-extrabold text-blue-600">
                    Vérification avant envoi
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    Total : <strong>{activePeople.length}</strong> personne(s).
                    Anciens clients : <strong>{oldClientsCount}</strong>. Ajouts
                    ou réponses à vérifier : <strong>{toValidateCount}</strong>.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {activePeople.map((person) => (
                      <li key={person.id} className="rounded-xl bg-white p-3">
                        <strong>{personName(person, respondent)}</strong> ·{" "}
                        {relationLabels[person.relation]} ·{" "}
                        {person.prepared2025
                          ? preparedLabels[person.prepared2025]
                          : "Impôts 2025 non répondu"}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm leading-6 text-gray-600">
                    Nous vous communiquerons les dates de remise des documents.
                    Votre dossier devra nous parvenir complet dans les délais
                    indiqués.
                  </p>
                </section>
              )}
            </>
          )}

          {submitError && (
            <div
              role="alert"
              className="rounded-xl border border-red-600/40 bg-red-600/10 p-4 text-sm font-bold text-red-600"
            >
              {submitError}
            </div>
          )}
          <PrivacyNotice />
          <button
            type="submit"
            disabled={loading || !wantsService}
            className={`${buttonClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {loading ? "Enregistrement..." : "Envoyer ma réponse"}
          </button>
        </fieldset>
      </form>
    </PageLayout>
  );
}

export function ConfirmClientSuccessPage() {
  const { state } = useLocation();
  if (!state?.validated) return <Navigate to="/confirmation-client" replace />;
  return (
    <PageLayout>
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-md bg-blue-600/10 text-3xl text-blue-600"
        >
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.04em]">
          Merci !
        </h1>
        <p className="mt-4 leading-7 text-gray-600">
          Merci d’avoir rempli le formulaire de confirmation pour les impôts
          2026. Votre réponse a été enregistrée.
        </p>
        {state.wantsService && (
          <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-gray-600">
            Un membre de l’équipe pourra communiquer avec vous si des
            renseignements supplémentaires sont nécessaires.
          </p>
        )}
        <Link to="/" className={`${buttonClass} mt-8`}>
          Retour à l’accueil
        </Link>
      </div>
    </PageLayout>
  );
}
