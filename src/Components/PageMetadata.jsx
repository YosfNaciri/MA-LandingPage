import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// The homepage metadata lives in the HTML so it is available before React loads.
const homeTitle = document.title;
const homeDescription = document.querySelector('meta[name="description"]').content;
const homeSchema = document.getElementById('website-schema').textContent;
const origin = 'https://martineadamcpa.com';

export default function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const home = pathname === '/';
    const privacy = pathname === '/politique-de-confidentialite';
    const admin = pathname === '/admin' || pathname.startsWith('/admin/');
    const confirmation = /^\/(confirmation-client|confirm-client)(\/|$)/.test(pathname);
    const access = ['/demande-acces', '/ouverture-dossier'].includes(pathname);
    const demo = ['/demo-redirect', '/demo -redirect', '/demo%20-redirect'].includes(pathname);
    const label = demo ? 'Une nouvelle identité — Démonstration' : privacy ? 'Politique de confidentialité' : admin ? 'Administration' : confirmation ? 'Confirmez votre intention' : access ? 'Ouverture de dossier sécurisée' : 'Page introuvable';
    const title = home ? homeTitle : `${label} | Martine Adam CPA Inc.`;
    const description = home ? homeDescription : privacy
      ? 'Consultez la politique de confidentialité de Martine Adam CPA et les informations sur la protection de vos renseignements personnels.'
      : `${label} — Martine Adam CPA Inc.`;
    document.title = title;
    for (const [selector, content] of [
      ['meta[name="description"]', description],
      ['meta[name="robots"]', home || privacy ? 'index, follow' : 'noindex, follow'],
      ['meta[property="og:title"]', title], ['meta[property="og:description"]', description],
      ['meta[property="og:url"]', origin + pathname],
      ['meta[name="twitter:title"]', title], ['meta[name="twitter:description"]', description],
    ]) document.querySelector(selector).setAttribute('content', content);
    document.querySelector('link[rel="canonical"]').setAttribute('href', origin + pathname);
    document.getElementById('website-schema').textContent = home ? homeSchema : '{}';
  }, [pathname]);
  return null;
}
