import ServiceCard from "./ServiceCard";
import { motion } from "motion/react";

function Services() {
  return (
    <div className="flex flex-row justify-center items-center  min-h-11/12 bg-linear-to-t from-40% to-blue-50 pt-30">
      <div
        className="flex justify-center items-center flex-col gap-15 md:py-1 max-w-[1450px] md:w-10/12"
        id="Services"
      >
        <motion.h3
          initial={{ y: -40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
          viewport={{ once: true, amount: 0.5 }}
          className="text-2xl text-blue-600 font-bold"
        >
          Ce qui change pour vous
        </motion.h3>
        <h1 className="text-4xl font-bold text-center w-96 md:w-auto">
                   Accédez à votre portail client 24/7 sur ordinateur ou mobile via <span className="text-blue-600">TaxDome</span> pour gérer documents, signatures et factures.

        </h1>
        <motion.div
          initial={{ z: -40, opacity: 0 }}
          whileInView={{ z: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
          viewport={{ once: true, amount: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 "
        >
          <ServiceCard
            title="Transmission sécurisée"
            description="Envoyez vos documents via un portail en ligne dédié."
            color="#29B9E7"
            emoji="📁"
          />
          <ServiceCard
            title="Protection renforcée"
            description="Vos informations personnelles sont mieux gardées."
            color="#F48C06"
            emoji="🔒"
          />
          <ServiceCard
            title="Suivi rapide"
            description="Un aperçu clair et instantané de l'avancement de votre dossier."
            color="#5B72EE"
            emoji="⏱️"
          />
          <ServiceCard
            title="Communications unifiées"
            description="Tout centralisé, sans risque de perte."
            color="#EB493A"
            emoji="💬"
          />
      
        </motion.div>
      </div>
    </div>
  );
}

export default Services;
