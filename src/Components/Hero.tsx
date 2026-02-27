import { motion } from "motion/react";
import ParticlesBg from "./ParticlesBg";
import { Modal } from "./Modal";
import { useState } from "react";
import { FilloutStandardEmbed } from "@fillout/react";

function Hero() {
  const [open, setOpen] = useState(false);
  const [open2025, setOpen2025] = useState(false);

  return (
    <>
      <ParticlesBg />
      <div
        className="flex flex-row justify-center items-center  min-h-screen bg-linear-to-b from-40% to-blue-50 py-4 md:py-1 mt-20"
        id="Home"
      >
        <div className=" space-y-12 flex flex-col justify-center items-center max-w-[1450px]">
          <motion.h1
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="text-4xl md:text-6xl xl:text-8xl font-medium text-center w-96 md:w-10/12"
          >
            Le <span className="text-blue-600">cabinet comptable</span> 100% en
            ligne pour vos besoins en impôts des particuliers et corporatifs.
          </motion.h1>
          <motion.p
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="text-gray-600 w-96 md:text-xl text-center md:w-10/12"
          >
            Dans le but de mieux vous servir, de protéger vos informations
            personnelles et de rendre le processus plus simple et plus efficace,
            nous avons modernisé notre fonctionnement pour la préparation de vos
            impôts. Au fil des dernières années, les échanges de documents par
            courriel, papier ou clés USB sont devenus moins sécuritaires et plus
            difficiles à gérer, autant pour vous que pour notre équipe. C’est
            pourquoi nous passons maintenant à un processus entièrement
            numérique et sécurisé pour la majorité des dossiers.
          </motion.p>
          <div className="flex flex-col justify-center items-center">
            <motion.button
              initial={{ y: -50, opacity: 0 }}
              onClick={() => setOpen(true)}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "linear" }}
              className="hover:text-gray-800 text-lg font-bold hover:bg-blue-50 bg-blue-600 text-amber-50 my-6 px-6 py-6 rounded-md cursor-pointer shadow-xl"
            >
              <a>Télécharger le guide pratique et aide-mémoire d'impôt</a>
            </motion.button>
            <motion.button
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={() => setOpen2025(true)}
              transition={{ duration: 0.6, ease: "linear" }}
              className="w-100 hover:text-gray-800 text-lg  md:text-2xl font-bold hover:bg-blue-50 bg-blue-600 text-amber-50 px-6 py-6 rounded-md cursor-pointer shadow-xl"
            >
              <a>Impôts 2025</a>
            </motion.button>
          </div>
        </div>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Télécharger le guide pratique et aide-mémoire d'impôt"
      >
        <FilloutStandardEmbed filloutId="ghnAaEjFe8us" />
      </Modal>
      <Modal open={open2025} onClose={() => setOpen2025(false)} title=" ">
        <FilloutStandardEmbed filloutId="icxrgHbeThus" />
      </Modal>
    </>
  );
}

export default Hero;
