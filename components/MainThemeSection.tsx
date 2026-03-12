'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const OUTRO_ROWS = [
  ['Role-Based Access', 'Student Portal', 'Staff Console', 'Secure Sessions', 'Audit Trails', 'Hierarchy'],
  ['Admissions', 'USN Verification', 'Registration Requests', 'Approvals'],
  ['BillDesk', 'UPI', 'Net Banking', 'Cash Verification', 'Crypto Payments', 'Receipts', 'Custom Fees'],
  ['Grades', 'CIE Upload', 'SEE Records', 'Attendance Sync'],
  ['BEC Chat', 'Realtime Presence', 'Global Rooms', 'Private Threads', 'Faculty Channels', 'Announcements'],
  ['VORA AI', 'ARIA Voice', 'Vision OCR', 'LiveKit', 'Deepgram', 'Cerebras', 'Cartesia'],
];

const MainThemeSection = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const smoothStep = (p: number) => p * p * (3 - 2 * p);

      gsap.set(root.querySelectorAll('.ma-hero .ma-hero-cards .ma-hero-card'), { transformOrigin: 'center center' });

      gsap.to(root.querySelectorAll('.ma-hero .ma-hero-cards .ma-hero-card'), {
        scale: 1,
        duration: 0.75,
        delay: 0.25,
        stagger: 0.1,
        ease: 'power4.out',
        onComplete: () => {
          gsap.set(root.querySelector('#ma-hero-card-1'), { transformOrigin: 'top right' });
          gsap.set(root.querySelector('#ma-hero-card-3'), { transformOrigin: 'top left' });
        },
      });

      if (window.innerWidth > 1000) {
        ScrollTrigger.create({
          id: 'ma-hero-scroll',
          trigger: root.querySelector('.ma-hero'),
          start: 'top top',
          end: '75% top',
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            const heroCardsContainerOpacity = gsap.utils.interpolate(1, 0.5, smoothStep(progress));

            gsap.set(root.querySelector('.ma-hero-cards'), { opacity: heroCardsContainerOpacity });

            ['#ma-hero-card-1', '#ma-hero-card-2', '#ma-hero-card-3'].forEach((cardId, index) => {
              const delay = index * 0.9;
              const cardProgress = gsap.utils.clamp(0, 1, (progress - delay * 0.1) / (1 - delay * 0.1));

              const y = gsap.utils.interpolate('0%', '400%', smoothStep(cardProgress));
              const scale = gsap.utils.interpolate(1, 0.75, smoothStep(cardProgress));

              let x = '0%';
              let rotation = 0;

              if (index === 0) {
                x = gsap.utils.interpolate('0%', '90%', smoothStep(cardProgress));
                rotation = gsap.utils.interpolate(0, -15, smoothStep(cardProgress));
              } else if (index === 2) {
                x = gsap.utils.interpolate('0%', '-90%', smoothStep(cardProgress));
                rotation = gsap.utils.interpolate(0, 15, smoothStep(cardProgress));
              }

              gsap.set(root.querySelector(cardId), {
                y,
                x,
                rotation,
                scale,
              });
            });
          },
        });
      }

      if (window.innerWidth > 1000) {
        ScrollTrigger.create({
          id: 'ma-services-pin',
          trigger: root.querySelector('.ma-home-services'),
          start: 'top top',
          end: `+=${window.innerHeight * 4}px`,
          pin: root.querySelector('.ma-home-services') as Element,
          pinSpacing: true,
        });

        ScrollTrigger.create({
          id: 'ma-services-cards',
          trigger: root.querySelector('.ma-home-services'),
          start: 'top bottom',
          end: `+=${window.innerHeight * 4}`,
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;

            const headerProgress = gsap.utils.clamp(0, 1, progress / 0.9);
            const headerY = gsap.utils.interpolate('300%', '0%', smoothStep(headerProgress));
            gsap.set(root.querySelector('.ma-home-services-header'), { y: headerY });

            ['#ma-card-1', '#ma-card-2', '#ma-card-3'].forEach((cardId, index) => {
              const delay = index * 0.5;
              const cardProgress = gsap.utils.clamp(0, 1, (progress - delay * 0.1) / (0.9 - delay * 0.1));

              const innerCard = root.querySelector(`${cardId} .ma-flip-card-inner`);
              if (!innerCard) return;

              let y: string;
              if (cardProgress < 0.4) {
                const normalizedProgress = cardProgress / 0.4;
                y = gsap.utils.interpolate('-100%', '50%', smoothStep(normalizedProgress));
              } else if (cardProgress < 0.6) {
                const normalizedProgress = (cardProgress - 0.4) / 0.2;
                y = gsap.utils.interpolate('50%', '0%', smoothStep(normalizedProgress));
              } else {
                y = '0%';
              }

              let scale: number;
              if (cardProgress < 0.4) {
                const normalizedProgress = cardProgress / 0.4;
                scale = gsap.utils.interpolate(0.25, 0.75, smoothStep(normalizedProgress));
              } else if (cardProgress < 0.6) {
                const normalizedProgress = (cardProgress - 0.4) / 0.2;
                scale = gsap.utils.interpolate(0.75, 1, smoothStep(normalizedProgress));
              } else {
                scale = 1;
              }

              const opacity = cardProgress < 0.2 ? smoothStep(cardProgress / 0.2) : 1;

              let x: string;
              let rotate: number;
              let rotationY: number;

              if (cardProgress < 0.6) {
                x = index === 0 ? '100%' : index === 1 ? '0%' : '-100%';
                rotate = index === 0 ? -5 : index === 1 ? 0 : 5;
                rotationY = 0;
              } else if (cardProgress < 1) {
                const normalizedProgress = (cardProgress - 0.6) / 0.4;
                x = gsap.utils.interpolate(index === 0 ? '100%' : index === 1 ? '0%' : '-100%', '0%', smoothStep(normalizedProgress));
                rotate = gsap.utils.interpolate(index === 0 ? -5 : index === 1 ? 0 : 5, 0, smoothStep(normalizedProgress));
                rotationY = smoothStep(normalizedProgress) * 180;
              } else {
                x = '0%';
                rotate = 0;
                rotationY = 180;
              }

              gsap.set(root.querySelector(cardId), {
                opacity,
                y,
                x,
                rotate,
                scale,
              });

              gsap.set(innerCard, { rotationY });
            });
          },
        });
      }

      const spotlightImages = root.querySelector('.ma-home-spotlight-images') as HTMLElement | null;
      if (spotlightImages) {
        const containerHeight = spotlightImages.offsetHeight;
        const viewportHeight = window.innerHeight;
        const initialOffset = containerHeight * 0.05;
        const totalMovement = containerHeight + initialOffset + viewportHeight;

        ScrollTrigger.create({
          id: 'ma-spotlight-pin',
          trigger: root.querySelector('.ma-home-spotlight'),
          start: 'top top',
          end: `+=${window.innerHeight * 7}px`,
          pin: true,
          pinSpacing: true,
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;

            if (progress <= 0.5) {
              const animationProgress = progress / 0.5;
              const startY = 5;
              const endY = -(totalMovement / containerHeight) * 100;
              const currentY = startY + (endY - startY) * animationProgress;
              gsap.set(spotlightImages, { y: `${currentY}%` });
            }

            const maskContainer = root.querySelector('.ma-spotlight-mask-image-container') as HTMLElement | null;
            const maskImage = root.querySelector('.ma-spotlight-mask-image') as HTMLElement | null;

            if (maskContainer && maskImage) {
              if (progress >= 0.25 && progress <= 0.75) {
                const maskProgress = (progress - 0.25) / 0.5;
                const maskSize = `${maskProgress * 475}%`;
                const imageScale = 1.25 - maskProgress * 0.25;

                maskContainer.style.setProperty('-webkit-mask-size', maskSize);
                maskContainer.style.setProperty('mask-size', maskSize);
                gsap.set(maskImage, { scale: imageScale });
              } else if (progress < 0.25) {
                maskContainer.style.setProperty('-webkit-mask-size', '0%');
                maskContainer.style.setProperty('mask-size', '0%');
                gsap.set(maskImage, { scale: 1.25 });
              } else if (progress > 0.75) {
                maskContainer.style.setProperty('-webkit-mask-size', '475%');
                maskContainer.style.setProperty('mask-size', '475%');
                gsap.set(maskImage, { scale: 1 });
              }
            }
          },
        });
      }

      const outroStrips = root.querySelectorAll('.ma-outro-strip');
      const stripSpeeds = [0.3, 0.4, 0.25, 0.35, 0.2, 0.25];

      ScrollTrigger.create({
        id: 'ma-outro-pin',
        trigger: root.querySelector('.ma-outro'),
        start: 'top top',
        end: `+=${window.innerHeight * 3}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
      });

      ScrollTrigger.create({
        id: 'ma-outro-strips',
        trigger: root.querySelector('.ma-outro'),
        start: 'top bottom',
        end: `+=${window.innerHeight * 6}px`,
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          outroStrips.forEach((strip, index) => {
            const speed = stripSpeeds[index] ?? 0.2;
            gsap.set(strip, { x: `${progress * 100 * speed}%` });
          });
        },
      });

      return () => {
        ScrollTrigger.getAll().forEach((trigger) => {
          const id = String(trigger.vars.id || '');
          if (id.startsWith('ma-')) {
            trigger.kill();
          }
        });
      };
    },
    { scope: rootRef }
  );

  return (
    <section ref={rootRef} className="ma-root" aria-label="BEC Vortex main animation theme">
      <section className="ma-hero">
        <div className="ma-home-services-top-bar">
          <div className="ma-container">
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s1-dark.png" alt="Symbol" /></div>
            </div>
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s1-dark.png" alt="Symbol" /></div>
            </div>
          </div>
        </div>

        <div className="ma-container">
          <div className="ma-hero-content">
            <div className="ma-hero-header">
              <h1>BEC Vortex</h1>
            </div>

            <div className="ma-hero-footer">
              <div className="ma-hero-footer-copy">
                <p className="ma-md">
                  BEC Vortex is a campus operating system for Basaveshwar Engineering College.
                  It unifies admissions, role-based access, fee payments, grades, attendance, realtime chat,
                  and AI assistants in one desktop-style workflow.
                </p>
              </div>

              <div className="ma-hero-footer-tags">
                <p className="ma-mono"><span>&#9654;</span> Campus OS Core</p>
                <p className="ma-mono"><span>&#9654;</span> AI + Fees + Academics</p>
              </div>
            </div>
          </div>

          <div className="ma-hero-cards">
            <div className="ma-hero-card" id="ma-hero-card-1">
              <div className="ma-hero-card-inner">
                <div className="ma-card-title"><p className="ma-mono">Govern</p><p className="ma-mono">01</p></div>
                <div className="ma-card-title"><p className="ma-mono">01</p><p className="ma-mono">Govern</p></div>
              </div>
            </div>
            <div className="ma-hero-card" id="ma-hero-card-2">
              <div className="ma-hero-card-inner">
                <div className="ma-card-title"><p className="ma-mono">Operate</p><p className="ma-mono">02</p></div>
                <div className="ma-card-title"><p className="ma-mono">02</p><p className="ma-mono">Operate</p></div>
              </div>
            </div>
            <div className="ma-hero-card" id="ma-hero-card-3">
              <div className="ma-hero-card-inner">
                <div className="ma-card-title"><p className="ma-mono">Amplify</p><p className="ma-mono">03</p></div>
                <div className="ma-card-title"><p className="ma-mono">03</p><p className="ma-mono">Amplify</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ma-home-about">
        <div className="ma-container">
          <div className="ma-home-about-col">
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s2-light.png" alt="symbol" /></div>
            </div>
            <div className="ma-home-about-header">
              <p className="ma-mono"><span>&#9654;</span> BEC Vortex Capability Matrix</p>
              <h3>One OS for Every Campus Workflow</h3>
            </div>
          </div>
          <div className="ma-home-about-col">
            <div className="ma-home-about-col-row">
              <div className="ma-home-about-card">
                <p className="ma-mono">[ Layer 01 ]</p>
                <h4>Identity & Access</h4>
              </div>
              <div className="ma-home-about-card">
                <p className="ma-mono">[ Layer 02 ]</p>
                <h4>Academic Engine</h4>
              </div>
            </div>
            <div className="ma-home-about-col-row">
              <div className="ma-home-about-card">
                <p className="ma-mono">[ Layer 03 ]</p>
                <h4>BillDesk Payments</h4>
              </div>
              <div className="ma-home-about-card">
                <p className="ma-mono">[ Layer 04 ]</p>
                <h4>VORA / ARIA AI</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ma-home-services">
        <div className="ma-container">
          <div className="ma-home-services-header">
            <p className="ma-md">From first-year onboarding to final-semester records, every operation stays synchronized</p>
          </div>
        </div>
        <div className="ma-home-services-top-bar">
          <div className="ma-container">
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s1-dark.png" alt="Symbol" /></div>
              <div className="ma-symbol"><img src="/symbols/s3-dark.png" alt="Symbol" /></div>
            </div>
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s3-dark.png" alt="Symbol" /></div>
              <div className="ma-symbol"><img src="/symbols/s1-dark.png" alt="Symbol" /></div>
            </div>
          </div>
        </div>
        <div className="ma-home-services-bottom-bar">
          <div className="ma-container">
            <p className="ma-mono"><span>&#9654;</span> Operational stack</p>
            <p className="ma-mono">[ Auth • Fees • Grades • Chat • Voice • OCR ]</p>
          </div>
        </div>
        <div className="ma-cards">
          <div className="ma-cards-container">
            <div className="ma-card" id="ma-card-1">
              <div className="ma-card-wrapper">
                <div className="ma-flip-card-inner">
                  <div className="ma-flip-card-front">
                    <div className="ma-card-title"><p className="ma-mono">Govern</p><p className="ma-mono">01</p></div>
                    <div className="ma-card-title"><p className="ma-mono">01</p><p className="ma-mono">Govern</p></div>
                  </div>
                  <div className="ma-flip-card-back">
                    <div className="ma-card-title"><p className="ma-mono">Govern</p><p className="ma-mono">01</p></div>
                    <div className="ma-card-copy">
                      <p>Role Hierarchy</p><p>JWT Sessions</p><p>Secure Passwords</p><p>Audit Logging</p><p>Department RBAC</p><p>Account Provisioning</p>
                    </div>
                    <div className="ma-card-title"><p className="ma-mono">01</p><p className="ma-mono">Govern</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="ma-card" id="ma-card-2">
              <div className="ma-card-wrapper">
                <div className="ma-flip-card-inner">
                  <div className="ma-flip-card-front">
                    <div className="ma-card-title"><p className="ma-mono">Operate</p><p className="ma-mono">02</p></div>
                    <div className="ma-card-title"><p className="ma-mono">02</p><p className="ma-mono">Operate</p></div>
                  </div>
                  <div className="ma-flip-card-back">
                    <div className="ma-card-title"><p className="ma-mono">Operate</p><p className="ma-mono">02</p></div>
                    <div className="ma-card-copy">
                      <p>Fee Collection</p><p>Attendance</p><p>Marks Upload</p><p>Subject Mapping</p><p>Registration Requests</p><p>Receipts & History</p>
                    </div>
                    <div className="ma-card-title"><p className="ma-mono">02</p><p className="ma-mono">Operate</p></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="ma-card" id="ma-card-3">
              <div className="ma-card-wrapper">
                <div className="ma-flip-card-inner">
                  <div className="ma-flip-card-front">
                    <div className="ma-card-title"><p className="ma-mono">Amplify</p><p className="ma-mono">03</p></div>
                    <div className="ma-card-title"><p className="ma-mono">03</p><p className="ma-mono">Amplify</p></div>
                  </div>
                  <div className="ma-flip-card-back">
                    <div className="ma-card-title"><p className="ma-mono">Amplify</p><p className="ma-mono">03</p></div>
                    <div className="ma-card-copy">
                      <p>VORA Assistant</p><p>ARIA Voice Agent</p><p>Vision OCR</p><p>Socket.IO Chat</p><p>Live Notifications</p><p>Desktop OS UX</p>
                    </div>
                    <div className="ma-card-title"><p className="ma-mono">03</p><p className="ma-mono">Amplify</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ma-home-spotlight">
        <div className="ma-home-spotlight-top-bar">
          <div className="ma-container">
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s1-light.png" alt="Symbol" /></div>
              <div className="ma-symbol"><img src="/symbols/s2-light.png" alt="Symbol" /></div>
              <div className="ma-symbol"><img src="/symbols/s3-light.png" alt="Symbol" /></div>
            </div>
            <div className="ma-symbols-container">
              <div className="ma-symbol"><img src="/symbols/s3-light.png" alt="Symbol" /></div>
              <div className="ma-symbol"><img src="/symbols/s2-light.png" alt="Symbol" /></div>
              <div className="ma-symbol"><img src="/symbols/s1-light.png" alt="Symbol" /></div>
            </div>
          </div>
        </div>
        <div className="ma-home-spotlight-bottom-bar">
          <div className="ma-container">
            <p className="ma-mono"><span>&#9654;</span> Live product surfaces</p>
            <p className="ma-mono">/ Payments • Chat • ARIA • VORA • Grades • Attendance</p>
          </div>
        </div>
        <div className="ma-container">
          <div className="ma-spotlight-intro-header">
            <h3>Built for Real Campus Load</h3>
          </div>
        </div>
        <div className="ma-home-spotlight-images">
          <div className="ma-home-spotlight-images-row">
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-1.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-2.jpg" alt="spotlight" /></div>
          </div>
          <div className="ma-home-spotlight-images-row">
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-3.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image" />
          </div>
          <div className="ma-home-spotlight-images-row">
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-4.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-5.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image" />
          </div>
          <div className="ma-home-spotlight-images-row">
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-6.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-7.jpg" alt="spotlight" /></div>
          </div>
          <div className="ma-home-spotlight-images-row">
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-8.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image" />
            <div className="ma-home-spotlight-image ma-image-holder"><img src="/spotlight-images/spotlight-img-9.jpg" alt="spotlight" /></div>
            <div className="ma-home-spotlight-image" />
          </div>
        </div>
        <div className="ma-spotlight-mask-image-container">
          <div className="ma-spotlight-mask-image">
            <img src="/spotlight-images/spotlight-banner.jpg" alt="spotlight banner" />
          </div>
          <div className="ma-container">
            <div className="ma-spotlight-mask-header">
              <h3>Role-Aware Desktop Workflows with Realtime Ops and AI Assistance</h3>
            </div>
          </div>
        </div>
      </section>

      <section className="ma-outro">
        <div className="ma-container"><h3>From Admission to Graduation, the Full Campus Lifecycle Runs in One OS</h3></div>
        <div className="ma-outro-strips">
          {OUTRO_ROWS.map((row, idx) => (
            <div key={`outro-${idx}`} className={`ma-outro-strip ma-os-${idx + 1}`}>
              {row.map((item, i) => (
                <div key={`${idx}-${i}`} className={`ma-skill ma-skill-var-${(i % 3) + 1}`}><p className="ma-mono">{item}</p></div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .ma-root {
          --ma-base-100: #f9f4eb;
          --ma-base-200: #efece5;
          --ma-base-300: #0a0a0a;
          --ma-base-secondary-dark: #686560;
          --ma-base-secondary-fade: rgba(249, 244, 235, 0.15);
          --ma-accent-1: #b1c1ef;
          --ma-accent-2: #f2acac;
          --ma-accent-3: #ffdd94;
          position: relative;
          width: 100%;
          background: var(--ma-base-100);
          color: var(--ma-base-300);
          overflow: hidden;
          font-family: 'Host Grotesk', 'general', sans-serif;
        }

        .ma-container {
          width: 100%;
          height: 100%;
          padding: 2.75rem;
          max-width: 2000px;
          margin: 0 auto;
        }

        .ma-root h3, .ma-root h4 {
          text-transform: uppercase;
          font-family: 'Barlow Condensed', 'Cossette Titre', 'zentry', sans-serif;
          font-weight: 900;
          line-height: 0.85;
          letter-spacing: -0.02rem;
        }

        .ma-root h3 { font-size: clamp(2.5rem, 6vw, 6rem); }
        .ma-root h4 { font-size: clamp(1.5rem, 2.5vw, 2.5rem); }

        .ma-root p { font-family: 'Host Grotesk', 'general', sans-serif; font-size: 1.1rem; }
        .ma-root p.ma-md { font-size: 1.3rem; }
        .ma-root p.ma-mono {
          text-transform: uppercase;
          font-family: 'DM Mono', monospace;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .ma-mono span { position: relative; top: -0.1rem; }

        .ma-symbols-container { display: flex; gap: 0.5rem; height: 1.125rem; z-index: 1; }
        .ma-symbol { width: 1.125rem; }

        .ma-home-about {
          position: relative;
          width: 100vw;
          min-height: 100svh;
          background-color: var(--ma-base-300);
          color: var(--ma-base-100);
          overflow: hidden;
        }

        .ma-home-about .ma-container { display: flex; gap: 2rem; }
        .ma-home-about .ma-home-about-col:nth-child(1) { flex: 4; }
        .ma-home-about .ma-home-about-col:nth-child(1) .ma-home-about-header {
          width: 90%; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; gap: 2rem; padding-bottom: 1rem;
        }
        .ma-home-about .ma-home-about-col:nth-child(2) {
          flex: 3; display: flex; flex-direction: column; justify-content: flex-end; gap: 2rem; width: 100%;
        }
        .ma-home-about-col-row { display: flex; flex: 1; gap: 2rem; width: 100%; }
        .ma-home-about-card {
          flex: 1; display: flex; flex-direction: column; justify-content: space-between; height: 100%; border: 1px dashed var(--ma-base-secondary-fade); border-radius: 16px; padding: 1.5rem;
        }
        .ma-home-about-card p.ma-mono { color: var(--ma-base-secondary-dark); }

        .ma-hero {
          position: relative;
          width: 100vw;
          height: 100svh;
          overflow: hidden;
        }

        .ma-hero .ma-hero-content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .ma-hero .ma-hero-header {
          width: 90%;
          margin: 0 auto;
          text-align: center;
          padding-top: 15svh;
        }

        .ma-hero .ma-hero-header h1 {
          font-size: 16vw;
          text-transform: uppercase;
          font-family: 'Barlow Condensed', 'Cossette Titre', 'zentry', sans-serif;
          font-weight: 900;
          line-height: 0.85;
          letter-spacing: -0.02rem;
        }

        .ma-hero .ma-hero-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          z-index: 2;
        }

        .ma-hero .ma-hero-footer-copy {
          width: 45%;
        }

        .ma-hero .ma-hero-footer-tags {
          display: flex;
          gap: 2rem;
        }

        .ma-hero-cards {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 35%;
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .ma-hero-cards .ma-hero-card {
          flex: 1;
          position: relative;
          aspect-ratio: 5/7;
          transform: scale(0);
        }

        .ma-hero-card-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          padding: 1rem;
          border-radius: 8px;
          animation: ma-floating 2s infinite ease-in-out;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        #ma-hero-card-1 .ma-hero-card-inner { animation-delay: 0; background-color: var(--ma-accent-1); }
        #ma-hero-card-2 .ma-hero-card-inner { animation-delay: 0.25s; background-color: var(--ma-accent-2); }
        #ma-hero-card-3 .ma-hero-card-inner { animation-delay: 0.5s; background-color: var(--ma-accent-3); }

        #ma-hero-card-1 { z-index: 2; }
        #ma-hero-card-2 { z-index: 1; }
        #ma-hero-card-3 { z-index: 0; }

        .ma-hero-cards .ma-hero-card p.ma-mono { font-size: 0.8rem; }

        .ma-home-services {
          position: relative; width: 100vw; height: 100svh; padding: 8rem 2rem; overflow: hidden;
        }
        .ma-home-services-top-bar, .ma-home-services-bottom-bar {
          position: absolute; left: 0; width: 100%;
        }
        .ma-home-services-top-bar { top: 0; }
        .ma-home-services-bottom-bar { bottom: 0; }
        .ma-home-services-top-bar .ma-container, .ma-home-services-bottom-bar .ma-container {
          display: flex; justify-content: space-between;
        }
        .ma-home-services-header { position: relative; width: 100%; text-align: center; transform: translateY(300%); will-change: transform; }

        .ma-cards {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100svh; display: flex; justify-content: center; z-index: -1; background-color: var(--ma-base-100);
        }
        .ma-cards-container {
          position: relative; width: 75%; height: 100%; margin-top: 4rem; display: flex; justify-content: center; align-items: center; gap: 4rem;
        }
        .ma-card { flex: 1; position: relative; aspect-ratio: 5/7; perspective: 1000px; }
        .ma-card-wrapper {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; animation: ma-floating 2s infinite ease-in-out;
        }
        @keyframes ma-floating {
          0% { transform: translate(-50%, -50%); }
          50% { transform: translate(-50%, -55%); }
          100% { transform: translate(-50%, -50%); }
        }
        #ma-card-1 .ma-card-wrapper { animation-delay: 0; }
        #ma-card-2 .ma-card-wrapper { animation-delay: 0.25s; }
        #ma-card-3 .ma-card-wrapper { animation-delay: 0.5s; }

        .ma-card-title { width: 100%; display: flex; justify-content: space-between; }
        .ma-card p.ma-mono { font-size: 0.8rem; }

        .ma-flip-card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; }
        .ma-flip-card-front, .ma-flip-card-back {
          position: absolute; width: 100%; height: 100%; border-radius: 8px; backface-visibility: hidden; overflow: hidden;
        }
        .ma-flip-card-front {
          padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; align-items: center;
        }
        #ma-card-1 .ma-flip-card-front { background-color: var(--ma-accent-1); }
        #ma-card-2 .ma-flip-card-front { background-color: var(--ma-accent-2); }
        #ma-card-3 .ma-flip-card-front { background-color: var(--ma-accent-3); }

        .ma-flip-card-back {
          padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; gap: 2rem; background-color: #fff; transform: rotateY(180deg);
        }
        .ma-card-copy {
          width: 100%; height: 100%; display: flex; flex-direction: column; gap: 0.5rem;
        }
        .ma-card-copy p {
          flex: 1; display: flex; justify-content: center; align-items: center; font-size: 1rem; background-color: var(--ma-base-200); border-radius: 8px;
        }

        .ma-cards #ma-card-1 { transform: translateX(100%) translateY(-100%) rotate(-5deg) scale(0.25); z-index: 2; }
        .ma-cards #ma-card-2 { transform: translateX(0%) translateY(-100%) rotate(0deg) scale(0.25); z-index: 1; }
        .ma-cards #ma-card-3 { transform: translateX(-100%) translateY(-100%) rotate(5deg) scale(0.25); z-index: 0; }
        .ma-cards .ma-cards-container .ma-card { opacity: 0; }

        .ma-home-spotlight {
          position: relative; width: 100vw; height: 100svh; background-color: var(--ma-base-300); color: var(--ma-base-100); overflow: hidden;
        }
        .ma-spotlight-intro-header {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 50%;
        }
        .ma-home-spotlight-images {
          position: absolute; top: 0; left: 0; width: 100vw; height: 300svh; display: flex; flex-direction: column; justify-content: space-between; transform: translateY(5%); will-change: transform; z-index: -1;
        }
        .ma-home-spotlight-images-row { width: 100%; padding: 2rem; display: flex; gap: 2rem; }
        .ma-home-spotlight-image { flex: 1; aspect-ratio: 5 / 7; border-radius: 8px; overflow: hidden; }
        .ma-home-spotlight-image.ma-image-holder { opacity: 0.75; }

        .ma-spotlight-mask-image-container {
          position: absolute; top: 0; left: 0; width: 100vw; height: 100svh; overflow: hidden; z-index: 10;
          -webkit-mask: url(/global/spotlight-mask.svg) center / contain no-repeat;
          mask: url(/global/spotlight-mask.svg) center / contain no-repeat;
          -webkit-mask-size: 0%;
          mask-size: 0%;
        }
        .ma-spotlight-mask-image-container .ma-spotlight-mask-image { width: 100%; height: 100%; }
        .ma-spotlight-mask-image-container .ma-spotlight-mask-image img {
          width: 100%; height: 100%; object-fit: cover; object-position: center;
        }
        .ma-spotlight-mask-header {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 45%; text-align: center; color: var(--ma-base-100);
        }
        .ma-home-spotlight-top-bar, .ma-home-spotlight-bottom-bar {
          position: absolute; left: 0; width: 100%;
        }
        .ma-home-spotlight-top-bar { top: 0; }
        .ma-home-spotlight-bottom-bar { bottom: 0; }
        .ma-home-spotlight-top-bar .ma-container, .ma-home-spotlight-bottom-bar .ma-container {
          display: flex; justify-content: space-between;
        }

        .ma-outro {
          position: relative; width: 100vw; height: 100svh; overflow: hidden; z-index: 1;
        }
        .ma-outro .ma-container { display: flex; justify-content: center; align-items: center; }
        .ma-outro h3 { width: 58%; text-align: center; }

        .ma-outro-strips {
          position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 150vw; height: 100svh; overflow: hidden; display: flex; flex-direction: column; justify-content: space-around;
        }
        .ma-outro-strip {
          position: relative; transform: translateX(0%); display: flex; justify-content: space-around; will-change: transform;
        }
        .ma-skill { width: max-content; padding: 4px 8px; border-radius: 6px; }
        .ma-skill p.ma-mono { font-size: 0.8rem; }
        .ma-os-1 { margin-top: 10rem; }
        .ma-os-2 { margin-top: -2rem; }
        .ma-os-3 { margin-top: 16rem; }
        .ma-os-4 { margin-top: -2rem; }
        .ma-os-5 { margin-top: 1rem; }
        .ma-os-6 { margin-top: 2rem; }

        .ma-skill-var-1 { background-color: var(--ma-accent-1); color: var(--ma-base-300); }
        .ma-skill-var-2 { background-color: var(--ma-accent-2); color: var(--ma-base-300); }
        .ma-skill-var-3 { background-color: var(--ma-accent-3); color: var(--ma-base-300); }

        @media (max-width: 1000px) {
          .ma-container { padding: 2rem; }

          .ma-hero .ma-hero-header h1 { font-size: 22.5vw; }
          .ma-hero .ma-hero-footer-copy { display: none; }
          .ma-hero .ma-hero-footer-tags { width: 100%; justify-content: space-between; }
          .ma-hero-cards { width: 65%; }
          .ma-hero-cards .ma-hero-card p.ma-mono { font-size: 0.7rem; }

          .ma-home-about { min-height: max-content; }
          .ma-home-about .ma-container,
          .ma-home-about .ma-home-about-col:nth-child(2),
          .ma-home-about-col-row { flex-direction: column; }
          .ma-home-about .ma-home-about-col:nth-child(1) .ma-home-about-header { width: 100%; }
          .ma-home-about-card { aspect-ratio: 1; max-height: 400px; }

          .ma-home-services { height: max-content; }
          .ma-home-services-bottom-bar .ma-container { flex-direction: column; justify-content: center; align-items: center; text-align: center; }
          .ma-home-services-header { transform: translateY(0%); }
          .ma-cards {
            position: relative;
            background-color: var(--ma-base-100);
            width: 100%;
            height: max-content;
          }
          .ma-cards-container { flex-direction: column; gap: 2rem; width: 100%; display: block; margin: 0; }
          .ma-card { opacity: 1 !important; transform: none !important; max-width: 400px; width: 100%; margin: 2rem auto; }
          .ma-flip-card-inner, .ma-card-wrapper { animation: none; }
          .ma-flip-card-front { display: none; }
          .ma-flip-card-back { transform: none !important; position: relative; }

          .ma-spotlight-mask-header, .ma-spotlight-intro-header { width: 90%; text-align: center; }
          .ma-home-spotlight-images { left: -75vw; width: 250vw; }
          .ma-home-spotlight-images-row { gap: 1rem; }

          .ma-outro h3 { width: 90%; }
          .ma-outro-strips { width: 300vw; }
          .ma-os-1 { margin-top: 2.5rem; }
          .ma-os-3 { margin-top: 10rem; }
        }

        @media (max-width: 800px) {
          .ma-hero-cards { width: 75%; }
        }

        @media (max-width: 600px) {
          .ma-hero .ma-hero-header h1 { font-size: 25vw; }
          .ma-hero-cards { top: 65%; width: 75%; }
        }

        @media (max-width: 500px) {
          .ma-hero .ma-hero-header h1 { font-size: 30vw; }
          .ma-hero-cards { width: 85%; }
        }
      `}</style>
    </section>
  );
};

export default MainThemeSection;
