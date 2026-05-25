import { Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header'
import Hero from './components/Hero/Hero'
import EasyRegister from './components/EasyRegister/EasyRegister'
import Features from './components/Features/Features'
import SocialProof from './components/SocialProof/SocialProof'
import MiniFeatures from './components/MiniFeatures/MiniFeatures'
import FAQ from './components/FAQ/FAQ'
import Footer from './components/Footer/Footer'
import Login from './pages/Login/Login'
import Register from './pages/Register/Register'
import Profile from './pages/Profile/Profile'
import ProfileForm from './pages/ProfileForm/ProfileForm'
import './App.css'

function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <EasyRegister />
        <Features />
        <SocialProof />
        <MiniFeatures />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/perfil" element={<Profile />} />
      <Route path="/completar-perfil" element={<ProfileForm />} />
    </Routes>
  )
}

export default App
