import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import BrandLogos from '../Components/BrandLogos';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(state?.denied ? 'Accès administrateur requis. Connectez-vous avec un compte autorisé.' : '');
  const pending = useRef(false);

  async function login(event) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try {
      const client = getSupabaseClient();
      const result = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      const { data, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (data.user?.app_metadata?.role !== 'admin') {
        await client.auth.signOut({ scope: 'local' });
        setError('Ce compte n’a pas accès à l’administration.');
        return;
      }
      setPassword('');
      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('Connexion impossible. Vérifiez votre courriel et votre mot de passe, puis réessayez.');
    } finally { pending.current = false; setLoading(false); }
  }

  const input = 'mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100';
  return <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-white to-blue-50 px-4 py-12 text-gray-800">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10">
      <Link to="/"><BrandLogos /></Link>
      <p className="mt-8 text-sm font-semibold text-blue-600">Espace administration</p>
      <h1 className="mt-2 text-3xl font-bold">Connexion admin</h1>
      <p className="mt-3 text-sm text-gray-600">Consultez et exportez les confirmations clients.</p>
      <form onSubmit={login} className="mt-6" aria-busy={loading}>
        <fieldset disabled={loading} className="space-y-5">
          <div><label htmlFor="admin-email" className="text-sm font-semibold">Courriel</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={input} /></div>
          <div><label htmlFor="admin-password" className="text-sm font-semibold">Mot de passe</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={input} /></div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
        </fieldset>
      </form>
      <Link to="/" className="mt-6 block text-center text-sm text-blue-600 hover:underline">Retour au site</Link>
    </section>
  </main>;
}
