'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SERVICES = [
  { name: 'Data Security', img: '/spotlight/spotlight-1.jpg', indicator: '[ Protection ]' },
  { name: 'AI Intelligence', img: '/spotlight/spotlight-2.jpg', indicator: '[ Insight ]' },
  { name: 'Real-time Sync', img: '/spotlight/spotlight-3.jpg', indicator: '[ Speed ]' },
  { name: 'System Reliability', img: '/spotlight/spotlight-4.jpg', indicator: '[ Stability ]' },
];

const TECH_STACK_GRID = [
  ['Next.js', 'TypeScript', 'MongoDB'],
  ['Socket.IO', 'LiveKit', 'GSAP', 'Tailwind CSS', 'Wagmi'],
];

// Creator details sourced from the OS credits modal.
const CREATORS = [
  { name: 'Sangam Gaddi', role: 'Main Architect & Original Creator' },
  { name: 'Samarth Sugandhi', role: 'UI / UX Designer & Event Organizer App' },
  { name: 'Yateesh Matuur', role: 'AI Engineer - Voice Agent (ARIA)' },
  { name: 'Arshad', role: 'System Hierarchy & Role-Based Architecture' },
];

const GRID_LAYOUT: Array<Array<number | null>> = [
  [0, null, 1, null],
  [null, 2, null, null],
  [3, null, null, 4],
  [null, 5, 6, null],
  [7, null, null, 8],
  [null, null, 9, null],
  [null, 10, null, 11],
  [12, null, 13, null],
  [null, 14, null, null],
  [15, null, null, 16],
];

const ORIGINS = [
  'right', 'left', 'left', 'right', 'left', 'left', 'right', 'left', 'left',
  'left', 'left', 'left', 'right', 'left', 'left', 'right', 'left',
];

const Contact = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = sectionRef.current;
      if (!root) return;

      const teamRows = root.querySelectorAll('.team-row');
      const teamHeader = root.querySelector('.team-header');
      const serviceIndicator = root.querySelector('.services-indicator') as HTMLElement | null;
      const serviceItems = root.querySelectorAll('.service-item.with-image');
      const splitTopImg = root.querySelector('.pc-split-top img');
      const splitBottomImg = root.querySelector('.pc-split-bottom img');

      const stackContainer = root.querySelector('.pc-clients .pc-container') as HTMLElement | null;
      const stackHighlight = root.querySelector('.pc-clients .pc-highlight') as HTMLElement | null;
      const stackItems = root.querySelectorAll('.pc-grid-item');

      const handleServiceEnter = (item: Element, index: number) => {
        if (!serviceIndicator) return;
        const list = root.querySelector('.services-list');
        if (!list) return;

        const itemRect = (item as HTMLElement).getBoundingClientRect();
        const listRect = (list as HTMLElement).getBoundingClientRect();
        const indicatorRect = serviceIndicator.getBoundingClientRect();
        const itemCenterY = itemRect.top - listRect.top + itemRect.height / 2;
        const targetY = itemCenterY - indicatorRect.height / 2;

        const indicatorLabel = serviceIndicator.querySelector('span');
        if (indicatorLabel) {
          indicatorLabel.textContent = SERVICES[index]?.indicator || '[ Discover ]';
        }

        gsap.to(serviceIndicator, {
          y: targetY,
          duration: 0.35,
          ease: 'power2.out',
        });
      };

      const listeners: Array<{ node: Element; fn: () => void }> = [];
      serviceItems.forEach((item, index) => {
        const fn = () => handleServiceEnter(item, index);
        item.addEventListener('mouseenter', fn);
        listeners.push({ node: item, fn });
      });

      if (splitTopImg && splitBottomImg) {
        ScrollTrigger.create({
          id: 'precontact-split',
          trigger: root.querySelector('.pc-split-element'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          onUpdate: (self) => {
            const progress = Math.min(self.progress / 0.65, 1);
            const topScale = 1.5 + (1 - 1.5) * progress;
            const bottomScale = 2 + (1 - 2) * progress;
            gsap.set(splitTopImg, { scale: topScale, force3D: true });
            gsap.set(splitBottomImg, { scale: bottomScale, force3D: true });
          },
        });
      }

      let currentStackItem: Element | null = null;
      const moveStackHighlightTo = (item: Element) => {
        if (!stackContainer || !stackHighlight || window.innerWidth < 1000) return;
        if (currentStackItem === item) return;

        if (currentStackItem) {
          const prev = currentStackItem.querySelector('p');
          if (prev) (prev as HTMLElement).style.color = '';
        }

        const rect = (item as HTMLElement).getBoundingClientRect();
        const containerRect = stackContainer.getBoundingClientRect();

        stackHighlight.style.transform = `translate(${rect.left - containerRect.left}px, ${rect.top - containerRect.top}px)`;
        stackHighlight.style.width = `${rect.width}px`;
        stackHighlight.style.height = `${rect.height}px`;

        const p = item.querySelector('p');
        if (p) (p as HTMLElement).style.color = 'var(--pc-black)';

        currentStackItem = item;
      };

      const firstStackItem = stackItems[0] || null;
      if (firstStackItem && window.innerWidth >= 1000) {
        moveStackHighlightTo(firstStackItem);
      } else if (stackHighlight && window.innerWidth < 1000) {
        stackHighlight.style.opacity = '0';
      }

      const stackMouseMove = (e: MouseEvent) => {
        const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
        let target: Element | null = null;
        if (hoveredElement?.classList.contains('pc-grid-item')) {
          target = hoveredElement;
        } else if (hoveredElement?.parentElement?.classList.contains('pc-grid-item')) {
          target = hoveredElement.parentElement;
        }
        if (target) moveStackHighlightTo(target);
      };

      if (stackContainer) {
        if (window.innerWidth >= 1000) {
          stackContainer.addEventListener('mousemove', stackMouseMove);
        }

        const resizeFn = () => {
          if (!stackHighlight || !stackContainer) return;
          if (window.innerWidth < 1000) {
            stackHighlight.style.opacity = '0';
            return;
          }
          stackHighlight.style.opacity = '1';
          if (currentStackItem) moveStackHighlightTo(currentStackItem);
        };
        window.addEventListener('resize', resizeFn);
        listeners.push({
          node: window as unknown as Element,
          fn: resizeFn as unknown as () => void,
        });
      }

      const desktop = window.innerWidth >= 1000;

      if (desktop) {
        gsap.set('.team-img', { scale: 0, force3D: true });

        teamRows.forEach((row, index) => {
          const rowImages = row.querySelectorAll('.team-img');
          if (!rowImages.length) return;

          ScrollTrigger.create({
            id: `culture-scale-in-${index}`,
            trigger: row,
            start: 'top bottom',
            end: 'bottom bottom-=10%',
            scrub: 1,
            onUpdate: (self) => {
              const progress = Math.min(1, self.progress * 1.2);
              const scaleValue = gsap.utils.interpolate(0, 1, progress);
              rowImages.forEach((img) => gsap.set(img, { scale: scaleValue, force3D: true }));
            },
            onLeave: () => gsap.set(rowImages, { scale: 1, force3D: true }),
          });

          ScrollTrigger.create({
            id: `culture-scale-out-${index}`,
            trigger: row,
            start: 'top top',
            end: 'bottom top',
            pin: true,
            pinSpacing: false,
            scrub: 1,
            onEnter: () => gsap.set(rowImages, { scale: 1, force3D: true }),
            onUpdate: (self) => {
              const scale = gsap.utils.interpolate(1, 0, self.progress);
              rowImages.forEach((img) => gsap.set(img, { scale, force3D: true }));
            },
          });
        });

        if (teamHeader) {
          ScrollTrigger.create({
            trigger: root.querySelector('.team'),
            start: 'top top',
            end: 'bottom bottom',
            pin: teamHeader,
            pinSpacing: false,
          });
        }
      } else {
        gsap.set('.team-img', { scale: 1, force3D: true });
      }

      return () => {
        listeners.forEach(({ node, fn }) => {
          if (node === (window as unknown as Element)) {
            window.removeEventListener('resize', fn as unknown as EventListener);
          } else {
            node.removeEventListener('mouseenter', fn);
          }
        });
        if (stackContainer) {
          stackContainer.removeEventListener('mousemove', stackMouseMove);
        }
        ScrollTrigger.getAll().forEach((t) => {
          if (
            (t.vars.id && (String(t.vars.id).startsWith('culture-') || String(t.vars.id).startsWith('precontact-')))
            || t.vars.trigger === root.querySelector('.team')
          ) {
            t.kill();
          }
        });
      };
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} className="culture-root">
      <section className="pc-split-element" aria-label="Form animation">
        <div className="pc-split-img pc-split-top">
          <img src="/home/form.svg" alt="FORM visual" />
        </div>

        <div className="pc-split-img pc-split-bottom">
          <img src="/home/form.svg" alt="FORM visual" />
        </div>

        <div className="pc-split-copy">
          <div className="pc-container">
            <p>
              <span>Admissions</span>
              <span>Payments</span>
              <span>Voice AI</span>
              <span>Grades</span>
              <span>Campus OS</span>
            </p>
          </div>
        </div>
      </section>

      <section className="pc-clients" aria-label="Allies animation">
        <div className="pc-container">
          <div className="pc-clients-header">
            <p>[ &nbsp;Selected Tech Stack&nbsp; ]</p>
            <h3>Allies in Tech Stack</h3>
          </div>

          <div className="pc-grid">
            {TECH_STACK_GRID.map((row, rowIndex) => (
              <div className="pc-grid-row" key={`stack-row-${rowIndex}`}>
                {row.map((item) => (
                  <div className="pc-grid-item" key={item}>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="pc-highlight" />
        </div>
      </section>

      <section id="contact" className="culture-hero">
        <div className="culture-hero-img">
          <img src="/culture/hero.jpg" alt="Culture hero" />
        </div>
        <div className="culture-hero-header">
          <div className="container">
            <h1>Inside BEC</h1>
          </div>
        </div>
        <div className="culture-hero-footer">
          <div className="container">
            <p>Platform Dynamics</p>
            <p>[ &nbsp;Continue Reading&nbsp; ]</p>
          </div>
        </div>
      </section>

      <section className="services">
        <div className="services-container">
          <div className="services-list">
            {SERVICES.map((service, i) => (
              <div key={service.name} className="service-item with-image" data-index={i}>
                <div className="service-img-wrapper">
                  <img src={service.img} alt={service.name} className="service-image" />
                </div>
                <div className="service-name">
                  <h2>{service.name}</h2>
                </div>
              </div>
            ))}
          </div>
          <div className="services-indicator">
            <span>[ Discover ]</span>
          </div>
        </div>
        <div className="services-footer">
          <div className="container">
            <p>Core Features</p>
            <p>[ &nbsp;Capabilities&nbsp; ]</p>
          </div>
        </div>
      </section>

      <section className="team">
        <div className="team-header">
          <h2>The Creators</h2>
        </div>

        {GRID_LAYOUT.map((row, rowIdx) => (
          <div className="team-row" key={`row-${rowIdx}`}>
            {row.map((imageIndex, colIdx) => (
              <div className="team-col" key={`cell-${rowIdx}-${colIdx}`}>
                {imageIndex !== null && (
                  <div className="team-img" data-origin={ORIGINS[imageIndex] || 'left'}>
                    <img src={`/culture/team/team-${imageIndex + 1}.jpg`} alt="Team" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="culture-about">
        <div className="container">
          <div className="culture-header">
            <p>[ &nbsp;Credits from BEC OS Login&nbsp; ]</p>
            <h3>Core Creators</h3>
          </div>

          <div className="creator-list">
            {CREATORS.map((creator) => (
              <div className="creator-item" key={creator.name}>
                <p className="creator-name">{creator.name}</p>
                <p className="creator-role">{creator.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx>{`
        .culture-root {
          --tone-100: #090a0d;
          --tone-300: #9ea3b5;
          --tone-400: #8a8ea1;
          --tone-500: #f2f4ff;
          --pc-red: #fe0100;
          --pc-black: #000000;
          --pc-grid: #1f1f1f;
          --pc-muted: #d9d9cf;
          background: var(--tone-100);
          color: var(--tone-500);
          font-family: 'general', sans-serif;
        }

        .container,
        .pc-container {
          width: min(1280px, 92vw);
          margin: 0 auto;
        }

        .pc-split-element {
          position: relative;
          width: 100%;
          height: 100svh;
          background-color: var(--pc-black);
          overflow: hidden;
        }

        .pc-split-img {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          transform: translate(-50%, -50%);
        }

        .pc-split-img img {
          width: 100%;
          height: 50%;
          object-fit: contain;
          will-change: transform;
          filter: saturate(100%);
        }

        .pc-split-top {
          clip-path: polygon(0 0, 100% 0, 100% 50%, 0 50%);
        }

        .pc-split-top img {
          transform: scale(1.5);
        }

        .pc-split-bottom {
          clip-path: polygon(0 50%, 100% 50%, 100% 100%, 0 100%);
        }

        .pc-split-bottom img {
          transform: scale(2);
        }

        .pc-split-copy {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          background-color: #676862;
          color: #f3f3ec;
          text-align: center;
          transform: translateY(-50%);
          overflow: hidden;
          z-index: 4;
        }

        .pc-split-copy p {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 2rem;
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          text-transform: uppercase;
          font-size: 2rem;
          line-height: 1.1;
          color: #f3f3ec;
        }

        .pc-clients {
          position: relative;
          width: 100%;
          height: 100svh;
          background-color: var(--pc-black);
          color: var(--pc-red);
          overflow: hidden;
        }

        .pc-clients .pc-container {
          position: relative;
          width: min(1680px, 100%);
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4rem;
          padding: 2rem;
        }

        .pc-clients-header {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 0.35rem;
        }

        .pc-clients-header p,
        .pc-clients-header h3,
        .pc-grid-item p {
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          text-transform: uppercase;
        }

        .pc-clients-header p {
          color: var(--pc-muted);
          font-size: 1.05rem;
        }

        .pc-clients-header h3 {
          font-size: clamp(3.25rem, 7vw, 8rem);
          color: var(--pc-red);
          line-height: 0.85;
          font-weight: 500;
          letter-spacing: -0.02em;
        }

        .pc-grid {
          position: relative;
          width: 90%;
          height: 60%;
          display: flex;
          flex-direction: column;
          margin: 0 auto;
          border: 1px solid var(--pc-grid);
        }

        .pc-grid-row,
        .pc-grid-item {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }

        .pc-grid-row:nth-child(1) {
          border-bottom: 1px solid var(--pc-grid);
        }

        .pc-grid-item:not(:last-child) {
          border-right: 1px solid var(--pc-grid);
        }

        .pc-grid-item p {
          position: relative;
          z-index: 2;
          color: var(--pc-muted);
          user-select: none;
          font-size: clamp(1.45rem, 2.2vw, 2.65rem);
        }

        .pc-highlight {
          position: absolute;
          top: 0;
          left: 0;
          background: var(--pc-red);
          opacity: 1;
          transition: transform 0.25s ease, width 0.25s ease, height 0.25s ease, background-color 0.25s ease;
          pointer-events: none;
        }

        .culture-hero {
          position: relative;
          width: 100%;
          height: 100svh;
          overflow: hidden;
        }

        .culture-hero .culture-hero-img {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 0;
          width: 100%;
          height: 100%;
        }

        .culture-hero .culture-hero-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .culture-hero .culture-hero-header {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 1;
          width: 100%;
          text-align: center;
          transform: translate(-50%, -50%);
        }

        .culture-hero .culture-hero-header h1 {
          width: 100%;
          font-size: 20vw;
          letter-spacing: -0.25vw;
          line-height: 1;
          text-transform: uppercase;
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          color: var(--pc-red);
          font-weight: 500;
        }

        .culture-hero .culture-hero-footer {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          padding-bottom: 1.25rem;
          z-index: 2;
        }

        .culture-hero .culture-hero-footer .container {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          color: var(--tone-400);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }

        .services {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          background-color: var(--tone-100);
        }

        .services .services-container {
          position: relative;
          width: 100%;
          max-width: 1200px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 0 auto;
          padding: 2rem;
        }

        .services .services-list {
          position: relative;
          flex: 1;
          max-width: 90%;
        }

        .services .service-item {
          position: relative;
          height: 7rem;
          display: flex;
          align-items: center;
          line-height: 0.9;
          color: var(--tone-400);
          cursor: pointer;
        }

        .services .service-name {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .services .service-name h2 {
          font-size: clamp(2rem, 7vw, 6rem);
          line-height: 0.9;
          color: var(--pc-red);
          text-transform: uppercase;
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          font-weight: 500;
        }

        .services .service-img-wrapper {
          width: 0;
          height: 100%;
          display: inline-block;
          overflow: hidden;
          transition: width 0.3s ease;
        }

        .services .service-image {
          width: 10rem;
          height: 100%;
          border-radius: 2px;
          object-fit: cover;
          object-position: left center;
          transform: scale(1.5);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .services .service-item:hover .service-img-wrapper {
          width: 10.5rem;
        }

        .services .service-item:hover .service-image {
          transform: scale(1);
        }

        .services .services-indicator {
          position: absolute;
          right: 2rem;
          top: 2rem;
        }

        .services .services-indicator span {
          text-transform: uppercase;
          color: var(--tone-300);
          letter-spacing: 0.1em;
          font-size: 0.75rem;
        }

        .services .services-footer {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          padding-bottom: 1.25rem;
        }

        .services .services-footer .container {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          color: var(--tone-400);
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
        }

        .team {
          position: relative;
          width: 100%;
          background-color: var(--tone-100);
          overflow: hidden;
        }

        .team .team-row {
          width: 100%;
          display: flex;
        }

        .team .team-col {
          flex: 1;
          aspect-ratio: 1;
        }

        .team .team-img {
          position: relative;
          width: 100%;
          height: 100%;
          will-change: transform;
        }

        .team .team-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(0) brightness(0.85) contrast(1.0125);
        }

        .team .team-img[data-origin='left'] {
          transform-origin: 0% 0%;
        }

        .team .team-img[data-origin='right'] {
          transform-origin: 100% 0%;
        }

        .team .team-header {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          width: 100%;
          height: 100svh;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          pointer-events: none;
        }

        .team .team-header h2 {
          color: var(--pc-red);
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          font-size: clamp(2.25rem, 10vw, 9rem);
          text-transform: uppercase;
          font-weight: 500;
        }

        .culture-about {
          position: relative;
          width: 100%;
          padding: 4rem 0 8rem 0;
          background-color: var(--tone-100);
          color: var(--tone-500);
        }

        .culture-about .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4rem;
          text-align: center;
        }

        .culture-about .culture-header {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 0.75rem;
        }

        .culture-about .culture-header p {
          color: var(--tone-400);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.75rem;
        }

        .culture-about .culture-header h3 {
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          text-transform: uppercase;
          font-size: clamp(2rem, 5vw, 4rem);
          color: var(--pc-red);
          font-weight: 500;
        }

        .creator-list {
          width: min(900px, 92vw);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .creator-item {
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.03);
          padding: 1.15rem;
          text-align: left;
        }

        .creator-name {
          font-size: 1.1rem;
          color: var(--pc-red);
          font-family: 'Cossette Titre', 'zentry', sans-serif;
          font-weight: 500;
        }

        .creator-role {
          margin-top: 0.35rem;
          color: var(--tone-400);
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @media (max-width: 1000px) {
          .pc-split-element {
            height: 75svh;
          }

          .pc-split-copy p {
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            column-gap: 2rem;
            text-align: center;
            font-size: 1.2rem;
          }

          .pc-clients {
            height: 110svh;
          }

          .pc-grid {
            height: max-content;
            border: 1px solid #3b3b3b;
          }

          .pc-grid-row {
            flex: none;
            flex-direction: column;
            height: max-content;
            border: none;
          }

          .pc-grid-row:nth-child(1) {
            border-bottom: 1px solid #3b3b3b;
          }

          .pc-grid-item {
            flex: none;
            width: 100%;
            height: 4rem;
          }

          .pc-grid-item:not(:last-child) {
            border-right: none;
            border-bottom: 1px solid #3b3b3b;
          }

          .pc-highlight {
            display: none;
          }

          .culture-hero .culture-hero-header h1 {
            font-size: 30vw;
          }

          .services .services-container {
            flex-direction: column;
            align-items: flex-start;
          }

          .services .services-list {
            max-width: 100%;
          }

          .services .service-item {
            height: 3rem;
          }

          .services .service-name h2 {
            font-size: 2.75rem;
          }

          .services .service-img-wrapper,
          .services .services-indicator {
            display: none;
          }

          .creator-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
};

export default Contact;