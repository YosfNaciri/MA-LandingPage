import { useEffect, useRef } from 'react';
import axoluLogo from '../assets/Axolu CPA.png';

export default function AxoluAnnouncement({ showWebsiteLink = false }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    const restore = () => { document.body.style.overflow = previousOverflow; };
    const timer = window.setTimeout(() => dialog.close(), 30000);
    dialog.addEventListener('close', restore);
    return () => {
      window.clearTimeout(timer);
      dialog.removeEventListener('close', restore);
      dialog.close();
      restore();
    };
  }, []);
  function dismissOutside(event) {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialogRef.current.close();
  }
  return <dialog ref={dialogRef} aria-labelledby="axolu-announcement-title" aria-describedby="axolu-announcement-description" onClick={dismissOutside} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/55 backdrop:backdrop-blur-sm">
    <div className="border-t-4 border-blue-600 px-6 py-8 text-center sm:px-10 sm:py-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Un nouveau chapitre, ensemble</p>
      <img src={axoluLogo} alt="Axolu CPA" className="mx-auto my-6 h-auto w-64 max-w-full sm:w-80" />
      <h2 id="axolu-announcement-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">Martine Adam devient Axolu.</h2>
      <p className="mt-3 text-lg font-semibold text-blue-700">Un nouveau nom. La même équipe à vos côtés.</p>
      <p id="axolu-announcement-description" className="mt-5 text-sm leading-7 text-slate-600">Notre cabinet évolue, et notre engagement envers vous reste le même : une équipe qui vous connaît, une écoute attentive et le soin apporté à votre dossier. Sous le nom <strong className="text-slate-800">Axolu CPA</strong>, nous poursuivons notre mission avec l’ambition de vous offrir un service toujours plus simple, personnalisé et attentionné.</p>
      <p className="mt-4 text-sm font-semibold text-slate-700">Merci de continuer cette aventure avec nous.</p>
      {showWebsiteLink && <a href="https://axolu-coming-soon-dist.vercel.app/" target="_blank" rel="noopener noreferrer" className="mt-6 flex w-full items-center justify-center rounded-xl border border-blue-200 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">Découvrir le site Axolu</a>}
      <button autoFocus type="button" onClick={() => dialogRef.current.close()} className={`${showWebsiteLink ? "mx-auto mt-4 block px-7 py-2 text-sm" : "mt-7 w-full px-5 py-3.5"} rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600`}>OK</button>
      <p className="mt-4 text-xs text-slate-500">Cette fenêtre se ferme automatiquement après 30 secondes.</p>
    </div>
  </dialog>;
}
