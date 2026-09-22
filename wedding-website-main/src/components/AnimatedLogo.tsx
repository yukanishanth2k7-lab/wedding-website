import { useState, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export default function AnimatedLogo() {
  // A11Y: this component renders a <span>, not an <a> — the Navbar owns the one
  // real link that wraps it. (Nested anchors are invalid HTML and confuse AT.)
  const ref = useRef<HTMLSpanElement>(null);
  
  // Track mouse position relative to the logo center
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useSpring(0, { stiffness: 300, damping: 20 });
  const mouseY = useSpring(0, { stiffness: 300, damping: 20 });

  // Map mouse coordinates to 3D rotation angles
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    
    // Calculate mouse position relative to the center of the element (-0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Reset to center
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.span
      ref={ref}
      className="navbar-logo-animated"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'block',
        perspective: '1000px',
        textDecoration: 'none',
        zIndex: 100,
      }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '4px',
        }}
        animate={{
          scale: isHovered ? 1.05 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <img 
          src="/logo.png" 
          alt="Venus Photo Studio" 
          style={{ 
            height: '45px', // Adjust based on the actual PNG aspect ratio
            width: 'auto',
            display: 'block',
            filter: 'drop-shadow(0px 4px 8px rgba(92, 10, 30, 0.2))'
          }} 
        />
        
        {/* Dynamic glare overlay */}
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.7) 25%, transparent 30%)',
            opacity: isHovered ? 1 : 0,
            x: useTransform(mouseX, [-0.5, 0.5], ['-100%', '100%']),
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }}
        />
      </motion.div>
    </motion.span>
  );
}
