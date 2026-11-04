import { getSupabaseClient } from './supabaseClient.js';
import { filterGsRows, gsFilterOptions, gsCsv, normalizeGsSubmission } from './gsSubmissionData.js';
export { gsLanguages, gsStatuses } from './gsSubmissionData.js';
const table = 'form_submissions';
const columns = 'id,created_at,form_key,form_name,answers,status';
function check(error) {
  if (!error) return;
  if (['42501','42703','PGRST204','42P01'].includes(error.code)) throw new Error('La table GS Strategies n’est pas prête pour le dashboard. Exécutez le script SQL d’accès administrateur dans le projet Supabase contenant form_submissions.');
  throw new Error('Impossible de charger ou modifier les soumissions GS Strategies. Vérifiez votre connexion et vos droits administrateur.');
}
export async function loadGsRows(client = getSupabaseClient()) {
  const rows = [];
  let after;
  // Fixed ID boundary, ascending keyset pagination: independent of server page-size caps.
  const { data: upper, error: upperError } = await client.from(table).select('id').order('id', { ascending: false }).limit(1);
  check(upperError);
  if (!upper?.length) return rows;
  const max = upper[0].id;
  do {
    let query = client.from(table).select(columns).lte('id', max).order('id', { ascending: true }).limit(500);
    if (after) query = query.gt('id', after);
    const { data, error } = await query;
    check(error);
    if (!data?.length) break;
    rows.push(...data.map(normalizeGsSubmission));
    const next = data.at(-1).id;
    if (next === after) throw new Error('Chargement interrompu : pagination invalide.');
    after = next;
  } while (after !== max);
  return rows.sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}
export async function gsRequest(action, params = {}) {
  const client = getSupabaseClient();
  if (action === 'list') {
    const rows = await loadGsRows(client);
    const filtered = filterGsRows(rows, params);
    const page = Math.min(Math.max(1, params.page || 1), Math.max(1, Math.ceil(filtered.length / 20)));
    return { rows: filtered, options: gsFilterOptions(rows), total: filtered.length, page, latest: rows.slice(0,5), timezone: 'UTC', stats: { total: rows.length, new: rows.filter(row => row.status === 'new').length, fr: rows.filter(row => row.language === 'fr').length, en: rows.filter(row => row.language === 'en').length } };
  }
  if (action === 'delete') {
    if (params.confirm_delete !== true) throw new Error('Confirmation de suppression requise.');
    const { data, error } = await client.from(table).delete().eq('id', params.id).select('id');
    check(error);
    if (data?.length !== 1 || data[0].id !== params.id) throw new Error('Suppression non confirmée. Actualisez la liste et vérifiez vos droits.');
    return { deleted: true, id: params.id };
  }
  let query = client.from(table);
  if (action === 'status') {
    if (!['new','in_progress','closed'].includes(params.status)) throw new Error('Statut invalide.');
    query = query.update({ status: params.status }).eq('id', params.id).eq('status', params.previousStatus);
  } else if (action === 'detail') query = query.select(columns).eq('id', params.id);
  else throw new Error('Action invalide.');
  const { data, error } = await (action === 'status' ? query.select(columns) : query).maybeSingle();
  check(error);
  if (!data) throw new Error('Dossier introuvable, modifié par un autre administrateur ou accès refusé. Actualisez la fiche.');
  return normalizeGsSubmission(data);
}
export async function gsExport(filters) {
  const rows = filterGsRows(await loadGsRows(), filters);
  const url = URL.createObjectURL(new Blob([gsCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = `gs-strategies-${new Date().toISOString().slice(0,10)}.csv`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
