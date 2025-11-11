

function Footer() {
  return (
    <footer className="bg-linear-to-t from-0% to-blue-50 ">
      <div className="w-full max-w-7xl mx-auto p-4 md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <a
            href="#Home"
            className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse"
          >
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-tr to-blue-200 from-blue-900">
              MartineAdam CPA
            </p>
          </a>
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-gray-800 sm:mb-0 ">
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                A Propos
              </a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">
                Politique de confidentialité
              </a>
            </li>
            <li>
              <a href="#Contact" className="hover:underline">
                Contacter Nous
              </a>
            </li>
          </ul>
        </div>
        <hr className="my-6  sm:mx-autoborder-gray-700 lg:my-8" />
        <span className="block text-sm  sm:text-center text-gray-800">
          © {new Date().getFullYear()}{" "}
          <a href="https://adamcowen.com/" className="hover:underline">
            MartineAdamCPA™
          </a>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}

export default Footer;
