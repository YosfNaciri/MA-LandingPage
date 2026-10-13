import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';

export default function ProtectedAdminRoute() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    let version = 0;
    let subscription;
    try {
      const client = getSupabaseClient();
      subscription = client.auth.onAuthStateChange((_event, session) => {
        const current = ++version;
        if (!active) return;
        if (!session) { setStatus('signed-out'); return; }
        setStatus('loading');
        // Validate outside the auth callback to avoid locking the auth client.
        setTimeout(async () => {
          if (!active || current !== version) return;
          try {
            const { data, error } = await client.auth.getUser();
            if (!active || current !== version) return;
            setStatus(!error && data.user?.app_metadata?.role === 'admin' ? 'admin' : 'denied');
          } catch {
            if (active && current === version) setStatus('denied');
          }
        }, 0);
      }).data.subscription;
    } catch { setStatus('denied'); }
    return () => { active = false; version++; subscription?.unsubscribe(); };
  }, []);

  if (status === 'loading') return <main className="grid min-h-screen place-items-center bg-blue-50"><p role="status">Vérification de la connexion…</p></main>;
  if (status !== 'admin') return <Navigate to="/admin/login" replace state={{ denied: status === 'denied' }} />;
  return <Outlet />;
}
