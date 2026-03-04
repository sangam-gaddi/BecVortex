'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Navbar from '@/components/Navbar';
import Features from '@/components/Features';
import Story from '@/components/Story';
import CampusScroll from '@/components/CampusScroll';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import FeeStructureModal from '@/components/FeeStructureModal';

export default function HomePage() {
    const [showFeeStructure, setShowFeeStructure] = useState(false);

    return (
        <main className="relative min-h-screen w-full overflow-x-hidden">
            <Navbar onFeeStructureClick={() => setShowFeeStructure(true)} />
            <Hero />
            <About />
            <Features />
            <Story onFeeStructureClick={() => setShowFeeStructure(true)} />
            <CampusScroll />
            <Contact />
            <Footer />

            <AnimatePresence>
                {showFeeStructure && (
                    <FeeStructureModal
                        isOpen={showFeeStructure}
                        onClose={() => setShowFeeStructure(false)}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}
