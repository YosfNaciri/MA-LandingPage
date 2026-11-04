import { calculatePeople, statusCounts } from "./confirmationRules.js";
import { confirmationColumns, fromConfirmationRecord, personFullName } from './clientConfirmations.js';

export function createConfirmationDraft(row) {
  const raw = row._record || {};
  const rawPeople = Array.isArray(raw.people) ? raw.people : [];
  const people = row.people.map((person, index) => ({
    ...rawPeople.filter(value => value && typeof value === 'object' && !Array.isArray(value))[index],
    ...person, id: person.id || `person-${index + 1}`,
  }));
  const branch = row.wants_tax_service ? raw.yes_data : raw.no_data;
  const rawParticularities = Array.isArray(branch?.particularities) ? branch.particularities.filter(value => value && typeof value === 'object' && !Array.isArray(value)) : [];
  const particularities = row.particularities.map((item, index) => ({
    ...rawParticularities[index], ...item,
    person_id: people.find(person => String(person.id) === String(item.person_id))?.id
      || people.find(person => personFullName(person) === item.person_name)?.id || '',
  }));
  return {
    first_name: row.respondent_first_name, last_name: row.respondent_last_name,
    phone: row.phone, email: row.email, no_email: row.no_email,
    document_method: row.document_method, document_method_note: row.document_method_note,
    sin_last_three: row.sin_last_three, identification_person_name: row.identification_person_name,
    identification_person_id: people.find(person => personFullName(person) === row.identification_person_name)?.id || '',
    people, particularities,
  };
}

export function buildConfirmationUpdate(row, draft) {
  if (!row._record) throw new Error('Actualisez la fiche avant de la modifier.');
  if (row.wants_tax_service !== true && row.wants_tax_service !== false) throw new Error('Cette fiche ne contient pas de réponse Oui ou Non.');
  if (!draft.first_name.trim() || !draft.last_name.trim()) throw new Error('Le nom et le prénom sont obligatoires.');
  if (!/^\d{10,15}$/.test(draft.phone.replace(/\D/g, ''))) throw new Error('Le téléphone doit contenir de 10 à 15 chiffres.');
  if (!draft.no_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) throw new Error('Renseignez un courriel valide ou cochez « Aucun courriel ».');
  if (draft.sin_last_three && !/^\d{3}$/.test(draft.sin_last_three)) throw new Error('Le NAS partiel doit contenir exactement trois chiffres.');
  const people = draft.people.map(person => ({ ...person,
    first_name: person.relation === 'self' ? draft.first_name.trim() : person.first_name.trim(),
    last_name: person.relation === 'self' ? draft.last_name.trim() : person.last_name.trim(),
    sin_last_three: person.sin_unknown ? null : person.sin_last_three || null,
  }));
  if (people.some(person => !person.first_name || !person.last_name)) throw new Error('Renseignez le nom et le prénom de chaque personne.');
  if (people.some(person => person.sin_last_three && !/^\d{3}$/.test(person.sin_last_three))) throw new Error('Chaque NAS partiel doit contenir trois chiffres.');
  if (new Set(people.map(person => String(person.id))).size !== people.length) throw new Error('La liste contient des identifiants de personnes en double.');
  if (people.filter(person => person.relation === 'self').length > 1 || people.filter(person => person.relation === 'spouse').length > 1) throw new Error('Une seule personne répondante et un seul conjoint sont permis.');
  const owner = people.find(person => String(person.id) === String(draft.identification_person_id));
  if (draft.identification_person_id && !owner) throw new Error('Choisissez à nouveau le titulaire du NAS.');
  const ownerName = owner ? personFullName(owner) : draft.identification_person_name.trim();
  if (draft.sin_last_three && !ownerName) throw new Error('Précisez à qui appartiennent les trois chiffres du NAS.');
  const particularities = draft.particularities.map(item => {
    if (['none', 'unknown'].includes(item.type)) return { ...item, person_id: null, person_name: null };
    const person = people.find(person => String(person.id) === String(item.person_id));
    if (!person) throw new Error('Choisissez une personne pour chaque particularité.');
    return { ...item, person_id: person.id, person_name: personFullName(person), note: item.note.trim() || null };
  });
  if (particularities.length > 1 && particularities.some(item => ['none', 'unknown'].includes(item.type))) throw new Error('« Aucune » et « Je ne sais pas » ne peuvent pas accompagner une autre particularité.');
  if (new Set(particularities.map(item => `${item.type}:${item.person_id ?? ''}`)).size !== particularities.length) throw new Error('Une particularité est indiquée deux fois pour la même personne.');
  const branch = row.wants_tax_service ? 'yes_data' : 'no_data';
  const original = row._record[branch];
  const details = original && typeof original === 'object' && !Array.isArray(original) ? original : {};
  const counts = statusCounts(calculatePeople(people, row.wants_tax_service));
  const oldCount = counts.confirmed;
  const children = people.filter(person => person.relation === 'child').length;
  return {
    first_name: draft.first_name.trim(), last_name: draft.last_name.trim(),
    phone: draft.phone.trim(), email: draft.no_email ? null : draft.email.trim(),
    people, people_count: people.length,
    [branch]: {
      ...details, no_email: draft.no_email, particularities,
      identification_person_name: ownerName || null, sin_last_three: draft.sin_last_three || null,
      document_method: draft.document_method || (row.wants_tax_service ? 'unknown' : 'not_applicable'),
      document_method_note: draft.document_method_note.trim() || null,
      old_clients_count: oldCount, to_validate_count: counts.review + counts.verify,
      confirmed_count: counts.confirmed, review_count: counts.review, verify_count: counts.verify,
      children_count: children, has_children: children > 0, is_couple: people.some(person => person.relation === 'spouse'),
    },
  };
}

export async function saveConfirmation(client, table, row, draft) {
  const update = buildConfirmationUpdate(row, draft);
  let query = client.from(table).update(update).eq('id', row.id);
  // The database trigger updates updated_at, preventing silent overwrite of a concurrent edit.
  query = row.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', row.updated_at);
  const { data, error } = await query.select(confirmationColumns);
  if (error) {
    if (error.code === '42501') throw new Error('Supabase refuse la modification. Activez les droits UPDATE administrateur avec le script fourni.');
    throw new Error('Enregistrement non confirmé. Vérifiez la connexion puis réessayez. Vos modifications restent affichées.');
  }
  if (data?.length !== 1 || data[0].id !== row.id) throw new Error('La fiche a changé, a été supprimée ou vos droits ne permettent pas sa modification. Annulez puis actualisez avant de réessayer.');
  return fromConfirmationRecord(data[0]);
}
