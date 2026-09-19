import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLenisInstance } from '../store';
import './Navbar.css';

import AnimatedLogo from './AnimatedLogo';

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
  { id: 'portfolio', label: 'Portfolio' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('home');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // NAVBAR: background turns soft ivory + subtle shadow after the user scrolls
    // past the hero's first fold; transparent glass above that.
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // If we're on the portfolio page, keep Portfolio active
    if (location.pathname === '/portfolio') {
      setActive('portfolio');
      return;
    }

    // NAVBAR: active section highlight — the section occupying the upper-middle
    // of the viewport wins; Contact stays lit at the very bottom of the page.
    const targets = LINKS.filter(l => l.id !== 'portfolio')
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
      
    const onScroll = () => {
      const probe = window.innerHeight * 0.45;
      let current = 'home';
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= probe) current = el.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = 'contact';
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  const goTo = (id: string) => {
    if (id === 'portfolio') {
      navigate('/portfolio');
      return;
    }

    if (location.pathname !== '/') {
      // If we are not on the home page, navigate to home and then scroll
      navigate('/');
      // Wait for navigation and rendering to finish, then scroll
      setTimeout(() => {
        const lenis = getLenisInstance();
        if (lenis) {
          lenis.scrollTo(`#${id}`, { duration: 1.4 });
        } else {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return;
    }

    const lenis = getLenisInstance();
    if (lenis) {
      lenis.scrollTo(`#${id}`, { duration: 1.4 });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`navbar${scrolled ? ' navbar--scrolled' : ''}`}>
      {/* NAVBAR: Animated 3D Logo */}
      <div onClick={(e) => {
        e.preventDefault();
        goTo('home');
      }} style={{ cursor: 'pointer' }}>
        <AnimatedLogo />
      </div>

      {/* NAVBAR: links aligned top-right with equal spacing; gold underline hover;
          active section glows gold */}
      <nav className="navbar-links" aria-label="Primary">
        {LINKS.map((link) => (
          <a
            key={link.id}
            href={link.id === 'portfolio' ? '/portfolio' : `/#${link.id}`}
            className={`navbar-link${active === link.id ? ' active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              goTo(link.id);
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
