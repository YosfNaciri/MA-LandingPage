import martineLogo from '../assets/MACPA.jpeg';

export default function BrandLogos({ compact = false }) {
  return <span className={`flex min-w-0 items-center justify-center ${compact ? 'gap-2' : 'gap-3 sm:gap-5'}`}>
    <img src={martineLogo} alt="Martine Adam CPA" className={`${compact ? 'h-7 max-w-24' : 'h-9 max-w-32 sm:h-14 sm:max-w-48'} w-auto object-contain`} />
    <span aria-hidden="true" className="h-8 w-px shrink-0 bg-slate-200" />
    <span className={`min-w-0 text-left leading-snug ${compact ? 'max-w-28 text-xs' : 'max-w-44 text-sm sm:max-w-60 sm:text-base'}`}>
      <span className="block text-slate-500">devient</span>
      <span className="font-bold text-blue-700">Groupe Axolu CPA Inc.</span>
    </span>
  </span>;
}
