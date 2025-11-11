
import './App.css'
import Hero from "./Components/Hero";
import Service from "./Components/Services";
import SectActivite from "./Components/SectActivite";
import Contact from "./Components/Contact";
import NavBar from './Components/NavBar';
import Footer from './Components/Footer';
function App() {

  return (
      <div>
        <NavBar/>
      <Hero />
      <Service />
      <SectActivite />
      <Contact />
      <Footer/>
    </div>
  )
}

export default App
