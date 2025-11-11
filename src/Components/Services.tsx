import ServiceCard from "./ServiceCard";
import { motion } from "motion/react";

function Services() {
  return (
    <div className="flex flex-row justify-center items-center  min-h-11/12 bg-linear-to-t from-40% to-blue-50  md:py-1">
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
          Nos Service
        </motion.h3>
        <h1 className="text-4xl font-bold text-center w-96 md:w-auto">
          Avec plus de <span className="text-blue-600">300</span> entreprises
          qui nous font confiance, nous mettons notre expertise de plus de{" "}
          <span className="text-blue-600">10 ans</span> au service des
          entrepreneurs ambitieux. Voir comment
        </h1>
        <motion.div
          initial={{ z: -40, opacity: 0 }}
          whileInView={{ z: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
          viewport={{ once: true, amount: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 "
        >
          <ServiceCard
            title="États financiers"
            description="Obtenez une vision claire de votre entreprise grâce à des états financiers précis et à jour."
            color="#29B9E7"
          />
          <ServiceCard
            title="Fiscalité"
            description="Maximisez vos économies d’impôts avec des stratégies fiscales personnalisées pour particuliers et entreprises."
            color="#F48C06"
          />
          <ServiceCard
            title="Tenue de livres"
            description="Une comptabilité rigoureuse, efficace et conforme pour votre tranquillité d’esprit."
            color="#5B72EE"
          />
          <ServiceCard
            title="Gestion de la paie"
            description="Service de paies incluant paie CCQ."
            color="#EB493A"
          />
          <ServiceCard
            title="Conseils"
            description="Des stratégies personnalisées pour propulser votre croissance."
            color="#5B72EE"
          />
          <ServiceCard
            title="Automatisation"
            description="Libérez votre potentiel grâce à des processus optimisés et intelligents."
            color="#EB493A"
          />
        </motion.div>
      </div>
    </div>
  );
}

export default Services;
