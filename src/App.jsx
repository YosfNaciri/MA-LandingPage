import AdminConfirmations from "./pages/AdminConfirmations.jsx";
import AdminSubmissionsPage from "./pages/AdminSubmissionsPage.jsx";
import AdminActivityLogsPage from "./pages/AdminActivityLogsPage.jsx";
import ClientChoicePage from "./pages/ClientChoicePage.jsx";
import AccessRequestPage from "./pages/AccessRequestPage.jsx";
import OuvertureDossierPage from "./pages/OuvertureDossierPage.jsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedAdminRoute from "./Components/ProtectedAdminRoute.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import ConfirmationClient, { ConfirmClientSuccessPage } from "./pages/ConfirmationClient.jsx";
import { motion } from "motion/react";
import { FilloutStandardEmbed } from "@fillout/react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import logo from "./assets/MACPA.jpeg";
import experienceImg from "./assets/optimisation-experience-utilisateur.jpg";
import securityImg from "./assets/securitinformatiqueAdobeStock58947296jpeg_604e4ae99bb8f.jpeg";
import qualityImg from "./assets/audit-comptable-et-financier.webp";
import "./App.css";

const MotionLink = motion.create(Link);

const fadeDown = {
  initial: { y: -40, opacity: 0 },
  whileInView: { y: 0, opacity: 1 },
  transition: { duration: 0.6, ease: "linear" },
  viewport: { once: true, amount: 0.5 },
};

function NavBar() {
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setShowNav(!(current > lastScrollY.current && current > 100));
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 z-50 w-full bg-white/80 text-gray-800 backdrop-blur transition-transform duration-500 ${showNav ? "translate-y-0" : "-translate-y-full"}`}>
      <div className="mx-auto flex max-w-[1450px] items-center justify-center p-5 md:justify-between">
        <MotionLink to="/#Home" className="z-20 flex items-center gap-3 md:w-100" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "linear" }}>
          <img src={logo} alt="Martine Adam CPA" className="h-10 md:h-15" />
        </MotionLink>
        <motion.div className="hidden items-center gap-4 md:flex" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "linear" }}>
          <Link className="cursor-pointer rounded-md bg-blue-500 px-6 py-2 text-amber-50 hover:bg-blue-600" to="/#Contact">Nous Contacter</Link>
        </motion.div>
      </div>
    </nav>
  );
}

function ParticlesBg() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initParticlesEngine((engine) => loadSlim(engine)).then(() => setReady(true));
  }, []);
  const options = useMemo(() => ({
    fullScreen: { enable: false },
    fpsLimit: 60,
    interactivity: { events: { onHover: { enable: true, mode: "grab" }, resize: { enable: true } }, modes: { grab: { distance: 100, links: { opacity: 0.5 } } } },
    particles: {
      color: { value: "#969696" }, links: { color: "#94a3b8", distance: 100, enable: true, opacity: 0.45, width: 1 },
      move: { enable: true, speed: 1.5, outModes: { default: "out" } }, number: { density: { enable: true }, value: 120 },
      opacity: { value: 0.7 }, shape: { type: "circle" }, size: { value: { min: 1, max: 3 } },
    },
    detectRetina: true,
  }), []);
  return ready ? <Particles id="tsparticles" className="absolute -z-20 min-h-screen w-full" options={options} /> : null;
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title || "Fenêtre"}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative h-full max-h-8/12 w-full max-w-6/12 rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4">
          {title ? <h2 className="text-base font-semibold text-gray-900">{title}</h2> : <span />}
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Fermer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Hero() {
  const [openGuide, setOpenGuide] = useState(false);
  const [openTaxes, setOpenTaxes] = useState(false);
  return <>
    <ParticlesBg />
    <section className="flex min-h-screen items-center justify-center bg-linear-to-b from-40% to-blue-50 py-4 md:py-1" id="Home">
      <div className="flex max-w-[1450px] flex-col items-center justify-center space-y-12">
          <motion.h1
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "linear" }}
                    className="text-4xl md:text-6xl xl:text-8xl font-medium text-center w-96 md:w-10/12"
                  >
                    Martine Adam <span className="text-blue-600">CPA Inc.</span>
                  </motion.h1>
                    <motion.h3
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "linear" }}
                    className="text-xl md:text-4xl xl:text-6xl font-medium text-center"
                  >
                    Le <span className="text-blue-600">cabinet comptable</span> adapté à
                    votre réalité.
                  </motion.h3>

        <motion.p initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "linear" }} className="text-center text-gray-600  md:text-xl">
          Pour mieux vous servir et protéger vos informations personnelles, nous avons modernisé notre processus de préparation d’impôts.<br />
          Nos anciens clients peuvent choisir entre <span className="font-bold text-blue-600">le portail</span> ou <span className="font-bold text-blue-600">le format papier</span>, <span className="font-bold text-red-600">sans frais supplémentaires. </span>
          Nous nous adaptons à vous.<br />Notre objectif est simple : vous offrir une expérience plus fluide, sécurisée et adaptée à vos besoins.
        </motion.p>
        <div className="flex flex-col items-center justify-center">
          <motion.button type="button" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "linear" }} onClick={() => setOpenGuide(true)} className="my-6 cursor-pointer rounded-md bg-blue-600 px-6 py-6 text-lg font-bold text-amber-50 shadow-xl hover:bg-blue-50 hover:text-gray-800">Télécharger le guide pratique et aide-mémoire d'impôt</motion.button>
          <motion.button type="button" initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: "linear" }} onClick={() => setOpenTaxes(true)} className="w-100 cursor-pointer rounded-md bg-blue-600 px-6 py-6 text-lg font-bold text-amber-50 shadow-xl hover:bg-blue-50 hover:text-gray-800 md:text-2xl">Impôts 2025</motion.button>
        </div>
      </div>
    </section>
    <Modal open={openGuide} onClose={() => setOpenGuide(false)} title="Télécharger le guide pratique et aide-mémoire d'impôt"><FilloutStandardEmbed filloutId="ghnAaEjFe8us" /></Modal>
    <Modal open={openTaxes} onClose={() => setOpenTaxes(false)}><FilloutStandardEmbed filloutId="icxrgHbeThus" /></Modal>
  </>;
}

const services = [
  ["Transmission sécurisée", "Envoyez vos documents via un portail en ligne dédié.", "📁"],
  ["Protection renforcée", "Vos informations personnelles sont mieux gardées.", "🔒"],
  ["Suivi rapide", "Un aperçu clair et instantané de l'avancement de votre dossier.", "⏱️"],
  ["Communications unifiées", "Tout centralisé, sans risque de perte.", "💬"],
];
function Services() {
  return <section className="flex min-h-11/12 items-center justify-center bg-linear-to-t from-40% to-blue-50 pt-30" id="Services">
    <div className="flex max-w-[1450px] flex-col items-center justify-center gap-15 md:w-10/12 md:py-1">
      <motion.h3 {...fadeDown} className="text-2xl font-bold text-blue-600">Ce qui change pour vous</motion.h3>
      <h2 className="w-96 text-center text-4xl font-bold md:w-auto">Accédez à votre portail client 24/7 sur ordinateur ou mobile via <span className="text-blue-600">TaxDome</span> pour gérer documents, signatures et factures.</h2>
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
        {services.map(([title, description, emoji]) => <article key={title} className="w-72 rounded-2xl bg-white p-6 text-center shadow-md hover:shadow-2xl"><div className="mb-4 text-6xl">{emoji}</div><h3 className="mb-2 text-lg font-semibold text-[#2D2E32]">{title}</h3><p className="text-gray-600">{description}</p></article>)}
      </motion.div>
    </div>
  </section>;
}

const promises = [[experienceImg, "Optimiser votre expérience utilisateur"], [securityImg, "Garantir la sécurité et la conformité des données"], [qualityImg, "Préserver la qualité de nos services fiscaux"]];
function PromiseSection() {
  return <section className="flex min-h-11/12 flex-col items-center justify-center gap-15 pb-30 pt-50" id="Activity">
    <motion.h3 {...fadeDown} className="text-2xl font-bold text-blue-500">Notre promesse</motion.h3>
    <motion.h2 {...fadeDown} className="w-96 max-w-[1450px] text-center text-4xl font-bold md:w-auto">Notre équipe est là pour vous guider à <span className="text-blue-600">chaque étape</span>.</motion.h2>
    <div className="max-w-[1450px]">
      <motion.div initial={{ y: 100, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} className="grid grid-cols-1 justify-center gap-10 px-9 py-4 text-gray-700 md:grid-cols-3">
        {promises.map(([img, title]) => <article key={title} className="w-90 rounded-2xl bg-white p-6 text-center hover:shadow-2xl"><img src={img} alt="" className="mb-4 h-50 w-80 object-cover" /><h3 className="text-xl font-semibold text-[#2D2E32]">{title}</h3></article>)}
      </motion.div>
      <div className="mt-10 border-b border-slate-200 pb-10 text-center"><p className="text-xl font-semibold">Besoin d'autres services spécialisés ?</p><p className="mt-2 text-slate-900">Allez voir le futur site Web du cabinet qui portera le nom suivant: <a href="https://adamcowen.com/" target="_blank" rel="noopener noreferrer" className="text-2xl font-extrabold hover:text-blue-700">Adam Cowen</a>.</p></div>
    </div>
  </section>;
}

const FAQ_SECTIONS = [
  { id: "particuliers", emoji: "👤", title: "Impôts des particuliers – CPA Joliette et impôts en ligne", items: [
    { id:"p1", q:"Quand dois-je produire ma déclaration de revenus au Québec?", a:"La date limite est généralement le 30 avril. Si vous ou votre conjoint(e) êtes travailleur autonome, vous avez jusqu’au 15 juin pour produire, mais tout solde d’impôt doit être payé au 30 avril.", note:"Notre service d’impôts en ligne au Québec permet une production rapide et sécurisée, sans déplacement.", keywords:["déclaration","date limite","30 avril","15 juin","travailleur autonome"] },
    { id:"p2", q:"Est-il préférable de produire nos impôts en couple?", a:"Oui. Même si chaque personne produit sa déclaration individuellement, une analyse coordonnée permet d’optimiser :", bullets:["Le transfert de crédits","Les frais médicaux","Les dons","Les frais de garde","Les crédits pour aînés"], note:"Un CPA en ligne peut analyser votre situation globale et maximiser votre remboursement.", keywords:["couple","crédits","frais médicaux","dons","garde","aînés"] },
    { id:"p3", q:"Puis-je faire mes impôts entièrement en ligne avec un CPA?", a:"Oui. Notre cabinet offre :", bullets:["Transmission sécurisée des documents","Signature électronique","Rencontre virtuelle au besoin","Dépôt direct","Support personnalisé"], note:"Que vous soyez à Joliette, Lanaudière ou ailleurs au Québec, vous pouvez bénéficier d’un accompagnement professionnel à distance.", keywords:["en ligne","signature","sécurisé","dépôt direct"] },
    { id:"p4", q:"Quels documents dois-je fournir?", a:"Les documents les plus fréquents :", bullets:["T4 / Relevé 1","T5 / Relevé 3","REER","Relevé 31","Frais médicaux","Frais de garde","Dons"], note:"Un CPA Lanaudière ou en ligne vous fournira une liste adaptée à votre situation.", keywords:["documents","t4","relevé 1","reer","relevé 31"] },
  ]},
  { id:"autonomes", emoji:"👨‍💼", title:"Travailleurs autonomes – Comptable en ligne Québec", items:[
    { id:"a1", q:"Dois-je m’inscrire aux taxes (TPS/TVQ)?", a:"L’inscription est obligatoire si vos revenus dépassent 30 000 $ sur 12 mois consécutifs. Un CPA en ligne au Québec peut :", bullets:["Vous inscrire aux taxes","Structurer votre facturation","Mettre en place une tenue de livres adaptée"], keywords:["tps","tvq","30000","taxes"] },
    { id:"a2", q:"Quelles dépenses puis-je déduire comme travailleur autonome?", a:"Exemples fréquents :", bullets:["Bureau à domicile","Internet et téléphone","Kilométrage automobile","Logiciels et abonnements","Assurances professionnelles","Honoraires comptables"], note:"Un comptable en ligne peut vous aider à structurer vos dépenses et éviter les erreurs.", keywords:["dépenses","déduire","bureau","kilométrage","logiciels"] },
    { id:"a3", q:"Comment éviter les mauvaises surprises fiscales?", a:"Contrairement aux salariés :", bullets:["Aucun impôt n’est retenu à la source","Vous devez payer impôt + RRQ","Des acomptes provisionnels peuvent être requis"], note:"Un CPA Lanaudière ou en ligne peut calculer vos acomptes et planifier votre trésorerie.", keywords:["rrq","acomptes","retenu à la source"] },
    { id:"a4", q:"Est-ce avantageux de s’incorporer?", a:"L’incorporation peut être stratégique si :", bullets:["Vos profits dépassent vos besoins personnels","Vous souhaitez optimiser votre fiscalité","Vous planifiez une croissance"], note:"Un CPA en ligne Québec peut analyser votre situation et recommander la meilleure structure.", keywords:["incorporer","incorporation","fiscalité"] },
  ]},
  { id:"locatifs", emoji:"🏢", title:"Propriétaires d’immeubles – Impôts locatifs en ligne", items:[
    { id:"l1", q:"Comment sont imposés les revenus locatifs?", a:"Revenus locatifs – Dépenses admissibles = Revenu net imposable. Ce revenu s’ajoute à vos autres revenus.", note:"Un CPA à Joliette ou en ligne peut optimiser votre fiscalité immobilière.", keywords:["revenus locatifs","revenu net","imposable"] },
    { id:"l2", q:"Quelles dépenses sont déductibles?", bullets:["Intérêts hypothécaires","Taxes municipales","Assurances","Entretien","Gestion immobilière","Honoraires professionnels"], note:"Certaines rénovations doivent être amorties (DPA). Un comptable Lanaudière peut structurer correctement ces déductions.", keywords:["déductibles","hypothécaires","taxes municipales","dpa"] },
    { id:"l3", q:"Comment est imposée la vente d’un immeuble locatif?", a:"Deux éléments peuvent être imposés :", bullets:["Gain en capital (50 % imposable)","Récupération d’amortissement (100 % imposable)"], note:"Une planification stratégique avant la vente est essentielle.", keywords:["vente","gain en capital","amortissement"] },
  ]},
  { id:"pourquoi", emoji:"⭐", title:"Pourquoi choisir notre cabinet de CPA?", items:[
    { id:"w1", q:"Pourquoi choisir notre cabinet de CPA à Joliette ou en ligne?", bullets:["Service en personne à Joliette","Accompagnement partout en Lanaudière","Service d’impôts en ligne sécurisé au Québec","Planification fiscale proactive","Expertise en fiscalité des particuliers et entrepreneurs"], note:"Nous accompagnons des clients à Joliette, partout en Lanaudière, à Montréal et partout au Québec en ligne.", keywords:["joliette","lanaudière","en ligne","sécurisé","planification"] },
  ]},
];
const normalize = (value) => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full justify-between gap-4 px-4 py-4 text-left" aria-expanded={open}><span className="flex items-center text-sm font-semibold text-slate-900">{item.q}</span><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${open ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>{open ? "–" : "+"}</span></button>
    <div className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="min-h-0 overflow-hidden"><div className="px-4 pb-4">{item.a && <p className="text-sm text-slate-600">{item.a}</p>}{item.bullets?.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}{item.note && <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{item.note}</div>}</div></div></div>
  </div>;
}
function FAQ() {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { const onKey = (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); inputRef.current?.focus(); } if (event.key === "Escape") { setQuery(""); inputRef.current?.blur(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);
  const filtered = useMemo(() => { const q = normalize(query.trim()); if (!q) return FAQ_SECTIONS; return FAQ_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => normalize(`${item.q} ${item.a || ""} ${(item.bullets || []).join(" ")} ${item.note || ""} ${item.keywords.join(" ")}`).includes(q)) })).filter((section) => section.items.length); }, [query]);
  return <section className="flex min-h-screen flex-col items-center justify-center gap-10 pb-30" id="FAQ">
    <motion.h3 {...fadeDown} className="text-2xl font-bold text-blue-600">Foire aux questions</motion.h3>
    <motion.h2 {...fadeDown} className="w-96 max-w-[1450px] text-center text-4xl font-bold md:w-auto">CPA et impôts <span className="text-blue-600">à Joliette</span> et <span className="text-blue-600">en ligne</span></motion.h2>
    <p className="mx-auto max-w-3xl text-center text-base text-slate-600">Notre cabinet accompagne les particuliers, travailleurs autonomes et propriétaires d’immeubles locatifs, en personne à Joliette ou 100 % à distance partout au Québec.</p>
    <label className="w-11/12 max-w-3xl"><span className="sr-only">Rechercher dans la FAQ</span><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans la FAQ…" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" /></label>
    <div className="mt-4 grid w-11/12 max-w-4xl gap-6">{filtered.map((section) => <div key={section.id} className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h3 className="font-bold text-slate-900"><span className="mr-2 text-xl">{section.emoji}</span>{section.title}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">FAQ</span></div><div className="p-3 sm:p-5">{section.items.map((item) => <FAQItem key={item.id} item={item} />)}</div></div>)}</div>
  </section>;
}

function Contact() {
  return <section className="flex min-h-screen flex-col items-center justify-center gap-15 bg-linear-to-b from-40% to-blue-50 md:py-3" id="Contact">
    <motion.h3 {...fadeDown} className="text-2xl font-bold text-blue-600">Nous Contacter</motion.h3>
    <h2 className="w-96 text-center text-4xl font-bold md:w-auto">Contactez notre équipe pour obtenir des conseils personnalisés.</h2>
    <motion.div {...fadeDown} className="h-150 rounded-xl bg-linear-to-br from-white via-gray-50 to-gray-100 shadow-xl md:w-200"><FilloutStandardEmbed filloutId="q7LHvaY7kXus" /></motion.div>
    <p className="w-96 text-center md:w-auto">👉 Attendez votre invitation : Ne transmettez rien avant de recevoir l'accès au portail. Les emails ne sont plus acceptés, sauf cas exceptionnels validés par notre équipe.</p>
    <p className="w-96 text-center md:w-8/12">👉 Face à la forte affluence saisonnière, nous ne prenons pas de nouveaux clients pour le moment. Cependant, laissez-nous vos coordonnées : nous pourrons vous orienter vers un confrère ou vous contacter dès qu'une place se libère.</p>
  </section>;
}
function Footer() { return <footer className="bg-linear-to-t from-0% to-blue-50"><div className="mx-auto w-full max-w-7xl p-4 md:py-8"><hr className="my-6 border-gray-700 lg:my-8" /><Link to="/politique-de-confidentialite" className="mb-4 block text-center text-sm text-blue-700 underline">Politique de confidentialité</Link><span className="block text-sm text-gray-800 sm:text-center">© {new Date().getFullYear()} <a href="https://adamcowen.com/" className="hover:underline">MartineAdamCPA™</a>. All Rights Reserved.</span></div></footer>; }

function ScrollToLocation() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isClientAccess = pathname === "/demande-acces" || pathname === "/ouverture-dossier";
  return <div>
    <ScrollToLocation />
    {!isAdmin && !isClientAccess && <NavBar />}
    <Routes>
      <Route path="/demande-acces" element={<AccessRequestPage />} />
      <Route path="/ouverture-dossier" element={<OuvertureDossierPage />} />
      <Route path="/politique-de-confidentialite" element={<PrivacyPolicy />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<ProtectedAdminRoute />}>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/confirmations" element={<AdminConfirmations />} />
        <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
        <Route path="/admin/logs" element={<AdminActivityLogsPage />} />
      </Route>
      <Route path="/" element={<><Hero /><Services /><PromiseSection /><FAQ /><Contact /></>} />
      <Route path="/confirm-client" element={<ClientChoicePage />} />
      <Route path="/confirm-client/formulaire" element={<ConfirmationClient />} />
      <Route path="/confirm-client/merci" element={<ConfirmClientSuccessPage />} />
      <Route path="/confirmation-client" element={<ClientChoicePage />} />
      <Route path="/confirmation-client/nouveau" element={<ConfirmationClient clientType="new_client" />} />
      <Route path="/confirm-client/nouveau" element={<ConfirmationClient clientType="new_client" />} />
      <Route path="/confirmation-client/formulaire" element={<ConfirmationClient />} />
      <Route path="/confirmation-client/merci" element={<ConfirmClientSuccessPage />} />
      <Route path="*" element={
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-4xl font-bold">Page introuvable</h1>
          <Link to="/" className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">Retour à l’accueil</Link>
        </main>
      } />
    </Routes>
    {!isAdmin && !isClientAccess && <Footer />}
  </div>;
}
