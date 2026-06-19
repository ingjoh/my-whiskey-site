'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeConfig } from '@/store/useBuilderStore';

export default function ContactFormClient({ settings, theme }: { settings: any; theme?: ThemeConfig }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage('Failed to send message. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactEmail = settings?.contact?.email || 'bookings@motoryachtwhiskey.com';
  const contactPhone = settings?.contact?.phone || '(850) 555-0199';
  const contactAddress = settings?.contact?.address || 'Destin Harbor, Destin, FL 32541';

  return (
    <section style={{
      padding: '8rem 2rem 6rem 2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '3rem',
      flex: 1
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .contact-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
          gap: 4rem;
          align-items: start;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: white;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
        }
        .form-input:focus {
          border-color: var(--color-primary);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 10px rgba(185, 120, 59, 0.15);
        }
        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 1.5rem;
          borderRadius: 8px;
        }
        @media (max-width: 992px) {
          .contact-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 3rem !important;
          }
        }
      ` }} />

      <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 1rem 0' }}>
          Contact Concierge
        </h1>
        <p style={{ color: 'var(--color-muted)', opacity: 0.8, fontSize: '1.05rem', lineHeight: '1.6' }}>
          Have questions about chartering M/Y Whiskey, our custom itineraries, or reservations? Complete the form below and our staff will respond promptly.
        </p>
      </div>

      <div className="contact-grid">
        {/* Left Side: Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, margin: 0, color: 'white' }}>
            Inquiry Information
          </h2>
          
          <p style={{ fontSize: '0.95rem', color: 'var(--color-muted)', lineHeight: '1.6', margin: 0, opacity: 0.85 }}>
            Our reservation concierge is available 7 days a week to help plan your ultimate Gulf Coast excursion. We specialize in premium day charters, sunset events, and overnight bookings.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
            <div className="info-card">
              <Phone size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0', color: 'var(--color-muted)', opacity: 0.6 }}>Phone Number</h3>
                <a href={`tel:${contactPhone}`} style={{ color: 'white', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' }}>{contactPhone}</a>
              </div>
            </div>

            <div className="info-card">
              <Mail size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0', color: 'var(--color-muted)', opacity: 0.6 }}>Email Address</h3>
                <a href={`mailto:${contactEmail}`} style={{ color: 'white', fontWeight: 600, textDecoration: 'none', fontSize: '1rem', wordBreak: 'break-all' }}>{contactEmail}</a>
              </div>
            </div>

            <div className="info-card">
              <MapPin size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0', color: 'var(--color-muted)', opacity: 0.6 }}>Base Port / Dock</h3>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '1rem', whiteSpace: 'pre-line', lineHeight: '1.4' }}>{contactAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: The Contact Form */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '2.5rem',
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)'
        }}>
          {status === 'success' ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '2rem 0',
              gap: '1rem'
            }}>
              <CheckCircle2 size={56} style={{ color: 'var(--color-primary)' }} />
              <h3 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, color: 'white' }}>
                Message Dispatched
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0, opacity: 0.85 }}>
                Thank you for reaching out. Your inquiry has been forwarded to our reservations desk. A concierge member will review your message and contact you shortly.
              </p>
              <button
                onClick={() => setStatus(null)}
                style={{
                  marginTop: '1rem',
                  background: 'transparent',
                  border: '1px solid var(--color-primary)',
                  color: 'var(--color-primary)',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(185, 120, 59, 0.08)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {status === 'error' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  padding: '1rem',
                  color: '#f87171',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', opacity: 0.8 }}>
                  Full Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', opacity: 0.8 }}>
                    Email Address <span style={{ color: 'var(--color-primary)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', opacity: 0.8 }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', opacity: 0.8 }}>
                  Subject <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Charter Inquiry / Booking Question"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', opacity: 0.8 }}>
                  Message Details <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell us about your planned voyage or questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical', minHeight: '120px' }}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '1rem',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  marginTop: '0.5rem'
                }}
                onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = '0.9'; }}
                onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.opacity = '1'; }}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'} <Send size={16} />
              </button>

            </form>
          )}
        </div>
      </div>
    </section>
  );
}
