import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import './RSVP.css';

export default function RSVP() {
  return (
    <section className="section rsvp-section content-layer" id="contact">
      {/* FIX (cheap 3D): 1.2s custom bezier to match the rest of the page */}
      <motion.div 
        className="glass-panel rsvp-container"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* CONTENT SWAP: RSVP heading -> studio booking inquiry heading */}
        <h2 className="script-text title">Book Your Sitting</h2>
        {/* CONTENT SWAP: RSVP deadline -> studio tagline echo in the fine-print style */}
        <p className="subtitle">Venus Photo Studio And Lab · Karaikal</p>
        
        <form className="rsvp-form" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            {/* CONTENT SWAP: guest fields -> inquiry fields */}
            <input type="text" id="name" placeholder="Your Name" required />
          </div>
          
          <div className="form-group">
            <input type="email" id="email" placeholder="Email Address" required />
          </div>
          
          <div className="form-group">
            {/* CONTENT SWAP: attendance select -> service select */}
            <select id="attendance" required defaultValue="">
              <option value="" disabled>What do you need?</option>
              <option value="wedding">Wedding Photography</option>
              <option value="family">Family Photography</option>
              <option value="video">Video Work</option>
            </select>
          </div>
          
          <div className="form-group">
            {/* CONTENT SWAP: guest count -> preferred date */}
            <input type="text" id="guests" placeholder="Preferred Date (optional)" />
          </div>
          
          <div className="form-group">
            {/* CONTENT SWAP: dietary notes -> message */}
            <textarea id="dietary" placeholder="Tell us about your day" rows={3}></textarea>
          </div>
          
          <button type="submit" className="btn-primary submit-btn">
            {/* CONTENT SWAP: "Send RSVP" -> "Send Inquiry" */}
            Send Inquiry <Send size={18} />
          </button>
        </form>
      </motion.div>
    </section>
  );
}
