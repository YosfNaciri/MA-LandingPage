import { calculatePeople, statusCounts, PERSON_STATUS } from "../lib/confirmationRules";
import { useEffect, useRef, useState } from 'react';
import { confirmClientTable, getSupabaseClient } from '../lib/supabaseClient';
import { createConfirmationDraft, saveConfirmation } from '../lib/editConfirmation';
import { documentMethodLabels, particularityLabels, personFullName, prepared2025Labels, relationLabels } from '../lib/clientConfirmations';

const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
const redButton = 'rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50';

export default function EditConfirmation({ row, onSaved, onClose }) {
  const [draft, setDraft] = useState(() => createConfirmationDraft(row));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const dialog = useRef(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function change(patch) { setDraft(current => ({ ...current, ...patch })); setDirty(true); setError(''); }
  function changePerson(index, patch) { change({ people: draft.people.map((person, i) => i === index ? { ...person, ...patch } : person) }); }
  function changeParticularity(index, patch) { change({ particularities: draft.particularities.map((item, i) => i === index ? { ...item, ...patch } : item) }); }
  function removePerson(index) {
    const removed = draft.people[index];
    change({
      people: draft.people.filter((_, i) => i !== index),
      particularities: draft.particularities.map(item => String(item.person_id) === String(removed.id) ? { ...item, person_id: '', person_name: '' } : item),
      ...(String(draft.identification_person_id) === String(removed.id) ? { identification_person_id: '', identification_person_name: '', sin_last_three: '' } : {}),
    });
  }
  function close() {
    if (pending.current) return;
    if (dirty && !window.confirm('Abandonner les modifications non enregistrées ?')) return;
    onClose();
  }
  async function submit(event) {
    event.preventDefault();
    if (pending.current || !event.currentTarget.reportValidity()) return;
    pending.current = true; setSaving(true); setError('');
    try {
      const saved = await saveConfirmation(getSupabaseClient(), confirmClientTable, row, draft);
      onSaved(saved);
    } catch (failure) { setError(failure.message || 'Impossible d’enregistrer les modifications.'); }
    finally { pending.current = false; setSaving(false); }
  }
  const statuses = calculatePeople(draft.people, row.wants_tax_service);
  const counts = statusCounts(statuses);
  const nameOf = person => person.relation === 'self'
    ? `${draft.first_name} ${draft.last_name}`.trim() || 'Moi-même' : personFullName(person);
  return <dialog ref={dialog} aria-labelledby="edit-confirmation-title" onCancel={event => { event.preventDefault(); close(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-gray-800 shadow-xl backdrop:bg-black/40 sm:p-8">
    <h2 id="edit-confirmation-title" className="text-2xl font-extrabold">Modifier la soumission</h2>
    <p className="mt-2 text-sm text-gray-600">Les modifications seront appliquées après avoir cliqué sur « Sauvegarder ».</p>
    <form onSubmit={submit} className="mt-6" aria-busy={saving}>
      <fieldset disabled={saving} className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Identité et coordonnées">
          <Field label="Prénom" value={draft.first_name} onChange={event => change({ first_name: event.target.value })} required maxLength={100} />
          <Field label="Nom" value={draft.last_name} onChange={event => change({ last_name: event.target.value })} required maxLength={100} />
          <Field label="Téléphone" type="tel" value={draft.phone} onChange={event => change({ phone: event.target.value })} required maxLength={40} />
          <div><Field label="Courriel" type="email" value={draft.email} onChange={event => change({ email: event.target.value })} required={!draft.no_email} disabled={draft.no_email} maxLength={254} /><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.no_email} onChange={event => change({ no_email: event.target.checked })} />Aucun courriel</label></div>
          <label className="text-sm font-semibold">Remise des documents<select className={input} value={draft.document_method} onChange={event => change({ document_method: event.target.value })}><option value="">Non renseignée</option>{Object.entries(documentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <Field label="Précision remise" value={draft.document_method_note} onChange={event => change({ document_method_note: event.target.value })} maxLength={500} />
        </section>
        <section className="space-y-3 border-t border-slate-200 pt-5" aria-label="Personnes concernées à modifier">
          <h3 className="text-lg font-bold text-blue-700">Personnes concernées</h3>
          <p className="text-sm">Places confirmées : {counts.confirmed} · Demandes à évaluer : {counts.review} · À vérifier : {counts.verify}</p>
          {draft.people.map((person, index) => <div key={person.id} className="rounded-xl bg-blue-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2"><h4 className="font-semibold">Personne {index + 1}</h4><button type="button" onClick={() => removePerson(index)} className={redButton} aria-label={`Retirer la personne ${index + 1}`}>Retirer</button></div>
            <p className="mb-3 text-sm font-bold">{PERSON_STATUS[statuses[index].calculated_status] || "Refus de service — hors capacité"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`Prénom de la personne ${index + 1}`} value={person.relation === 'self' ? draft.first_name : person.first_name} onChange={event => person.relation === 'self' ? change({ first_name: event.target.value }) : changePerson(index, { first_name: event.target.value })} required maxLength={100} />
              <Field label={`Nom de la personne ${index + 1}`} value={person.relation === 'self' ? draft.last_name : person.last_name} onChange={event => person.relation === 'self' ? change({ last_name: event.target.value }) : changePerson(index, { last_name: event.target.value })} required maxLength={100} />
              <label className="text-sm font-semibold">Lien avec le répondant<select className={input} value={person.relation} onChange={event => changePerson(index, { relation: event.target.value })}>{!relationLabels[person.relation] && <option value={person.relation}>{person.relation || 'À préciser'}</option>}{Object.entries(relationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm font-semibold">Client en 2025<select className={input} value={person.prepared_2025} onChange={event => changePerson(index, { prepared_2025: event.target.value })}><option value="">Non renseigné</option>{Object.entries(prepared2025Labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <div><Field label={`NAS partiel de la personne ${index + 1}`} inputMode="numeric" pattern="[0-9]{3}" maxLength={3} value={person.sin_last_three || ''} disabled={person.sin_unknown} onChange={event => changePerson(index, { sin_last_three: event.target.value.replace(/\D/g, '').slice(0, 3) })} /><label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={person.sin_unknown} onChange={event => changePerson(index, { sin_unknown: event.target.checked, sin_last_three: '' })} />NAS partiel inconnu</label></div>
              <Field label={`Coordonnées de la personne ${index + 1}`} value={person.contact} onChange={event => changePerson(index, { contact: event.target.value })} maxLength={200} />
            </div>
          </div>)}
          <button type="button" className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-700" onClick={() => change({ people: [...draft.people, { id: crypto.randomUUID(), first_name: '', last_name: '', relation: 'child', prepared_2025: 'unknown', sin_last_three: '', sin_unknown: false, contact: '' }] })}>Ajouter une personne à charge</button>
        </section>
        <section className="grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2" aria-label="Identification NAS">
          <label className="text-sm font-semibold">Le NAS appartient à<select className={input} value={draft.identification_person_id} onChange={event => change({ identification_person_id: event.target.value })}><option value="">{draft.identification_person_name || 'Choisir une personne'}</option>{draft.people.map(person => <option key={person.id} value={person.id}>{nameOf(person)}</option>)}</select></label>
          <Field label="Trois derniers chiffres du NAS" inputMode="numeric" pattern="[0-9]{3}" maxLength={3} value={draft.sin_last_three} onChange={event => change({ sin_last_three: event.target.value.replace(/\D/g, '').slice(0, 3) })} />
        </section>
        <section className="space-y-3 border-t border-slate-200 pt-5" aria-label="Particularités à modifier">
          <h3 className="text-lg font-bold text-blue-700">Particularités à prévoir</h3>
          {draft.particularities.map((item, index) => <div key={index} className="space-y-3 rounded-xl bg-blue-50 p-4">
            <div className="flex justify-end"><button type="button" className={redButton} onClick={() => change({ particularities: draft.particularities.filter((_, i) => i !== index) })} aria-label={`Retirer la particularité ${index + 1}`}>Retirer</button></div>
            <label className="block text-sm font-semibold">Particularité {index + 1}<select className={input} value={item.type} onChange={event => changeParticularity(index, { type: event.target.value })}>{!particularityLabels[item.type] && <option value={item.type}>{item.type || 'À préciser'}</option>}{Object.entries(particularityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {!['none', 'unknown'].includes(item.type) && <label className="block text-sm font-semibold">Personne concernée<select className={input} required value={item.person_id} onChange={event => changeParticularity(index, { person_id: event.target.value })}><option value="">Choisir une personne</option>{draft.people.map(person => <option key={person.id} value={person.id}>{nameOf(person)}</option>)}</select></label>}
            <Field label="Précision au besoin" value={item.note} onChange={event => changeParticularity(index, { note: event.target.value })} maxLength={500} />
          </div>)}
          <button type="button" className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-bold text-blue-700" onClick={() => change({ particularities: [...draft.particularities, { type: 'self_employed', person_id: draft.people[0]?.id || '', person_name: '', note: '' }] })}>Ajouter une particularité</button>
        </section>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-white py-4">
          <button type="button" onClick={close} className="rounded-lg border border-slate-300 px-5 py-2.5 font-bold">Annuler</button>
          <button type="submit" disabled={!dirty} className="rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-50">{saving ? 'Enregistrement…' : 'Sauvegarder'}</button>
        </div>
      </fieldset>
    </form>
  </dialog>;
}

function Field({ label, ...props }) { return <label className="block text-sm font-semibold">{label}<input className={input} {...props} /></label>; }
