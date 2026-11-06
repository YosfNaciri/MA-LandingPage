import martineLogo from '../assets/MACPA.jpeg';
import axoluLogo from '../assets/Axolu CPA.png';

export default function BrandLogos({ compact = false }) {
  return <span className={`flex min-w-0 items-center justify-center ${compact ? 'gap-2' : 'gap-3 sm:gap-5'}`}>
    <img src={martineLogo} alt="Martine Adam CPA" className={`${compact ? 'h-7 max-w-24' : 'h-9 max-w-32 sm:h-14 sm:max-w-48'} w-auto object-contain`} />
    <span aria-hidden="true" className="h-8 w-px shrink-0 bg-slate-200" />
    <img src={axoluLogo} alt="Axolu CPA" className={`${compact ? 'w-24' : 'w-32 sm:w-44'} h-auto min-w-0 object-contain`} />
  </span>;
}
