import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import logo from '../assets/MACPA.jpeg';

export default function AdminLayout({ children, subtitle }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setBusy(true);
    setError('');
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' });
      if (error) throw error;
      navigate('/admin/login', { replace: true });
    } catch { setError('Déconnexion impossible. Veuillez réessayer.'); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-linear-to-b from-white to-blue-50 text-gray-800">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
        <Link to="/admin/dashboard" className="flex items-center gap-4"><img src={logo} alt="Martine Adam CPA" className="h-12" /><span className="hidden text-sm font-semibold text-blue-600 sm:block">{subtitle}</span></Link>
        <nav aria-label="Administration" className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link to="/admin/dashboard" className="text-blue-600">Confirmations</Link>
          <Link to="/" className="text-gray-600 hover:text-blue-600">Retour au site</Link>
          <button onClick={logout} disabled={busy} className="rounded-lg border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50 disabled:opacity-50">{busy ? 'Déconnexion…' : 'Déconnexion'}</button>
        </nav>
      </div>
    </header>
    {error && <p role="alert" className="mx-auto max-w-7xl p-4 text-red-700">{error}</p>}
    {children}
  </div>;
}
