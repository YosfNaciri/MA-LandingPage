import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

type Item = {
  id: string;
  q: string;
  a?: string;
  bullets?: string[];
  note?: string;
  keywords: string[];
};

type Section = {
  id: string;
  title: string;
  emoji: string;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    id: "particuliers",
    emoji: "👤",
    title: "Impôts des particuliers – CPA Joliette et impôts en ligne",
    items: [
      {
        id: "p1",
        q: "Quand dois-je produire ma déclaration de revenus au Québec?",
        a: "La date limite est généralement le 30 avril. Si vous ou votre conjoint(e) êtes travailleur autonome, vous avez jusqu’au 15 juin pour produire, mais tout solde d’impôt doit être payé au 30 avril.",
        note: "Notre service d’impôts en ligne au Québec permet une production rapide et sécurisée, sans déplacement.",
        keywords: [
          "déclaration",
          "date limite",
          "30 avril",
          "15 juin",
          "travailleur autonome",
        ],
      },
      {
        id: "p2",
        q: "Est-il préférable de produire nos impôts en couple?",
        a: "Oui. Même si chaque personne produit sa déclaration individuellement, une analyse coordonnée permet d’optimiser :",
        bullets: [
          "Le transfert de crédits",
          "Les frais médicaux",
          "Les dons",
          "Les frais de garde",
          "Les crédits pour aînés",
        ],
        note: "Un CPA en ligne peut analyser votre situation globale et maximiser votre remboursement.",
        keywords: [
          "couple",
          "crédits",
          "frais médicaux",
          "dons",
          "garde",
          "aînés",
        ],
      },
      {
        id: "p3",
        q: "Puis-je faire mes impôts entièrement en ligne avec un CPA?",
        a: "Oui. Notre cabinet offre :",
        bullets: [
          "Transmission sécurisée des documents",
          "Signature électronique",
          "Rencontre virtuelle au besoin",
          "Dépôt direct",
          "Support personnalisé",
        ],
        note: "Que vous soyez à Joliette, Lanaudière ou ailleurs au Québec, vous pouvez bénéficier d’un accompagnement professionnel à distance.",
        keywords: ["en ligne", "signature", "sécurisé", "dépôt direct"],
      },
      {
        id: "p4",
        q: "Quels documents dois-je fournir?",
        a: "Les documents les plus fréquents :",
        bullets: [
          "T4 / Relevé 1",
          "T5 / Relevé 3",
          "REER",
          "Relevé 31",
          "Frais médicaux",
          "Frais de garde",
          "Dons",
        ],
        note: "Un CPA Lanaudière ou en ligne vous fournira une liste adaptée à votre situation.",
        keywords: ["documents", "t4", "relevé 1", "reer", "relevé 31"],
      },
    ],
  },
  {
    id: "autonomes",
    emoji: "👨‍💼",
    title: "Travailleurs autonomes – Comptable en ligne Québec",
    items: [
      {
        id: "a1",
        q: "Dois-je m’inscrire aux taxes (TPS/TVQ)?",
        a: "L’inscription est obligatoire si vos revenus dépassent 30 000 $ sur 12 mois consécutifs. Un CPA en ligne au Québec peut :",
        bullets: [
          "Vous inscrire aux taxes",
          "Structurer votre facturation",
          "Mettre en place une tenue de livres adaptée",
        ],
        keywords: ["tps", "tvq", "30000", "taxes"],
      },
      {
        id: "a2",
        q: "Quelles dépenses puis-je déduire comme travailleur autonome?",
        a: "Exemples fréquents :",
        bullets: [
          "Bureau à domicile",
          "Internet et téléphone",
          "Kilométrage automobile",
          "Logiciels et abonnements",
          "Assurances professionnelles",
          "Honoraires comptables",
        ],
        note: "Un comptable en ligne peut vous aider à structurer vos dépenses et éviter les erreurs.",
        keywords: ["dépenses", "déduire", "bureau", "kilométrage", "logiciels"],
      },
      {
        id: "a3",
        q: "Comment éviter les mauvaises surprises fiscales?",
        a: "Contrairement aux salariés :",
        bullets: [
          "Aucun impôt n’est retenu à la source",
          "Vous devez payer impôt + RRQ",
          "Des acomptes provisionnels peuvent être requis",
        ],
        note: "Un CPA Lanaudière ou en ligne peut calculer vos acomptes et planifier votre trésorerie.",
        keywords: ["rrq", "acomptes", "retenu à la source"],
      },
      {
        id: "a4",
        q: "Est-ce avantageux de s’incorporer?",
        a: "L’incorporation peut être stratégique si :",
        bullets: [
          "Vos profits dépassent vos besoins personnels",
          "Vous souhaitez optimiser votre fiscalité",
          "Vous planifiez une croissance",
        ],
        note: "Un CPA en ligne Québec peut analyser votre situation et recommander la meilleure structure.",
        keywords: ["incorporer", "incorporation", "fiscalité"],
      },
    ],
  },
  {
    id: "locatifs",
    emoji: "🏢",
    title: "Propriétaires d’immeubles – Impôts locatifs en ligne",
    items: [
      {
        id: "l1",
        q: "Comment sont imposés les revenus locatifs?",
        a: "Revenus locatifs – Dépenses admissibles = Revenu net imposable. Ce revenu s’ajoute à vos autres revenus.",
        note: "Un CPA à Joliette ou en ligne peut optimiser votre fiscalité immobilière.",
        keywords: ["revenus locatifs", "revenu net", "imposable"],
      },
      {
        id: "l2",
        q: "Quelles dépenses sont déductibles?",
        bullets: [
          "Intérêts hypothécaires",
          "Taxes municipales",
          "Assurances",
          "Entretien",
          "Gestion immobilière",
          "Honoraires professionnels",
        ],
        note: "Certaines rénovations doivent être amorties (DPA). Un comptable Lanaudière peut structurer correctement ces déductions.",
        keywords: ["déductibles", "hypothécaires", "taxes municipales", "dpa"],
      },
      {
        id: "l3",
        q: "Comment est imposée la vente d’un immeuble locatif?",
        a: "Deux éléments peuvent être imposés :",
        bullets: [
          "Gain en capital (50 % imposable)",
          "Récupération d’amortissement (100 % imposable)",
        ],
        note: "Une planification stratégique avant la vente est essentielle.",
        keywords: ["vente", "gain en capital", "amortissement"],
      },
    ],
  },
  {
    id: "pourquoi",
    emoji: "⭐",
    title: "Pourquoi choisir notre cabinet de CPA?",
    items: [
      {
        id: "w1",
        q: "Pourquoi choisir notre cabinet de CPA à Joliette ou en ligne?",
        bullets: [
          "Service en personne à Joliette",
          "Accompagnement partout en Lanaudière",
          "Service d’impôts en ligne sécurisé au Québec",
          "Planification fiscale proactive",
          "Expertise en fiscalité des particuliers et entrepreneurs",
        ],
        note: "Nous accompagnons des clients à Joliette, partout en Lanaudière, à Montréal et partout au Québec en ligne.",
        keywords: [
          "joliette",
          "lanaudière",
          "en ligne",
          "sécurisé",
          "planification",
        ],
      },
    ],
  },
];

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export default function FAQThemed() {
  const [query, setQuery] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Ctrl/Cmd + K focus + ESC clear (comme sur les sites modernes)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SECTIONS;

    return SECTIONS.map((s) => {
      const items = s.items.filter((it) => {
        const hay = normalize(
          `${it.q} ${it.a ?? ""} ${(it.bullets ?? []).join(" ")} ${it.note ?? ""} ${it.keywords.join(" ")}`,
        );
        return hay.includes(q);
      });
      return { ...s, items };
    }).filter((s) => s.items.length > 0);
  }, [query]);

  return (
    <div className="flex justify-center items-center flex-col min-h-screen gap-10 pb-30">
      <motion.h3
        initial={{ y: -40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-2xl text-blue-600 font-bold"
      >
        Foire aux questions
      </motion.h3>

      {/* Big title */}
      <motion.h1
        initial={{ y: -80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-4xl font-bold text-center w-96 md:w-auto max-w-[1450px]"
      >
        CPA et impôts <span className="text-blue-600">à Joliette</span> et{" "}
        <span className="text-blue-600">en ligne</span>
      </motion.h1>

      <p className="mx-auto mt-4 max-w-3xl text-center text-base text-slate-600">
        Notre cabinet accompagne les particuliers, travailleurs autonomes et
        propriétaires d’immeubles locatifs, en personne à Joliette ou 100 % à
        distance partout au Québec.
      </p>

      {/* Sections (cards clean like theme) */}
      <div className="mt-10 grid gap-6">
        {filtered.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{section.emoji}</span>
                <h3 className="text-base font-bold text-slate-900">
                  {section.title}
                </h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                FAQ
              </span>
            </div>

            <div className="p-3 sm:p-5">
              {section.items.map((it) => (
                <FAQItem key={it.id} item={it} />
              ))}
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
function FAQItem({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
<button
  type="button"
  onClick={() => setOpen((v) => !v)}
  className="flex w-full justify-between gap-4 px-4 py-4 text-left"
  aria-expanded={open}
>
  <div className="flex flex-row justify-center items-center  text-sm font-semibold text-slate-900">
    {item.q}
  </div>

  <span
    className={[
      "flex h-8 w-8 items-center justify-center shrink-0 rounded-lg border text-sm font-bold transition",
      open
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-500",
    ].join(" ")}
  >
    {open ? "–" : "+"}
  </span>
</button>

      <div
        className={[
          "grid min-h-0 overflow-hidden transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        {/* No padding here */}
        <div className="min-h-0 overflow-hidden">
          {/* Put padding INSIDE so collapsed height is truly 0 */}
          <div className="px-4 pb-4">
            {item.a && <p className="text-sm text-slate-600">{item.a}</p>}

            {item.bullets?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {item.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}

            {item.note ? (
              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {item.note}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
