import { useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { useAppStore, setLenisInstance } from '../store';
import { detectWebGLSupport } from '../utils/a11y';

import CanvasGuard from '../components/CanvasGuard';
import CameraRig from '../components/CameraRig';
import EnvironmentSetup from '../components/EnvironmentSetup';
import HeroPhoto from '../components/HeroPhoto';
import PhotoScene from '../components/PhotoScene';
import DslrCamera from '../components/DslrCamera';
import PostProcessing from '../components/PostProcessing';
import ParticleDust from '../components/ParticleDust';
import WordReveal from '../components/WordReveal';
import Marquee from '../components/Marquee';
import Navbar from '../components/Navbar';

import Hero from '../components/Hero';
import Services from '../components/Services';
import OurStory from '../components/OurStory';
import RSVP from '../components/RSVP';
import Portfolio from '../components/Portfolio';
import Process from '../components/Process';
import Testimonials from '../components/Testimonials';
import Footer from '../components/Footer';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const setScrollProgress = useAppStore((state) => state.setScrollProgress);
  const setIsMobile = useAppStore((state) => state.setIsMobile);
  const prefersReducedMotion = useAppStore((state) => state.prefersReducedMotion);
  const webglSupported = useAppStore((state) => state.webglSupported);
  const setWebglSupported = useAppStore((state) => state.setWebglSupported);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A11Y: probe WebGL once — unsupported environments get a static fallback
    // (CSS gradient) instead of a dead canvas.
    setWebglSupported(detectWebGLSupport());

    // Mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Lenis smooth scroll — glide tuned like a dolly move. A11Y: smoothWheel is
    // disabled when the user prefers reduced motion so native instant scrolling
    // returns and scroll-jacking never fights assistive tech.
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !prefersReducedMotion,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // NAVBAR: share the instance so nav links can smooth-scroll to sections
    setLenisInstance(lenis);

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // ScrollTrigger to update global store
    const trigger = ScrollTrigger.create({
      trigger: scrollContainerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        setScrollProgress(self.progress);
      },
    });

    // FIX (scroll drift): section boundaries were measured before gallery images
    // decoded — as lazy webps popped in, the page grew and the 3D progress map
    // drifted out of sync (photos clicked at the wrong scroll spots). Watch the
    // container's size and re-measure when it settles.
    const container = scrollContainerRef.current;
    let refreshTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    if (container) ro.observe(container);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(refreshTimer);
      ro.disconnect();
      lenis.destroy();
      trigger.kill();
      setLenisInstance(null);
    };
  }, [setIsMobile, setScrollProgress, prefersReducedMotion, setWebglSupported]);

  return (
    <>
      {/* A11Y: first focusable element — one keystroke to jump past the 3D scene
          and navbar straight to real content. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="canvas-container">
        {/* A11Y: the WebGL scene is purely decorative — hidden from assistive
            tech; all real content lives in the DOM sections below. The wrapper
            must fill the fixed container — R3F sizes the canvas from its parent. */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
          <CanvasGuard>
            {webglSupported ? (
              <Canvas
                camera={{ position: [0, -0.5, 6.4], fov: 42 }}
                dpr={[1, 2]}
                gl={{
                  powerPreference: 'high-performance',
                  antialias: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
                }}
              >
                <Suspense fallback={null}>
                  <CameraRig />
                  <EnvironmentSetup />
                  <HeroPhoto />
                  <PhotoScene />
                  <DslrCamera />
                  <ParticleDust />
                  <PostProcessing />
                </Suspense>
              </Canvas>
            ) : (
              <div className="canvas-fallback" role="presentation" />
            )}
          </CanvasGuard>
        </div>
      </div>

      {/* NAVBAR: fixed premium bar — logo left, links top-right */}
      <Navbar />

      {/* COLOR SWAP: loader re-skinned to charcoal bg + champagne bar/text */}
      <Loader
        containerStyles={{ background: '#131313' }}
        innerStyles={{ width: '300px' }}
        barStyles={{ background: '#d4af37', height: '2px' }}
        dataStyles={{ color: '#d4af37', fontFamily: 'Cinzel, serif', fontSize: '14px', letterSpacing: '2px' }}
      />

      {/* Scroll container that holds 2D content sections — content-sized */}
      <div ref={scrollContainerRef} className="scroll-container">
        {/* A11Y: single main landmark + programmatic focus target for the skip link. */}
        <main id="main-content" tabIndex={-1} className="main-content">
          <Hero />
          <WordReveal />
          <Marquee />
          <Services />
          <Portfolio />
          <OurStory />
          <Process />
          <Testimonials />
          <RSVP />
          <Footer />
        </main>
      </div>
    </>
  );
}
