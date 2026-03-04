'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/all';
import AnimatedTitle from './AnimatedTitle';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

gsap.registerPlugin(ScrollTrigger);

interface LoginCardProps {
  cardId: string;
  number: string;
  role: string;
  roleKey: string;
  color: string;
  textColor: string;
  delay: number;
  identifierLabel: string;
  identifierPlaceholder: string;
}

const LoginCard = ({ cardId, number, role, roleKey, color, textColor, delay, identifierLabel, identifierPlaceholder }: LoginCardProps) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const isFlipped = useRef(false);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const flipIn = () => {
    gsap.to(innerRef.current, {
      rotationY: 180,
      duration: 0.65,
      ease: 'power2.inOut',
    });
    isFlipped.current = true;
  };

  const flipOut = () => {
    if (isSubmitting) return; // Don't flip out while submitting
    gsap.to(innerRef.current, {
      rotationY: 0,
      duration: 0.55,
      ease: 'power2.inOut',
    });
    isFlipped.current = false;
  };

  const toggle = () => {
    if (isSubmitting) return;
    if (isFlipped.current) flipOut();
    else flipIn();
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const identifier = formData.get('identifier') as string;
    const password = formData.get('password') as string;

    if (!identifier || !password) {
      toast.error('Please fill all fields');
      return;
    }

    setIsSubmitting(true);
    toast.loading(`Authenticating as ${role}...`, { id: `login-${roleKey}` });

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Invalid credentials', { id: `login-${roleKey}` });
        setIsSubmitting(false);
        return;
      }

      // Store role info for the OS to use
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bec-vortex-role', data.userType === 'staff' ? data.user?.role : 'STUDENT');
        sessionStorage.setItem('bec-vortex-department', data.userType === 'staff' ? (data.user?.department || '') : '');
        sessionStorage.setItem('bec-vortex-userType', data.userType);
        sessionStorage.setItem('bec-vortex-fullName', data.userType === 'staff' ? data.user?.fullName : data.user?.name || '');
        sessionStorage.setItem('bec-vortex-username', data.userType === 'staff' ? data.user?.username : data.user?.usn || '');
      }

      toast.success(`Welcome, ${data.userType === 'staff' ? data.user?.fullName : data.user?.name}!`, { id: `login-${roleKey}` });

      // Redirect to OS
      setTimeout(() => {
        router.push('/os');
      }, 800);

    } catch (err) {
      toast.error('Network error. Please try again.', { id: `login-${roleKey}` });
      setIsSubmitting(false);
    }
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

              <form onSubmit={handleLogin} onClick={(e) => e.stopPropagation()}>
                <div className="bec-form-field">
                  <label className="bec-form-label">{identifierLabel}</label>
                  <input
                    name="identifier"
                    type="text"
                    required
                    className="bec-form-input"
                    placeholder={identifierPlaceholder}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="bec-form-field">
                  <label className="bec-form-label">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="bec-form-input"
                    placeholder="••••••••"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => e.stopPropagation()}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bec-form-submit"
                  style={{ backgroundColor: color, color: textColor, opacity: isSubmitting ? 0.6 : 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isSubmitting ? 'Logging in...' : `Login → ${role}`}
                </button>
              </form>

              <div className="bec-form-forgot">
                <a href="#" onClick={(e) => e.stopPropagation()}>Forgot password?</a>
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
    { cardId: 'card-master', number: '01', role: 'Master', roleKey: 'MASTER', color: '#e8b4b8', textColor: '#0a0a0a', delay: 0, identifierLabel: 'Username', identifierPlaceholder: 'becvortex' },
    { cardId: 'card-principal', number: '02', role: 'Principal', roleKey: 'PRINCIPAL', color: '#b1c1ef', textColor: '#0a0a0a', delay: 0.05, identifierLabel: 'Username', identifierPlaceholder: 'principal' },
    { cardId: 'card-hod', number: '03', role: 'HOD', roleKey: 'HOD', color: '#c4b5e0', textColor: '#0a0a0a', delay: 0.1, identifierLabel: 'Username', identifierPlaceholder: 'hod.cs' },
    { cardId: 'card-faculty', number: '04', role: 'Faculty', roleKey: 'FACULTY', color: '#f2acac', textColor: '#0a0a0a', delay: 0.15, identifierLabel: 'Username', identifierPlaceholder: 'faculty@becbgk.edu' },
    { cardId: 'card-officer', number: '05', role: 'Officer', roleKey: 'OFFICER', color: '#ffdd94', textColor: '#0a0a0a', delay: 0.2, identifierLabel: 'Username', identifierPlaceholder: 'officer.id' },
    { cardId: 'card-student', number: '06', role: 'Student', roleKey: 'STUDENT', color: '#a8e6cf', textColor: '#0a0a0a', delay: 0.25, identifierLabel: 'USN / Email', identifierPlaceholder: 'USN123456' },
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

      {/* 6-panel card row */}
      <div className="bec-panels-row">
        {cards.map(card => (
          <LoginCard key={card.cardId} {...card} />
        ))}
      </div>
    </div>
  );
};

export default About;