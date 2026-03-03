'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/all';
import AnimatedTitle from './AnimatedTitle';
import toast from 'react-hot-toast';

gsap.registerPlugin(ScrollTrigger);

interface LoginCardProps {
  cardId: string;
  number: string;
  role: string;
  color: string;
  textColor: string;
  delay: number;
}

const LoginCard = ({ cardId, number, role, color, textColor, delay }: LoginCardProps) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const isFlipped = useRef(false);

  const flipIn = () => {
    gsap.to(innerRef.current, {
      rotationY: 180,
      duration: 0.65,
      ease: 'power2.inOut',
    });
    isFlipped.current = true;
  };

  const flipOut = () => {
    gsap.to(innerRef.current, {
      rotationY: 0,
      duration: 0.55,
      ease: 'power2.inOut',
    });
    isFlipped.current = false;
  };

  const toggle = () => {
    if (isFlipped.current) flipOut();
    else flipIn();
  };

  return (
    <div
      className="bec-panel"
      id={cardId}
      style={{ animationDelay: `${delay}s` }}
      onMouseEnter={flipIn}
      onMouseLeave={flipOut}
      onClick={toggle}
    >
      {/* floating wrapper — matches juno-watts .card-wrapper */}
      <div className="bec-panel-wrapper">
        {/* 3-D flipper */}
        <div className="bec-panel-inner" ref={innerRef}>

          {/* ── FRONT ── */}
          <div className="bec-panel-front" style={{ backgroundColor: color }}>
            <div className="bec-panel-top-bar">
              <span className="bec-panel-num" style={{ color: textColor }}>{number}</span>
              <span className="bec-panel-tag" style={{ color: textColor }}>BEC Portal</span>
            </div>

            <div className="bec-panel-center">
              <div className="bec-panel-icon" style={{ borderColor: `${textColor}40` }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none"
                  stroke={textColor} strokeWidth="1.2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="bec-panel-role-text" style={{ color: textColor }}>
                {role}
              </div>
              <div className="bec-panel-hint" style={{ color: `${textColor}80` }}>
                hover to login ↗
              </div>
            </div>

            <div className="bec-panel-bottom-bar">
              <span className="bec-panel-num" style={{ color: textColor }}>{number}</span>
              <span className="bec-panel-tag" style={{ color: textColor }}>{role}</span>
            </div>
          </div>

          {/* ── BACK ── */}
          <div className="bec-panel-back" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="bec-panel-top-bar">
              <span className="bec-panel-num" style={{ color: '#0a0a0a' }}>{number}</span>
              <span className="bec-panel-tag" style={{ color: '#0a0a0a60' }}>BEC Portal</span>
            </div>

            <div className="bec-panel-login-form">
              <div className="bec-panel-role-badge" style={{ backgroundColor: color, color: textColor }}>
                {role} Login
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                toast.loading(`Authenticating as ${role}...`, { id: `login-${role}` });
                setTimeout(() => {
                  toast.success(`Welcome back, ${role}! Check OS for access.`, { id: `login-${role}` });
                }, 1500);
              }}>
                <div className="bec-form-field">
                  <label className="bec-form-label">Username / USN</label>
                  <input
                    type="text"
                    required
                    className="bec-form-input"
                    placeholder={
                      role === 'Principal' ? 'principal@becbgk.edu' :
                        role === 'Faculty' ? 'faculty@becbgk.edu' :
                          role === 'Officer' ? 'officer.id' : 'USN123456'
                    }
                  />
                </div>

                <div className="bec-form-field">
                  <label className="bec-form-label">Password</label>
                  <input type="password" required className="bec-form-input" placeholder="••••••••" />
                </div>

                <button
                  type="submit"
                  className="bec-form-submit"
                  style={{ backgroundColor: color, color: textColor }}
                >
                  Login → {role}
                </button>
              </form>

              <div className="bec-form-forgot">
                <a href="#">Forgot password?</a>
              </div>
            </div>

            <div className="bec-panel-bottom-bar">
              <span className="bec-panel-num" style={{ color: '#0a0a0a' }}>{number}</span>
              <span className="bec-panel-tag" style={{ color: '#0a0a0a60' }}>{role}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const About = () => {
  useGSAP(() => {
    gsap.fromTo(
      '.bec-panel',
      { y: '100vh', opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 1,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: '#about',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  });

  const cards: LoginCardProps[] = [
    { cardId: 'card-principal', number: '01', role: 'Principal', color: '#b1c1ef', textColor: '#0a0a0a', delay: 0 },
    { cardId: 'card-faculty', number: '02', role: 'Faculty', color: '#f2acac', textColor: '#0a0a0a', delay: 0.05 },
    { cardId: 'card-officer', number: '03', role: 'Officer', color: '#ffdd94', textColor: '#0a0a0a', delay: 0.1 },
    { cardId: 'card-student', number: '04', role: 'Student', color: '#a8e6cf', textColor: '#0a0a0a', delay: 0.15 },
  ];

  return (
    <div id="about">
      {/* Heading */}
      <div className="bec-about-header">
        <p className="bec-about-eyebrow">Welcome to BecBillDESK</p>
        <AnimatedTitle
          title="l<b>o</b>gin to the world's <br /> largest shared p<b>a</b>yment"
          containerClass="mt-3 !text-black text-center"
        />
      </div>

      {/* 4-panel card row */}
      <div className="bec-panels-row">
        {cards.map(card => (
          <LoginCard key={card.cardId} {...card} />
        ))}
      </div>
    </div>
  );
};

export default About;