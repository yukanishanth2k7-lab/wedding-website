import { motion } from 'framer-motion';
import { Camera, Video, Image as ImageIcon } from 'lucide-react';
import './Services.css';

const services = [
  {
    id: 'photography',
    title: 'Photography',
    description: 'Timeless, elegant photography capturing the emotion and beauty of your special moments.',
    icon: Camera
  },
  {
    id: 'cinematography',
    title: 'Cinematography',
    description: 'Cinematic storytelling that brings your memories to life with stunning visuals.',
    icon: Video
  },
  {
    id: 'albums',
    title: 'Premium Albums',
    description: 'Exquisite, handcrafted albums designed to preserve your legacy for generations.',
    icon: ImageIcon
  }
];

export default function Services() {
  return (
    <section className="section services-section content-layer" id="services">
      <h2 className="section-title script-text">Our Services</h2>
      
      <div className="services-grid">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <motion.div 
              key={service.id}
              className="service-card glass-panel"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 1.1, delay: index * 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="service-icon">
                <Icon size={40} />
              </div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
