import { motion } from "motion/react";
import SectorCard from "./SectorCard";

import PmeImg from "../assets/PME.jpg";
import ServiceImg from "../assets/service-Pro.webp";
import constructImg from "../assets/construct.jpg";

function SectActivite() {
  return (
    <div
      className="flex justify-center items-center flex-col gap-15 min-h-screen "
      id="Activity"
    >
      <motion.h3
        initial={{ y: -40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-2xl text-blue-500 font-bold"
      >
        Secteurs d’activités
      </motion.h3>

      <motion.h1
        initial={{ y: -80, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-4xl font-bold text-center w-96 md:w-auto max-w-[1450px]"
      >
        Quelle que soit votre <span className="text-blue-600">industrie,</span>{" "}
        notre équipe possède l’expertise nécessaire pour comprendre vos{" "}
        <span className="text-blue-600">enjeux spécifiques</span> et vous
        accompagner dans votre{" "}
        <span className="text-blue-600">croissance.</span>
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
          <SectorCard img={PmeImg} title="Petites et moyennes entreprises." />
          <SectorCard img={ServiceImg} title="Services professionnels." />
          <SectorCard img={constructImg} title="Construction et immobilier" />
        </motion.div>
      </div>
    </div>
  );
}

export default SectActivite;
