'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ContactCardProps {
  icon: string;
  label: string;
  primary: string;
  secondary?: string;
  accent: string;
}

const ContactCard = ({ icon, label, primary, secondary, accent }: ContactCardProps) => {
  const [tilt, setTilt] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 12;
    const y = ((e.clientY - top) / height - 0.5) * -12;
    setTilt(`perspective(600px) rotateX(${y}deg) rotateY(${x}deg) scale3d(1.02,1.02,1.02)`);
  };

  return (
    <div
      ref={cardRef}
      className="bec-contact-card"
      style={{ transform: tilt, '--accent-col': accent } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt('')}
    >
      <div className="bec-contact-card-inner">
        <div className="bec-contact-icon-wrap">
          <span className="bec-contact-icon">{icon}</span>
        </div>
        <div className="bec-contact-text">
          <p className="bec-contact-label">{label}</p>
          <p className="bec-contact-primary">{primary}</p>
          {secondary && <p className="bec-contact-secondary">{secondary}</p>}
        </div>
      </div>
    </div>
  );
};

const Contact = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Heading split-reveal
    gsap.fromTo(
      headingRef.current,
      { y: 60, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1.2, ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Cards stagger
    gsap.fromTo(
      '.bec-contact-card',
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.75, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: {
          trigger: cardsRef.current,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    // Image parallax
    gsap.fromTo(
      imgRef.current,
      { scale: 1.12 },
      {
        scale: 1, ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      }
    );
  }, { scope: sectionRef });

  const contactCards = [
    {
      icon: '🎓',
      label: 'Principal',
      primary: 'Dr. B. R. Hiremath',
      secondary: '+91 94489 39700',
      accent: '#b1c1ef',
    },
    {
      icon: '📧',
      label: 'Email',
      primary: 'principal@becbgk.edu',
      secondary: 'webdesign@becbgk.edu',
      accent: '#f2acac',
    },
    {
      icon: '📍',
      label: 'Address',
      primary: 'S. Nijalingappa Road, Vidyagiri',
      secondary: 'Bagalkote – 587102, Karnataka, India',
      accent: '#ffdd94',
    },
    {
      icon: '📞',
      label: 'General Enquiry',
      primary: '+91 7618781963',
      secondary: 'Mon – Sat  |  9 AM – 5 PM',
      accent: '#a8e6cf',
    },
    {
      icon: '✈️',
      label: 'By Flight',
      primary: 'Hubballi Airport — 122 km',
      secondary: 'Belagavi Airport — 130 km',
      accent: '#b1c1ef',
    },
    {
      icon: '🚆',
      label: 'By Train',
      primary: 'Bagalkote (BGK) Station — 5 km',
      secondary: 'Direct rail connectivity',
      accent: '#f2acac',
    },
  ];

  return (
    <div id="contact" className="bec-contact-section" ref={sectionRef}>
      {/* Ambient background image */}
      <div className="bec-contact-bg-img" ref={imgRef}>
        <img src="/img/entrance.webp" alt="BEC Entrance" />
      </div>

      {/* Noise texture */}
      <div className="bec-contact-noise" />

      {/* Glowy orbs */}
      <div className="bec-contact-orb bec-contact-orb-1" />
      <div className="bec-contact-orb bec-contact-orb-2" />

      {/* Main content */}
      <div className="bec-contact-inner">
        {/* Left: Heading + description */}
        <div className="bec-contact-left">
          <p className="bec-contact-eyebrow">Contact BEC</p>
          <h2 className="bec-contact-heading" ref={headingRef}>
            LET&apos;S<br />CONNECT<br />WITH <span>BEC</span>
          </h2>
          <p className="bec-contact-description">
            Basaveshwar Engineering College, Bagalkote — a pioneer of technical education in northern Karnataka
            since 1963. Reach us through any of the channels below.
          </p>
          <div className="bec-contact-links">
            <a className="bec-contact-link" href="https://www.becbgk.edu" target="_blank" rel="noopener noreferrer">
              ▶ Official Website
            </a>
            <a className="bec-contact-link" href="https://www.vtu.ac.in" target="_blank" rel="noopener noreferrer">
              ▶ VTU Website
            </a>
            <a className="bec-contact-link" href="https://www.aicte-india.org" target="_blank" rel="noopener noreferrer">
              ▶ AICTE Website
            </a>
            <a className="bec-contact-link" href="https://www.nirfindia.org" target="_blank" rel="noopener noreferrer">
              ▶ NIRF Ranking
            </a>
          </div>
        </div>

        {/* Right: Contact cards */}
        <div className="bec-contact-cards" ref={cardsRef}>
          {contactCards.map((card, i) => (
            <ContactCard key={i} {...card} />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bec-contact-bottom">
        <p className="bec-contact-footer-text">
          © 2025 Basaveshwar Engineering College, Bagalkote · All Rights Reserved
        </p>
        <a
          href="mailto:principal@becbgk.edu"
          className="bec-contact-cta"
        >
          ✉ Email Us →
        </a>
      </div>
    </div>
  );
};

export default Contact;