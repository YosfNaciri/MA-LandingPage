export const gsStatuses = { new: 'Nouveau', in_progress: 'En cours', closed: 'Clôturé' };
export const gsLanguages = { fr: 'Français', en: 'Anglais' };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function answerText(value) {
  if (object(value) && Object.hasOwn(value, 'value')) return answerText(value.value);
  if (Array.isArray(value)) return value.map(answerText).join(', ');
  if (object(value)) return Object.entries(value).map(([key,item]) => `${key} : ${answerText(item)}`).join('\n');
  if (value === true) return 'Oui';
  if (value === false) return 'Non';
  return String(value ?? '');
}
function sectionTitle(key, field) {
  if (field?.section) return answerText(field.section);
  const text = `${key} ${field?.label || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/consent|comment|message|remarque|accept/.test(text)) return 'Commentaires et consentement';
  if (/vente|vendre|sale|selling|asking|prix|price|cession|retraite|retirement|echeance/.test(text)) return 'Projet de vente';
  if (/revenu|revenue|chiffre|profit|benefice|ebitda|financ|honoraire|turnover/.test(text)) return 'Informations financières';
  if (/cabinet|company|firm|entreprise|employ|staff|client|activite|service|fondation|founded/.test(text)) return 'Informations du cabinet';
  if (/prenom|nom|name|courriel|email|phone|telephone|adresse|address|ville|city|province|state|postal|zip|pays|country/.test(text)) return 'Informations personnelles';
  return 'Informations complémentaires';
}
const fold = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function gsDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-CA', { timeZone: 'America/Toronto', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
}
const identityKeys = new Set(['prenom','first_name','firstname','nom','last_name','lastname','name','full_name','nom_complet']);
export const gsPriceRanges = {
  under250: { label: 'Moins de 250 000 $', min: 0, max: 250000 },
  from250: { label: '250 000 à moins de 500 000 $', min: 250000, max: 500000 },
  from500: { label: '500 000 à moins de 1 M$', min: 500000, max: 1000000 },
  from1m: { label: '1 M$ à moins de 2 M$', min: 1000000, max: 2000000 },
  above2m: { label: '2 M$ et plus', min: 2000000, max: Infinity },
};
export function priceBounds(value) {
  const text = fold(value).replace(/(\d)[\s\u00a0](?=\d{3}(?:\D|$))/g, '$1').replace(/(\d),(?=\d{3}(?:\D|$))/g, '$1');
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(millions?|million|thousand|mille|[km])?/g)];
  if (!matches.length || matches.length > 2 || /%/.test(text)) return null;
  const multiplier = suffix => /^m(?!ille)|million/.test(suffix || '') ? 1000000 : /k|mille|thousand/.test(suffix || '') ? 1000 : 1;
  const nums = matches.map((item,index) => Number(item[1].replace(',', '.')) * multiplier(item[2] || (matches.length === 2 && index === 0 ? matches[1][2] : '')));
  if (nums.length === 2) return { min: Math.min(...nums), max: Math.max(...nums), interval: true };
  if (/moins|under|less|</.test(text)) return { min: 0, max: nums[0], interval: true };
  if (/plus|over|more|above|\+|>/.test(text)) return { min: nums[0], max: Infinity, interval: true };
  return { min: nums[0], max: nums[0], interval: false };
}
export function normalizeGsSubmission(row) {
  const answers = object(row.answers) ? row.answers : {};
  const mapped = ids => ids.map(id => answerText(answers[id])).find(value => value.trim()) || '';
  const find = (ids, pattern) => mapped(ids) || answerText(Object.entries(answers).find(([id, field]) => pattern.test(fold(`${id} ${field?.label || ''}`).replaceAll('_', ' ')))?.[1]);
  const role = find(['role','role_cabinet','fonction','poste','position','job_title','your_role'], /\b(role|fonction|poste|position|job title)\b/);
  const province = find(['province_cabinet','firm_province','company_province','province','state'], /\b(province|state)\b/);
  const city = find(['ville_cabinet','firm_city','company_city','ville','city'], /\b(ville|city)\b/);
  const sale_delay = find(['delai_vente','delais_vente','sale_timeline','selling_timeline','timeline','echeance_vente'], /delai|echeance|timeline|timeframe|quand.*vend/);
  const sale_price = find(['prix_vente','prix_de_vente','prix_demande','asking_price','sale_price','selling_price','price_range','prix'], /prix|asking price|sale price|selling price|price range/);
  const fields = {}, groups = new Map();
  for (const [id, field] of Object.entries(answers)) {
    if (['html','step','password','recaptcha','recaptcha_v3','honeypot'].includes(field?.type) || (!field?.type && /^html($|[_-])/i.test(id))) continue;
    const value = answerText(field);
    const title = sectionTitle(id, field);
    const label = object(field) && field.label ? answerText(field.label) : id.replaceAll('_', ' ');
    fields[id] = value;
    if (identityKeys.has(id) || /^(nom complet|full name|prenom|nom|first name|last name)$/.test(fold(label))) continue;
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push({ id, label, value });
  }
  const name = [mapped(['prenom','first_name','firstname']), mapped(['nom','last_name','lastname'])].filter(Boolean).join(' ');
  const identity = `${row.form_key} ${row.form_name}`;
  const language = /sellerFormFR|(?:^|[\s_-])(fr|francais|français)(?:$|[\s_-])/i.test(identity) ? 'fr' : /sellerForm(?!FR)|(?:^|[\s_-])(en|english|anglais)(?:$|[\s_-])/i.test(identity) ? 'en' : '';
  return { ...row, role, province, city, sale_delay, sale_price, seller_name: name || mapped(['name','full_name']), email: mapped(['courriel','email']), company_name: mapped(['nom_cabinet','company_name','firm_name']), language, fields, groups: [...groups].map(([title,items]) => ({ title, answers: items })) };
}
export function filterGsRows(rows, { search = '', language = '', province = '', city = '', sale_delay = '', price = '' } = {}) {
  const query = fold(search);
  return rows.filter(row => {
    if (language && row.language !== language) return false;
    if (province && fold(row.province) !== fold(province)) return false;
    if (city && fold(row.city) !== fold(city)) return false;
    if (sale_delay && fold(row.sale_delay) !== fold(sale_delay)) return false;
    if (price) {
      const bounds = priceBounds(row.sale_price), range = gsPriceRanges[price];
      if (price === 'unknown') { if (bounds) return false; }
      else if (!range || !bounds || (bounds.interval ? !(bounds.min < range.max && bounds.max > range.min) : !(bounds.min >= range.min && bounds.min < range.max))) return false;
    }
    return !query || fold([row.seller_name,row.email,row.company_name,row.form_name,row.form_key,...Object.values(row.fields)].join(' ')).includes(query);
  });
}
export function gsFilterOptions(rows) {
  return Object.fromEntries(['province','city','sale_delay'].map(key => {
    const unique = new Map();
    rows.forEach(row => { if (row[key]?.trim()) unique.set(fold(row[key]), row[key].trim()); });
    return [key, [...unique.values()].sort((a,b) => a.localeCompare(b, 'fr'))];
  }));
}
export function gsCsv(rows) {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row.fields || {})))];
  const cell = value => {
    const text = String(value ?? '');
    // Control characters are intentional: prevent spreadsheet formula injection.
    // eslint-disable-next-line no-control-regex
    return '"' + (/^[\s\u0000-\u001f\ufeff]*[=+@-]/u.test(text) ? "'" + text : text).replaceAll('"', '""') + '"';
  };
  const header = ['ID','Date (ISO)','Clé du formulaire','Formulaire','Langue','Vendeur','Courriel','Cabinet','Statut', ...keys.map(key => `Champ : ${key}`)];
  return '\uFEFF' + [header, ...rows.map(row => [row.id,row.created_at,row.form_key,row.form_name,gsLanguages[row.language] || 'Non précisée',row.seller_name,row.email,row.company_name,gsStatuses[row.status] || row.status,...keys.map(key => row.fields?.[key])])].map(row => row.map(cell).join(';')).join('\r\n');
}
