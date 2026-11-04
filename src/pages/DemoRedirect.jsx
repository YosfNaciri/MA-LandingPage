import { useEffect, useRef, useState } from 'react';
import { FiArrowUpRight, FiHeart, FiShield, FiUsers } from 'react-icons/fi';

const destination = 'https://www.google.com/';
const duration = 30;

export default function DemoRedirect({ children }) {
  const dialogRef = useRef(null);
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const deadline = Date.now() + duration * 1000;
    let redirected = false;
    const redirect = () => {
      if (!redirected) {
        redirected = true;
        window.location.replace(destination);
      }
    };
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) redirect();
    };
    const interval = window.setInterval(tick, 250);
    const timeout = window.setTimeout(redirect, duration * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', tick);
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, []);

  return <>
    {children}
    <dialog ref={dialogRef} onCancel={event => event.preventDefault()} aria-labelledby="identity-title" aria-describedby="identity-description" className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm">
      <div className="relative overflow-hidden bg-slate-950 px-6 pb-8 pt-7 text-white sm:px-10 sm:pt-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[45px] border-blue-400/15" />
        <p className="relative inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200"><span className="h-1.5 w-1.5 rounded-full bg-blue-300" />Un nouveau chapitre, ensemble</p>
        <h1 id="identity-title" className="relative mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Un nouveau nom.<br /><span className="text-blue-300">La même équipe à vos côtés.</span></h1>
        <p id="identity-description" className="relative mt-5 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">Notre cabinet change de raison sociale et adopte une nouvelle identité. Une belle évolution, portée par les personnes que vous connaissez et la confiance que nous construisons avec vous.</p>
      </div>
      <div className="px-6 py-6 sm:px-10 sm:py-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-blue-50 p-4"><FiUsers aria-hidden="true" className="mb-3 h-5 w-5 text-blue-600" /><p className="text-sm font-bold">La même équipe</p><p className="mt-1 text-xs leading-5 text-slate-600">Vos interlocuteurs, toujours présents.</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><FiShield aria-hidden="true" className="mb-3 h-5 w-5 text-blue-600" /><p className="text-sm font-bold">La même confiance</p><p className="mt-1 text-xs leading-5 text-slate-600">La rigueur et l’écoute au cœur du suivi.</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><FiHeart aria-hidden="true" className="mb-3 h-5 w-5 text-blue-600" /><p className="text-sm font-bold">Un nouvel élan</p><p className="mt-1 text-xs leading-5 text-slate-600">L’ambition de toujours mieux vous servir.</p></div>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-600">Cette nouvelle identité reflète notre engagement : un accompagnement humain, des échanges plus simples et un service qui évolue avec vos besoins. <strong className="font-semibold text-slate-900">Merci de faire partie de la suite de notre histoire.</strong></p>
        <a autoFocus href={destination} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-4 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Découvrir notre nouveau site<FiArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0" /></a>
        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500"><span>Redirection automatique dans</span><span role="timer" aria-label={`${remaining} secondes avant la redirection`} className="font-bold tabular-nums text-slate-700">{remaining} s</span></div>
        <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${remaining / duration * 100}%` }} /></div>
        <p className="mt-4 text-center text-[11px] text-slate-400">Démonstration · le bouton et le compte à rebours redirigent vers Google.</p>
      </div>
    </dialog>
  </>;
}
