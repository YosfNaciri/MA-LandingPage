import { motion } from "motion/react";
import SectorCard from "./SectorCard";

import PmeImg from "../assets/optimisation-experience-utilisateur.jpg";
import ServiceImg from "../assets/securitinformatiqueAdobeStock58947296jpeg_604e4ae99bb8f.jpeg";
import constructImg from "../assets/audit-comptable-et-financier.webp";

function SectActivite() {
  return (
    <div
      className="flex justify-center items-center flex-col gap-15 min-h-11/12 pt-50 pb-30"
      id="Activity"
    >
      <motion.h3
        initial={{ y: -40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-2xl text-blue-500 font-bold"
      >
        Notre promesse
      </motion.h3>

      <motion.h1
        initial={{ y: -80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-4xl font-bold text-center w-96 md:w-auto max-w-[1450px]"
      >
       Notre équipe est là pour vous guider à <span className="text-blue-600">chaque étape</span>.

      </motion.h1>

      <div className="max-w-[1450px]">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
          viewport={{ once: true, amount: 0.5 }}
          className="flex justify-center items-center "
        ></motion.div>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
          viewport={{ once: true, amount: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 px-9 py-4 justify-center gap-10 text-gray-700"
        >
          <SectorCard img={PmeImg} title="Optimiser votre expérience utilisateur" />
          <SectorCard img={ServiceImg} title="Garantir la sécurité et la conformité des données" />
          <SectorCard img={constructImg} title="Préserver la qualité de nos services fiscaux" />
        </motion.div>
        
<div className="border-b border-slate-200 mt-10 pb-10 text-center">
  <p className="text-xl font-semibold">
    Besoin d'autres services spécialisés ?
  </p>

  <p className="mt-2 text-slate-900">
    Découvrez l’ensemble des services complémentaires offerts par notre cabinet partenaire.  <span> </span>
  <a
    href="https://adamcowen.com/"
    target="_blank"
    rel="noopener noreferrer"
    className=" font-extrabold text-2xl hover:text-blue-700 transition"
  >
    AdamCowen
  </a> 
  </p>
</div>

      </div>
    </div>
  );
}

export default SectActivite;
