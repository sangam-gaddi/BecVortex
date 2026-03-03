'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CampusScroll = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const heroImgRef = useRef<HTMLDivElement>(null);
    const heroImgElementRef = useRef<HTMLImageElement>(null);
    const heroMaskRef = useRef<HTMLDivElement>(null);
    const heroGridOverlayRef = useRef<HTMLDivElement>(null);
    const marker1Ref = useRef<HTMLDivElement>(null);
    const marker2Ref = useRef<HTMLDivElement>(null);
    const heroContentRef = useRef<HTMLDivElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const heroContent = heroContentRef.current;
            const heroImg = heroImgRef.current;
            const heroImgElement = heroImgElementRef.current;
            const heroMask = heroMaskRef.current;
            const heroGridOverlay = heroGridOverlayRef.current;
            const marker1 = marker1Ref.current;
            const marker2 = marker2Ref.current;
            const progressBar = progressBarRef.current;

            if (!heroContent || !heroImg || !heroImgElement || !heroMask || !heroGridOverlay || !marker1 || !marker2 || !progressBar) return;

            const heroContentHeight = heroContent.offsetHeight;
            const viewportHeight = window.innerHeight;
            const heroContentMovedistance = heroContentHeight - viewportHeight;

            const heroImgHeight = heroImg.offsetHeight;
            const heroImgMovedistance = heroImgHeight - viewportHeight;

            const ease = (x: number) => x * x * (3 - 2 * x);

            ScrollTrigger.create({
                trigger: '.campus-hero',
                start: 'top top',
                end: `+=${window.innerHeight * 4}px`,
                pin: true,
                pinSpacing: true,
                scrub: 1,
                onUpdate: (self) => {
                    if (progressBar) {
                        (progressBar as HTMLElement).style.setProperty('--progress', String(self.progress));
                    }

                    gsap.set(heroContent, {
                        y: -self.progress * heroContentMovedistance,
                    });

                    let heroImgProgress: number;
                    if (self.progress <= 0.45) {
                        heroImgProgress = ease(self.progress / 0.45) * 0.65;
                    } else if (self.progress <= 0.75) {
                        heroImgProgress = 0.65;
                    } else {
                        heroImgProgress = 0.65 + ease((self.progress - 0.75) / 0.25) * 0.35;
                    }

                    gsap.set(heroImg, {
                        y: heroImgProgress * heroImgMovedistance,
                    });

                    let heroMaskScale: number;
                    let heroImgSaturation: number;
                    let heroImgOverlayOpacity: number;

                    if (self.progress <= 0.4) {
                        heroMaskScale = 2.5;
                        heroImgSaturation = 1;
                        heroImgOverlayOpacity = 0.35;
                    } else if (self.progress <= 0.5) {
                        const phaseProgress = ease((self.progress - 0.4) / 0.1);
                        heroMaskScale = 2.5 - phaseProgress * 1.5;
                        heroImgSaturation = 1 - phaseProgress;
                        heroImgOverlayOpacity = 0.35 + phaseProgress * 0.35;
                    } else if (self.progress <= 0.75) {
                        heroMaskScale = 1;
                        heroImgSaturation = 0;
                        heroImgOverlayOpacity = 0.7;
                    } else if (self.progress <= 0.85) {
                        const phaseProgress = ease((self.progress - 0.75) / 0.1);
                        heroMaskScale = 1 + phaseProgress * 1.5;
                        heroImgSaturation = phaseProgress;
                        heroImgOverlayOpacity = 0.7 - phaseProgress * 0.35;
                    } else {
                        heroMaskScale = 2.5;
                        heroImgSaturation = 1;
                        heroImgOverlayOpacity = 0.35;
                    }

                    gsap.set(heroMask, { scale: heroMaskScale });
                    gsap.set(heroImgElement, { filter: `saturate(${heroImgSaturation})` });
                    (heroImg as HTMLElement).style.setProperty('--overlay-opacity', String(heroImgOverlayOpacity));

                    let heroGridOpacity: number;
                    if (self.progress <= 0.475) {
                        heroGridOpacity = 0;
                    } else if (self.progress <= 0.5) {
                        heroGridOpacity = ease((self.progress - 0.475) / 0.025);
                    } else if (self.progress <= 0.75) {
                        heroGridOpacity = 1;
                    } else if (self.progress <= 0.775) {
                        heroGridOpacity = 1 - ease((self.progress - 0.75) / 0.025);
                    } else {
                        heroGridOpacity = 0;
                    }

                    gsap.set(heroGridOverlay, { opacity: heroGridOpacity });

                    // Marker 1
                    let marker1Opacity: number;
                    if (self.progress <= 0.5) {
                        marker1Opacity = 0;
                    } else if (self.progress <= 0.525) {
                        marker1Opacity = ease((self.progress - 0.5) / 0.025);
                    } else if (self.progress <= 0.7) {
                        marker1Opacity = 1;
                    } else if (self.progress <= 0.75) {
                        marker1Opacity = 1 - ease((self.progress - 0.7) / 0.05);
                    } else {
                        marker1Opacity = 0;
                    }
                    gsap.set(marker1, { opacity: marker1Opacity });

                    // Marker 2
                    let marker2Opacity: number;
                    if (self.progress <= 0.55) {
                        marker2Opacity = 0;
                    } else if (self.progress <= 0.575) {
                        marker2Opacity = ease((self.progress - 0.55) / 0.025);
                    } else if (self.progress <= 0.7) {
                        marker2Opacity = 1;
                    } else if (self.progress <= 0.75) {
                        marker2Opacity = 1 - ease((self.progress - 0.7) / 0.05);
                    } else {
                        marker2Opacity = 0;
                    }
                    gsap.set(marker2, { opacity: marker2Opacity });
                },
            });
        },
        { scope: containerRef }
    );

    return (
        <div ref={containerRef}>
            <section className="campus-hero" id="campus">
                <div className="campus-hero-img" ref={heroImgRef}>
                    <img ref={heroImgElementRef} src="/img/gallery-4.webp" alt="BEC Campus" />
                </div>

                <div className="campus-hero-mask" ref={heroMaskRef} />

                <div className="campus-grid-overlay" ref={heroGridOverlayRef}>
                    <img src="/campus-grid-overlay.svg" alt="" />
                </div>

                {/* Marker 1 */}
                <div className="campus-marker campus-marker-1" ref={marker1Ref}>
                    <span className="campus-marker-icon" />
                    <p className="campus-marker-label">93 Acre Campus</p>
                </div>

                {/* Marker 2 */}
                <div className="campus-marker campus-marker-2" ref={marker2Ref}>
                    <span className="campus-marker-icon" />
                    <p className="campus-marker-label">WiFi Enabled</p>
                </div>

                {/* Scrolling Content Blocks */}
                <div className="campus-hero-content" ref={heroContentRef}>
                    {/* Block 1 */}
                    <div className="campus-content-block">
                        <div className="campus-content-copy">
                            <span className="campus-tag">▶ BEC Campus</span>
                            <h2>Basaveshwar Engineering College</h2>
                            <p>
                                Established in 1963, BEC spans 93.18 acres of green campus in Bagalkote, Karnataka —
                                a premier institute recognised at the national level.
                            </p>
                        </div>
                    </div>

                    {/* Block 2 */}
                    <div className="campus-content-block">
                        <div className="campus-content-copy">
                            <span className="campus-tag">▶ Infrastructure</span>
                            <h2>World-Class Facilities</h2>
                            <p>
                                1,500+ computers, 60,000 sq.m built-up area, 1 Gbps internet leased line (1:1 ILL),
                                smart classrooms with 65″ digital boards, and an RFID-secured library with 1.40 lakh volumes.
                            </p>
                        </div>
                    </div>

                    {/* Block 3 */}
                    <div className="campus-content-block">
                        <div className="campus-content-copy">
                            <span className="campus-tag">▶ Academic Excellence</span>
                            <h2>Ranked &amp; Accredited</h2>
                            <p>
                                NIRF ranked within Top 200 · 100% NBA accreditation of all UG courses · NAAC accredited by UGC ·
                                QS I-Gauge certified · TEQIP World Bank project beneficiary.
                            </p>
                        </div>
                    </div>

                    {/* Block 4 */}
                    <div className="campus-content-block">
                        <div className="campus-content-copy">
                            <span className="campus-tag">▶ Campus Life</span>
                            <h2>Life at BEC</h2>
                            <p>
                                5-acre playground, indoor stadium, 2 boys &amp; 3 girls hostels accommodating 1,500 students,
                                BEC Dhwani 90.4 FM Radio Station, IEEE Student Branch (est. 1994), NSS, and Gymkhana.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="campus-progress-bar" ref={progressBarRef} />
            </section>
        </div>
    );
};

export default CampusScroll;

