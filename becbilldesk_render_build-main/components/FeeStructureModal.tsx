'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import gsap from 'gsap';

const FeeStructureModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  useEffect(() => {
    if (isOpen) {
      gsap.from('.fee-table', {
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const collegeFees = [
    { name: 'Association Fees', amount: 50 },
    { name: 'VTU Career Guidance Fee', amount: 50 },
    { name: 'VTU Cultural Activities', amount: 100 },
    { name: 'VTU e-Resource Consortium', amount: 1000 },
    { name: 'Gymkhana Fee', amount: 50 },
    { name: 'Hand Book', amount: 50 },
    { name: 'News Paper Magazine Fee', amount: 25 },
    { name: 'Medical Examination Fee', amount: 20 },
    { name: 'Sports Fee', amount: 400 },
    { name: 'Reading Room Fee', amount: 50 },
    { name: 'Indian Red Cross Membership', amount: 50 },
    { name: 'Sports Development Fees', amount: 200 },
    { name: 'VTU Sports Development', amount: 250 },
    { name: 'Teachers Development Fee', amount: 25 },
    { name: 'Student Welfare Fund', amount: 192 },
    { name: 'University Development Fund', amount: 1500 },
    { name: 'VTU Registration Renewal', amount: 50 },
    { name: 'VTU Womens Cell', amount: 20 },
    { name: 'University e-Learning Fee', amount: 1000 },
    { name: 'College Development Fund', amount: 6250 },
    { name: 'Skill Development Fee', amount: 1000 },
  ];

  const tuitionFees = [
    { category: 'KCET', tuition: 97668, total: 110000 },
    { category: 'COMEDK', tuition: 150000, total: 162332 },
    { category: 'Management', tuition: 227078, total: 239410 },
  ];

  const developmentFees = [
    { name: 'Accreditation & Affiliation', amount: 1200 },
    { name: 'BVV Sangha Ground Development', amount: 500 },
    { name: 'BVV Sangha Sanjeevani Fee', amount: 500 },
    { name: 'e-Journals Fee', amount: 1600 },
    { name: 'Equipment/Lab Maintenance', amount: 1500 },
    { name: 'Extra Curricular Activities', amount: 600 },
    { name: 'Gymkhana and Sports Development', amount: 2800 },
    { name: 'Library Fee', amount: 750 },
    { name: 'Magazine Fee', amount: 250 },
    { name: 'Placement Facility', amount: 200 },
    { name: 'Stationary Fee', amount: 100 },
    { name: 'Syllabus Book', amount: 200 },
    { name: 'BEC Development Fee', amount: 100 },
    { name: 'Development Fee', amount: 3200 },
    { name: 'General Amenities', amount: 1200 },
    { name: 'General Insurance', amount: 100 },
    { name: 'Internet Fee', amount: 500 },
    { name: 'Registration (RFID) Fee', amount: 300 },
    { name: 'Placement Training', amount: 3000 },
    { name: 'High Speed Wi-Fi', amount: 1600 },
  ];

  const hostelFees = [
    { name: 'N-Block', amount: 59000 },
    { name: 'V-Block', amount: 64000 },
    { name: 'PG', amount: 67000 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-black/98 backdrop-blur-2xl rounded-lg border-2 border-white/20 max-w-6xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="sticky top-6 right-6 float-right p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all z-10">
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="p-8">
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>Fee Structure</h1>
          <p className="text-sm text-white/70 mb-8" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Complete breakdown of all fee types</p>

          <div className="fee-table mb-8">
            <h2 className="text-xl uppercase text-white font-bold mb-4 bg-violet-400/30 p-3 rounded-lg" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.05em' }}>I. College Fees (Common for All)</h2>
            <div className="border-2 border-white/20 rounded-lg overflow-hidden bg-black/50">
              <table className="w-full">
                <thead className="bg-violet-300/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Particulars</th>
                    <th className="px-6 py-4 text-right text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {collegeFees.map((fee, index) => (
                    <tr key={index} className="border-t border-white/20 hover:bg-white/10 transition-colors">
                      <td className="px-6 py-3 text-base text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.name}</td>
                      <td className="px-6 py-3 text-right text-base text-white font-semibold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-white/30 bg-violet-300/30">
                    <td className="px-6 py-4 text-base uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Common Fees Total</td>
                    <td className="px-6 py-4 text-right text-2xl text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>₹12,332</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="fee-table mb-8">
            <h2 className="text-xl uppercase text-white font-bold mb-4 bg-violet-400/30 p-3 rounded-lg" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.05em' }}>Tuition Fees by Admission Category</h2>
            <div className="border-2 border-white/20 rounded-lg overflow-hidden bg-black/50">
              <table className="w-full">
                <thead className="bg-violet-300/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Category</th>
                    <th className="px-6 py-4 text-right text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Tuition Fee (₹)</th>
                    <th className="px-6 py-4 text-right text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {tuitionFees.map((fee, index) => (
                    <tr key={index} className="border-t border-white/20 hover:bg-white/10 transition-colors">
                      <td className="px-6 py-3 text-base text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.category}</td>
                      <td className="px-6 py-3 text-right text-base text-white font-semibold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.tuition.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3 text-right text-xl text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.total.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="fee-table mb-8">
            <h2 className="text-xl uppercase text-white font-bold mb-4 bg-violet-400/30 p-3 rounded-lg" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.05em' }}>II. Development Fees</h2>
            <div className="border-2 border-white/20 rounded-lg overflow-hidden bg-black/50">
              <table className="w-full">
                <thead className="bg-violet-300/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Particulars</th>
                    <th className="px-6 py-4 text-right text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {developmentFees.map((fee, index) => (
                    <tr key={index} className="border-t border-white/20 hover:bg-white/10 transition-colors">
                      <td className="px-6 py-3 text-base text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.name}</td>
                      <td className="px-6 py-3 text-right text-base text-white font-semibold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-white/30 bg-violet-300/30">
                    <td className="px-6 py-4 text-base uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Total</td>
                    <td className="px-6 py-4 text-right text-2xl text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>₹20,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="fee-table mb-8">
            <h2 className="text-xl uppercase text-white font-bold mb-4 bg-violet-400/30 p-3 rounded-lg" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.05em' }}>III. Examination Fees</h2>
            <div className="border-2 border-white/20 rounded-lg overflow-hidden bg-black/50">
              <table className="w-full">
                <tbody>
                  <tr className="border-t border-white/20 hover:bg-white/10 transition-colors">
                    <td className="px-6 py-4 text-base text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>CIE and Semester End Exam</td>
                    <td className="px-6 py-4 text-right text-2xl text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>₹4,200</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="fee-table">
            <h2 className="text-xl uppercase text-white font-bold mb-4 bg-violet-400/30 p-3 rounded-lg" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', letterSpacing: '0.05em' }}>IV. Hostel Fees (Annual)</h2>
            <div className="border-2 border-white/20 rounded-lg overflow-hidden bg-black/50">
              <table className="w-full">
                <thead className="bg-violet-300/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Block</th>
                    <th className="px-6 py-4 text-right text-sm uppercase text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {hostelFees.map((fee, index) => (
                    <tr key={index} className="border-t border-white/20 hover:bg-white/10 transition-colors">
                      <td className="px-6 py-4 text-base text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.name}</td>
                      <td className="px-6 py-4 text-right text-2xl text-white font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{fee.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeeStructureModal;
