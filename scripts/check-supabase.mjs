import { loadEnv } from 'vite';
import { confirmationColumns } from '../src/lib/clientConfirmations.js';
const env = loadEnv('development', process.cwd(), 'VITE_SUPABASE_');
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!env.VITE_SUPABASE_URL || !key) throw new Error('Renseigner l’URL et la clé publique du nouveau projet dans .env.local.');
console.log('Projet configuré :', new URL(env.VITE_SUPABASE_URL).origin);
const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/client_tax_season_confirmations?select=${confirmationColumns}&limit=0`, {
 headers: { apikey: key, 'Accept-Profile': 'public', ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) },
});
if (response.ok) console.log('Table et colonnes compatibles. Aucun dossier lu ou créé. Le droit INSERT reste à vérifier.');
else {
 const result = await response.json();
 console.error(`Contrôle : HTTP ${response.status}, ${result.code || 'erreur'}`);
 if (result.code === '42703' || result.code === 'PGRST204') console.error('Colonnes incompatibles : vérifier que .env.local désigne le même projet que la définition SQL.');
 else if (response.status === 401 || response.status === 403) console.error('Accès refusé : cela peut être normal pour une table privée. Ce contrôle ne prouve pas le droit INSERT.');
 else console.error('Vérifier la table public.client_tax_season_confirmations dans le nouveau projet.');
 process.exitCode = 1;
}
