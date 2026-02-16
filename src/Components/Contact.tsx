import { FilloutStandardEmbed } from "@fillout/react";
import { motion } from "motion/react";

function Contact() {
  return (
    <div
      className="flex justify-center items-center flex-col gap-15  md:py-3 min-h-screen bg-linear-to-b from-40% to-blue-50  "
      id="Contact"
    >
      <motion.h3
        initial={{ y: -40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.5 }}
        className="text-2xl text-blue-600 font-bold"
      >
        Nous Contacter
      </motion.h3>
      <h1 className="text-4xl font-bold text-center md:text-start w-96 md:w-auto">
        Contactez notre équipe pour obtenir des conseils personnalisés.
      </h1>
    
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "linear" }}
        viewport={{ once: true, amount: 0.3 }}
        className="md:w-200 h-150 bg-linear-to-br from-white via-gray-50 to-gray-100 rounded-xl shadow-xl space-y-6"
      >
        {/*<ContactForm />*/}
          <FilloutStandardEmbed filloutId="q7LHvaY7kXus" />
      </motion.div>
        <h3 className="text-center w-96 md:w-auto">
        👉 Attendez votre invitation : Ne transmettez rien avant de recevoir l'accès au portail, Les emails ne sont plus acceptés, sauf cas exceptionnels validés par notre équipe.
      </h3>
         <h3 className="text-center w-96 md:w-8/12">
        👉 Face à la forte affluence saisonnière, nous ne prenons pas de nouveaux clients pour le moment. Cependant, laissez-nous vos coordonnées : nous pourrons vous orienter vers un confrère ou vous contacter dès qu'une place se libère.
      </h3>
    </div>
  );
}

export default Contact;
