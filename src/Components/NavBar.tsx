import { useEffect, useState } from "react";
// import { HiMenu } from "react-icons/hi";
// import { IoClose } from "react-icons/io5";

import { motion } from "motion/react";

import logo from "../assets/MACPA.jpeg"


function NavBar() {
  // const [isOpen, setIsOpen] = useState(false);

  // const toggleMenu = () => {
  //   setIsOpen((prevState) => !prevState);
  // };

  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // scrolling down → hide navbar
        setShowNav(false);
      } else {
        // scrolling up → show navbar
        setShowNav(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // useEffect(() => {
  //   /** juste to handle the scrolling while the nave menu is open on mobile view */
  //   if (isOpen) {
  //     document.body.classList.add("no-scroll");
  //   } else {
  //     document.body.classList.remove("no-scroll");
  //   }
  // }, [isOpen]);

  return (
    <nav
      className={`fixed top-0  w-full z-50 transition-transform duration-500 ${
        showNav ? "translate-y-0" : "-translate-y-full"
      } bg-white/80 backdrop-blur text-gray-800`}
    >
      <div className="max-w-[1450px] mx-auto p-5 flex items-center justify-center md:justify-between">
        <motion.a
          className="md:w-100 z-20"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
        >

        <img src={logo}  className="h-10 md:h-15"/>

        
        </motion.a>

        {/* {!isOpen && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="pointer-events-auto cursor-pointer md:hidden md:pointer-events-none"
            onClick={toggleMenu}
          >
            <HiMenu size={30} />
          </motion.div>
        )}
        {isOpen && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "linear" }}
            className="pointer-events-auto cursor-pointer md:hidden z-20 md:pointer-events-none"
            onClick={toggleMenu}
          >
            <IoClose size={30} />
          </motion.div>
        )} */}
        {/* {isOpen ? (
          <div className="bg-white overflow-y-hidden fixed z-10 top-0 left-0 w-screen min-h-screen flex justify-center items-center flex-col gap-10 duration-300 ease-in">
            <a
              className="text-2xl font-bold"
              href="#Services"
              onClick={toggleMenu}
            >
              Nos Services
            </a>
            <a
              className="text-2xl font-bold"
              href="#Activity"
              onClick={toggleMenu}
            >
              Secteurs d’activités
            </a>
            <a
              className="bg-blue-500 text-amber-50 hover:bg-blue-600 px-6 py-2 rounded-md cursor-pointer"
              href="#Contact"
              onClick={toggleMenu}
            >
              Nous Contacter
            </a>
          </div>
        ) : (
          <div className="bg-white overflow-y-hidden fixed z-10 top-0 left-[-150%] w-screen min-h-screen flex justify-center items-center flex-col gap-10 duration-300 ease-in"></div>
        )} */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "linear" }}
          className="hidden md:flex items-center gap-4 "
        >
   {/*       <a href="#Services">Nos Services</a>
          <a href="#Activity">Secteurs d’activités</a>*/}
          <a
            className="text-amber-50 bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-md cursor-pointer"
            href="#Contact"
          >
            Nous Contacter
          </a>
        </motion.div>
      </div>
    </nav>
  );
}

export default NavBar;
