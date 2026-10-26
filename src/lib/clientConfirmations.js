export const relationLabels = {
  self: "Moi-même",
  spouse: "Conjoint ou conjointe",
  child: "Enfant",
  parent: "Parent",
  other: "Autre personne déjà cliente",
};

export const prepared2025Labels = {
  yes: "Oui",
  no: "Non",
  unknown: "Je ne sais pas",
};

export const documentMethodLabels = {
  paper: "Papier",
  electronic: "Électroniquement",
  unknown: "Je ne sais pas encore",
  not_applicable: "Non applicable",
};

export const declineScopeLabels = {
  self: "Moi seulement",
  couple: "Moi et mon conjoint ou ma conjointe",
  all: "Toutes les personnes indiquées",
};

export const particularityLabels = {
  self_employed: "Travail autonome",
  rental_income: "Revenus d’immeuble locatif",
  dependent: "Autre situation à signaler",
  none: "Aucune",
  unknown: "Je ne sais pas",
};

// Database schema supplied by the project owner. UI/export names stay internal.
export const confirmationColumns = [
  "id", "created_at", "updated_at", "client_type", "tax_year", "first_name", "last_name",
  "email", "phone", "wants_tax_service", "people", "people_count",
  "yes_data", "no_data", "initial_response_at", "status",
].join(",");

export function toConfirmationRecord(payload) {
  const { client_type = "returning_client", tax_season, respondent_first_name, respondent_last_name, email, phone,
    wants_tax_service, people, total_people, ...details } = payload;
  return {
    client_type,
    tax_year: Number(tax_season), first_name: respondent_first_name,
    last_name: respondent_last_name, email, phone, wants_tax_service, people,
    people_count: total_people,
    yes_data: wants_tax_service ? details : {},
    no_data: wants_tax_service ? {} : details,
    initial_response_at: new Date().toISOString(), status: "completed",
  };
}

const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const asText = value => typeof value === "string" || typeof value === "number" ? String(value) : "";
const count = (value, fallback) => Number.isInteger(value) && value >= 0 ? value : fallback;
export const responseLabel = value => value === true ? "Oui" : value === false ? "Non" : "Non renseignée";
export const statusLabels = { completed: "Terminée", pending: "En attente", draft: "Brouillon" };
export const statusLabel = value => statusLabels[value] || value || "Non renseigné";
export function formatConfirmationDate(value, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime ? date.toLocaleString("fr-CA") : date.toLocaleDateString("fr-CA");
}

export function fromConfirmationRecord(row) {
  const wants = row.wants_tax_service === true ? true : row.wants_tax_service === false ? false : null;
  const details = asObject(wants === true ? row.yes_data : wants === false ? row.no_data : null);
  const people = (Array.isArray(row.people) ? row.people : [])
    .filter(person => person && typeof person === "object" && !Array.isArray(person))
    .map(person => ({
      id: asText(person.id), first_name: asText(person.first_name), last_name: asText(person.last_name),
      relation: asText(person.relation), prepared_2025: asText(person.prepared_2025),
      sin_unknown: person.sin_unknown === true, sin_last_three: asText(person.sin_last_three),
      contact: asText(person.contact),
    }));
  const oldCount = people.filter(person => person.prepared_2025 === "yes").length;
  const children = people.filter(person => person.relation === "child").length;
  const particularities = (Array.isArray(details.particularities) ? details.particularities : [])
    .filter(item => item && typeof item === "object" && !Array.isArray(item))
    .map(item => ({ type: asText(item.type), person_id: asText(item.person_id), person_name: asText(item.person_name), note: asText(item.note) }));
  return {
    _record: row,
    client_type: row.client_type || "returning_client",
    id: row.id, created_at: row.created_at, updated_at: row.updated_at,
    initial_response_at: row.initial_response_at, status: asText(row.status),
    tax_season: asText(row.tax_year), wants_tax_service: wants,
    respondent_first_name: asText(row.first_name), respondent_last_name: asText(row.last_name),
    email: asText(row.email), phone: asText(row.phone), people,
    total_people: count(row.people_count, people.length),
    old_clients_count: count(details.old_clients_count, oldCount),
    to_validate_count: count(details.to_validate_count, people.length - oldCount),
    is_couple: typeof details.is_couple === "boolean" ? details.is_couple : people.some(person => person.relation === "spouse"),
    has_children: typeof details.has_children === "boolean" ? details.has_children : children > 0,
    children_count: count(details.children_count, children),
    no_email: details.no_email === true,
    particularities,
    document_method: asText(details.document_method) || (wants === false ? "not_applicable" : ""),
    decline_scope: asText(details.decline_scope),
    identification_person_name: asText(details.identification_person_name),
    sin_last_three: asText(details.sin_last_three),
    document_method_note: asText(details.document_method_note), user_agent: asText(details.user_agent),
  };
}

export async function loadAllConfirmations(client, table, signal) {
  const rows = [];
  // Continue until an empty page, including when the server caps pages below 500.
  for (;;) {
    signal?.throwIfAborted();
    let query = client.from(table).select(confirmationColumns)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(rows.length, rows.length + 499);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data.map(fromConfirmationRecord));
  }
}

const yesNo = (value) => value == null ? "" : value ? "Oui" : "Non";

export function personFullName(person) {
  return `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Personne sans nom";
}

export function formatPeopleForDisplay(people = []) {
  if (!Array.isArray(people) || !people.length) return "";
  return people.map((person, index) => {
    const relation = relationLabels[person.relation] || person.relation || "";
    const prepared = prepared2025Labels[person.prepared_2025] || person.prepared_2025 || "Non répondu";
    const sin = person.sin_unknown ? "NAS inconnu" : person.sin_last_three ? `NAS ***${person.sin_last_three}` : "NAS non fourni";
    const contact = person.contact ? `, coordonnées: ${person.contact}` : "";
    return `${index + 1}. ${personFullName(person)} (${relation}) - impôts 2025: ${prepared}, ${sin}${contact}`;
  }).join("\n");
}

export function formatParticularitiesForDisplay(particularities = []) {
  if (!Array.isArray(particularities) || !particularities.length) return "";
  return particularities.map((item) => {
    const label = particularityLabels[item.type] || item.type || "";
    const person = item.person_name ? ` - ${item.person_name}` : "";
    const note = item.note ? `: ${item.note}` : "";
    return `${label}${person}${note}`;
  }).join("\n");
}

// Keep the stored UTC calendar date consistent across CSV/Excel and browsers.
export function formatExportDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

export function confirmationExportRow(row) {
  return {
    "Identifiant": row.id,
    "Type de client": row.client_type || "returning_client",
    "Date de confirmation": formatExportDate(row.created_at),
    "Première réponse": formatExportDate(row.initial_response_at),
    "Dernière mise à jour": formatExportDate(row.updated_at),
    "Statut": statusLabel(row.status),
    "Saison fiscale": row.tax_season,
    "Prise en charge demandée": responseLabel(row.wants_tax_service),
    "Portée du refus": row.wants_tax_service ? "" : declineScopeLabels[row.decline_scope] || row.decline_scope || "",
    "Prénom du répondant": row.respondent_first_name,
    "Nom du répondant": row.respondent_last_name,
    "Téléphone": row.phone,
    "Courriel": row.no_email ? "Aucun courriel" : row.email,
    "Dossier de couple": yesNo(row.is_couple),
    "Avec enfants": yesNo(row.has_children),
    "Nombre d’enfants": row.children_count || 0,
    "Nombre total de personnes": row.total_people || 0,
    "Anciens clients 2025": row.old_clients_count || 0,
    "Ajouts / à vérifier": row.to_validate_count || 0,
    "Personnes concernées": formatPeopleForDisplay(row.people),
    "Identification NAS appartient à": row.identification_person_name || "",
    "NAS (3 derniers chiffres)": !row.sin_last_three ? "" : String(row.sin_last_three).padStart(3, "0"),
    "Particularités 2026": formatParticularitiesForDisplay(row.particularities),
    "Remise des documents": documentMethodLabels[row.document_method] || row.document_method || "",
    "Précision remise des documents": row.document_method_note || "",
  };
}

export function createConfirmationsCsv(rows) {
  if (!rows.length) throw new Error("Aucune confirmation à exporter.");
  const headers = Object.keys(rows[0]);
  function cell(value) {
    let text = String(value ?? "");
    // Prevent spreadsheet formula execution in user-provided values.
    if (/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  }
  return "\uFEFF" + [headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((row) => row.map(cell).join(";")).join("\r\n");
}


export async function deleteConfirmation(client, table, id) {
  if (!id || typeof id !== "string") throw new Error("Confirmation invalide.");
  // Returning the id verifies that RLS actually allowed one row to be deleted.
  const { data, error } = await client.from(table).delete().eq("id", id).select("id");
  if (error) throw error;
  if (data?.length !== 1 || data[0].id !== id) {
    throw new Error("Aucune confirmation supprimée. Vérifiez les droits ou actualisez la liste.");
  }
}
