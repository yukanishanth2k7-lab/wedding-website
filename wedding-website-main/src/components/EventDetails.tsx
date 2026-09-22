import { motion } from 'framer-motion';
import { MapPin, Clock, Calendar } from 'lucide-react';
import './EventDetails.css';

export default function EventDetails() {
  return (
    <section className="section event-section content-layer" id="events">
      {/* CONTENT SWAP: "The Celebration" -> "Visit Our Studio" (contact/footer section) */}
      <h2 className="section-title script-text">Visit Our Studio</h2>
      
      <div className="event-cards">
        {/* FIX (cheap 3D): slow custom cubic-bezier, 1.1s */}
        <motion.div 
          className="glass-panel event-card"
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* CONTENT SWAP: "Welcome Dinner" card -> Address card */}
          <h3 className="card-title">Address</h3>
          
          <div className="detail-item">
            <Calendar className="detail-icon" size={20} />
            <span>Door No. 24</span>
          </div>
          
          <div className="detail-item">
            <Clock className="detail-icon" size={20} />
            <span>Kannadiyar St, Karaikal</span>
          </div>
          
          <div className="detail-item">
            <MapPin className="detail-icon" size={20} />
            <span>Puducherry 609602</span>
          </div>
          
          {/* CONTENT SWAP: dress code -> area label, same uppercase fine-print style */}
          <p className="dress-code">Karaikal, Puducherry</p>
        </motion.div>

        <motion.div 
          className="glass-panel event-card main-event"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* CONTENT SWAP: "The Wedding" card -> Phone card with tappable tel: link */}
          <h3 className="card-title">Call Us</h3>
          
          <div className="detail-item">
            <Calendar className="detail-icon" size={20} />
            <span>
              {/* CONTENT SWAP: phone as a tappable link, exactly as listed */}
              <a href="tel:+919894041125" className="phone-link">098940 41125</a>
            </span>
          </div>
          
          <div className="detail-item">
            <Clock className="detail-icon" size={20} />
            <span>Open Daily</span>
          </div>
          
          <div className="detail-item">
            <MapPin className="detail-icon" size={20} />
            <span>Closes 9 PM</span>
          </div>
          
          <p className="dress-code">Open Daily · Closes 9 PM</p>
        </motion.div>

        <motion.div 
          className="glass-panel event-card"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* CONTENT SWAP: "Farewell Brunch" card -> Hours card */}
          <h3 className="card-title">Hours</h3>
          
          <div className="detail-item">
            <Calendar className="detail-icon" size={20} />
            <span>Monday – Sunday</span>
          </div>
          
          <div className="detail-item">
            <Clock className="detail-icon" size={20} />
            <span>Open Daily</span>
          </div>
          
          <div className="detail-item">
            <MapPin className="detail-icon" size={20} />
            <span>Closes 9 PM</span>
          </div>
          
          <p className="dress-code">Walk-ins Welcome</p>
        </motion.div>
      </div>
    </section>
  );
}
