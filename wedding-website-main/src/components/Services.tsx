import { motion } from 'framer-motion';
import { Camera, Video, Image as ImageIcon } from 'lucide-react';
import './Services.css';

const services = [
  {
    id: 'photography',
    title: 'Photography',
    description: 'Timeless, elegant photography capturing the emotion and beauty of your special moments.',
    icon: Camera,
    specs: [
      { k: 'Coverage', v: 'Full day' },
      { k: 'Delivery', v: '300+ edits' },
      { k: 'Style', v: 'Candid + traditional' },
    ],
  },
  {
    id: 'cinematography',
    title: 'Cinematography',
    description: 'Cinematic storytelling that brings your memories to life with stunning visuals.',
    icon: Video,
    specs: [
      { k: 'Format', v: '4K cinema' },
      { k: 'Audio', v: 'Live + lapel' },
      { k: 'Cut', v: 'Feature + teaser' },
    ],
  },
  {
    id: 'albums',
    title: 'Premium Albums',
    description: 'Exquisite, handcrafted albums designed to preserve your legacy for generations.',
    icon: ImageIcon,
    specs: [
      { k: 'Binding', v: 'Lay-flat' },
      { k: 'Paper', v: 'Museum grade' },
      { k: 'Cover', v: 'Handtooled' },
    ],
  },
];

export default function Services() {
  return (
    <section className="section services-section content-layer" id="services" aria-labelledby="services-heading">
      <h2 className="section-title script-text" id="services-heading">One camera. Every angle of your story.</h2>
      
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
              {/* ORYZO SPEC-SHEET: the deadpan readout rows under each card —
                  key/value pairs with a dotted leader, like a product datasheet. */}
              <dl className="service-specs">
                {service.specs.map((s) => (
                  <div className="service-spec-row" key={s.k}>
                    <dt>{s.k}</dt>
                    <dd>{s.v}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
