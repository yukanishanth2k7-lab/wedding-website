import { useEffect } from 'react';
import Portfolio from '../components/Portfolio';
import Navbar from '../components/Navbar';

export default function PortfolioPage() {
  useEffect(() => {
    // Scroll to top on load since this is a new route
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }}>
      <Navbar />
      <div className="portfolio-page" style={{ paddingTop: '80px', minHeight: '100vh', background: '#0a0a0a' }}>
        <Portfolio />
      </div>
    </div>
  );
}
