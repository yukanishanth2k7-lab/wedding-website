import { useState, useRef, useEffect, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Check } from 'lucide-react';
import { usePrefersReducedMotion } from '../store';
import './RSVP.css';

type Status = 'idle' | 'sent';

export default function RSVP() {
  const [status, setStatus] = useState<Status>('idle');
  const prefersReducedMotion = usePrefersReducedMotion();
  const successRef = useRef<HTMLDivElement>(null);

  // A11Y: when the form swaps to the confirmation, move focus onto it so AT
  // users hear the result immediately instead of sitting on a removed form.
  useEffect(() => {
    if (status === 'sent') successRef.current?.focus();
  }, [status]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // No backend wired up yet — acknowledge inline so the action has a visible,
    // announced result instead of a silent no-op.
    setStatus('sent');
  };

  const reset = () => setStatus('idle');

  // Field metadata keeps the JSX declarative: label, id, autocomplete token, input type.
  const fields = [
    { id: 'name', label: 'Your Name', type: 'text', autoComplete: 'name', required: true, placeholder: 'Your Name' },
    { id: 'email', label: 'Email Address', type: 'email', autoComplete: 'email', required: true, placeholder: 'Email Address' },
    { id: 'date', label: 'Preferred Date (optional)', type: 'date', autoComplete: 'off', required: false, placeholder: '' },
  ] as const;

  return (
    <section className="section rsvp-section content-layer" id="contact" aria-labelledby="rsvp-heading">
      {/* FIX (cheap 3D): 1.2s custom bezier to match the rest of the page */}
      <motion.div
        className="glass-panel rsvp-container"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* SIGNATURE MOMENT caption: the form IS the next frame in the roll */}
        <h2 className="script-text title" id="rsvp-heading">This could be your frame.</h2>
        <p className="subtitle">Next frame in the roll · Venus Photo Studio And Lab · Karaikal</p>

        {status === 'sent' ? (
          <motion.div
            className="rsvp-success"
            role="status"
            ref={successRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Check size={40} aria-hidden="true" />
            <h3>Thank you!</h3>
            <p>Your inquiry has been noted. We'll reach out shortly to talk about your day.</p>
            <button type="button" className="btn-outline-dark" onClick={reset}>
              Send another inquiry
            </button>
          </motion.div>
        ) : (
          <form className="rsvp-form" onSubmit={handleSubmit}>
            {fields.map(({ id, label, type, autoComplete, required, placeholder }) => (
              <div className="form-group" key={id}>
                <label htmlFor={id}>{label}</label>
                <input
                  type={type}
                  id={id}
                  name={id}
                  autoComplete={autoComplete}
                  required={required}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div className="form-group">
              <label htmlFor="service">What do you need?</label>
              <select id="service" name="service" required defaultValue="">
                <option value="" disabled>
                  Select a service
                </option>
                <option value="wedding">Wedding Photography</option>
                <option value="family">Family Photography</option>
                <option value="video">Video Work</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">Tell us about your day</label>
              <textarea id="message" name="message" rows={3} placeholder="Tell us about your day" />
            </div>

            {/* A11Y: aria-describedby ties helper text to the control for AT users. */}
            <p className="form-hint" id="rsvp-hint">
              We reply within two working days. Your details are never shared.
            </p>

            <button type="submit" className="btn-primary submit-btn" aria-describedby="rsvp-hint">
              Send Inquiry <Send size={18} aria-hidden="true" />
            </button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
