import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import './OurStory.css';

export default function OurStory() {
  return (
    <section className="section story-section content-layer" id="about" aria-labelledby="about-heading">
      <div className="story-container">
        {/* FIX (cheap 3D): 1.2s custom bezier — entrances glide instead of popping */}
        <motion.div 
          className="glass-panel story-card"
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Heart className="story-icon" size={40} />
          {/* PHOTOGRAPHER'S NOTES voice per the camera-narrator spec */}
          <h2 className="script-text" id="about-heading">We don't direct your day. We disappear into it.</h2>
          <div className="story-content">
            <p>
              Tucked into the heart of Karaikal, Venus Photo Studio And Lab has been
              the quiet keeper of the town's most treasured days. What began as a
              small family darkroom has grown into a full studio and lab — but the
              heart of the work hasn't changed: honest, beautiful photographs that
              feel like the moment itself.
            </p>
            <p>
              Today we offer complete wedding and family photography alongside
              professional video work, all handled in-house from first frame to
              final print. Every album we bind and every film we cut carries the
              same promise — your memories, crafted to last a lifetime.
            </p>
          </div>
          
          <div className="timeline">
            {/* CONTENT SWAP: couple milestones -> studio milestones (kept to 3 items to preserve layout) */}
            <div className="timeline-item">
              <span className="year">2009</span>
              <span className="event script-text">Studio Founded</span>
            </div>
            <div className="timeline-item">
              <span className="year">2016</span>
              <span className="event script-text">Lab Expanded</span>
            </div>
            <div className="timeline-item">
              <span className="year">2025</span>
              <span className="event script-text">1,000+ Reviews</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
