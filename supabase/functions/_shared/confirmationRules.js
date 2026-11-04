import { renderReceiptHtml } from './receiptTemplate.js';

// Shared by the browser, receipt worker and tests. SQL mirrors this rule and is
// checked against these fixtures; the server always recalculates on write.
export const BUSINESS_NAME = 'Martine Adam CPA';
export const PERSON_STATUS = { confirmed: 'Confirmé', review: 'Demande à évaluer', verify: 'À vérifier' };
export const CABINET_DECISIONS = ['', 'Accepté', 'Refusé', 'Client 2025 confirmé après vérification'];
export const RECEIPT_SUBJECT = 'Votre réponse pour vos impôts 2026 est bien reçue';
export function individualStatus(relation, answer, respondentStatus) {
  if (relation === 'spouse') return respondentStatus || 'verify';
  if (answer === 'yes') return 'confirmed';
  if (answer === 'no' && ['self', 'child', 'parent'].includes(relation)) return 'review';
  return 'verify';
}
export function calculatePeople(people = [], wantsService = true) {
  const self = people.find(person => person.relation === 'self');
  const selfStatus = individualStatus('self', self?.prepared_2025 ?? self?.prepared2025);
  return people.map(person => ({ ...person, calculated_status: wantsService === true
    ? individualStatus(person.relation, person.prepared_2025 ?? person.prepared2025, selfStatus) : null }));
}
export function statusCounts(people) {
  return people.reduce((counts, person) => {
    if (Object.hasOwn(counts, person.calculated_status)) counts[person.calculated_status]++;
    return counts;
  }, { confirmed: 0, review: 0, verify: 0 });
}
export function personWarning(status, self = false) {
  if (status === 'review') return self
    ? "Nouvelle demande, à confirmer. Nous n'avons pas préparé vos impôts 2025. Votre place n'est pas réservée tant que nous ne vous l'avons pas confirmée."
    : "Nouvelle demande, à confirmer. Nous n'avons pas préparé les impôts 2025 de cette personne. Sa place n'est pas réservée tant que nous ne vous l'avons pas confirmée.";
  if (status === 'verify') return self
    ? "Nous vérifierons si nous avons préparé vos impôts 2025. S'il s'agit d'un nouveau dossier, nous vous confirmerons si nous pouvons l'accepter."
    : "Nous vérifierons si nous avons préparé ses impôts 2025. S'il s'agit d'un nouveau dossier, nous vous confirmerons si nous pouvons l'accepter.";
  return '';
}
export function buildReceipt(snapshot) {
  if (snapshot.wants_tax_service !== true) return { variant: 'Non', subject: RECEIPT_SUBJECT, paragraphs: ["Merci, votre réponse est bien reçue. Nous retirerons votre dossier de notre liste pour la saison 2026. Merci de votre confiance au cours des dernières années."] };
  const people = calculatePeople(snapshot.people || []);
  const name = person => `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Nom non renseigné';
  const confirmed = people.filter(p => p.calculated_status === 'confirmed').map(name);
  const pending = people.filter(p => p.calculated_status !== 'confirmed').map(name);
  const variant = pending.length || !people.length ? 'B' : 'A';
  const paragraphs = ['Merci, votre réponse est bien reçue.', `Place confirmée pour vos impôts 2026 : ${confirmed.join(', ') || 'aucune'}`];
  if (variant === 'A') paragraphs.push("Nous vous communiquerons en décembre les dates de remise des documents. Vous n'avez rien d'autre à faire d'ici là.");
  else paragraphs.push(`Demandes à évaluer : ${pending.join(', ') || 'aucune'}`, "Ces demandes seront étudiées selon nos disponibilités. Aucune place n'est réservée pour ces personnes tant que nous ne vous l'avons pas confirmé. Nous communiquerons avec vous avant le début de la saison fiscale pour vous donner notre réponse. Il n'est pas nécessaire de nous appeler pour faire le suivi.");
  return { variant, subject: RECEIPT_SUBJECT, paragraphs };
}
export function receiptEmail(snapshot, businessName = BUSINESS_NAME) {
  const receipt = buildReceipt(snapshot);
  // Both formats use the same receipt; the HTML renderer escapes all user content.
  return { ...receipt, text: `${receipt.paragraphs.join('\n\n')}\n\n${businessName}`, html: renderReceiptHtml(receipt, businessName) };
}

// Deterministic keys for legacy JSON; match normalized_confirmation_people SQL.
export function normalizePersonKeys(people) {
  const used = new Set();
  return (Array.isArray(people) ? people : []).flatMap((person, index) => {
    if (!person || typeof person !== 'object' || Array.isArray(person)) return [];
    let key = String(person.id ?? '') || `legacy-${index + 1}`;
    while (used.has(key)) key = `legacy-${index + 1}-${key}`;
    used.add(key);
    return [{ ...person, id: key }];
  });
}
