import { useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { useAppStore, setLenisInstance } from '../store';

import CameraRig from '../components/CameraRig';
import EnvironmentSetup from '../components/EnvironmentSetup';
import GalleryPlanes from '../components/GalleryPlanes';
import PostProcessing from '../components/PostProcessing';
import ParticleDust from '../components/ParticleDust';
import Navbar from '../components/Navbar';
import HeroShatteredGlass from '../components/HeroShatteredGlass';

import Hero from '../components/Hero';
import Services from '../components/Services';
import OurStory from '../components/OurStory';
import RSVP from '../components/RSVP';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const setScrollProgress = useAppStore((state) => state.setScrollProgress);
  const setIsMobile = useAppStore((state) => state.setIsMobile);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Lenis Smooth Scroll Setup — slow the glide so scroll feels like a dolly move, not a wheel flick
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
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

    return () => {
      window.removeEventListener('resize', handleResize);
      lenis.destroy();
      trigger.kill();
      setLenisInstance(null);
    };
  }, [setIsMobile, setScrollProgress]);

  return (
    <>
      <div className="canvas-container">
        {/* FIX (blur): dpr up to 2 so renders are not upsampled/soft; antialias on to kill edge jaggies;
            ACESFilmic gives filmic rolloff so highlights bloom gracefully instead of clipping into mush */}
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={[1, 2]}
          gl={{
            powerPreference: 'high-performance',
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
        >
          <Suspense fallback={null}>
            <HeroShatteredGlass />
            <CameraRig />
            <EnvironmentSetup />
            <GalleryPlanes />
            <ParticleDust />
            <PostProcessing />
          </Suspense>
        </Canvas>
      </div>

      {/* NAVBAR: fixed premium bar — logo left, links top-right */}
      <Navbar />

      {/* COLOR SWAP: loader re-skinned to sandal bg + maroon bar/text (was near-black + champagne) */}
      <Loader
        containerStyles={{ background: '#F1E6D8' }}
        innerStyles={{ width: '300px' }}
        barStyles={{ background: '#5C0A1E', height: '2px' }}
        dataStyles={{ color: '#5C0A1E', fontFamily: 'Cinzel, serif', fontSize: '14px', letterSpacing: '2px' }}
      />

      {/* Scroll container that holds 2D content sections — content-sized, no padded 100vh sections */}
      <div ref={scrollContainerRef} className="scroll-container">
        <Hero />
        <Services />
        <OurStory />
        <RSVP />
      </div>
    </>
  );
}
