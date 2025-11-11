import { motion } from "motion/react";
import ParticlesBg from "./ParticlesBg";

function Hero() {

  return (
    <>
      <ParticlesBg />
      <div
        className="flex flex-row justify-center items-center  min-h-screen bg-linear-to-b from-40% to-blue-50 py-4 md:py-1 "
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
            ligne pour vos besoins financiers
          </motion.h1>
          <motion.p
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="text-gray-600 w-96 md:text-xl text-center md:w-10/12"
          >
            Plus qu’un cabinet comptable, nous somme votre partenaire numérique.
            Nous combinons expertise humaine et outils technologiques pour
            rendre la gestion financière simple, rapide et accessible. Oubliez
            les contraintes administratives, nous automatisons, vous avancez.
          </motion.p>
          <div>
            <motion.button
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "linear" }}
              className="hover:text-gray-800 text-lg  md:text-2xl font-bold hover:bg-blue-50 bg-blue-600 text-amber-50 px-6 py-6 rounded-md cursor-pointer shadow-xl"
            >
              <a href="#Contact">Nous Contacter</a>
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Hero;
