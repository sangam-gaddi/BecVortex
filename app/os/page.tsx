import dynamic from 'next/dynamic';
import '@/components/os/os-styles.css'; // Load OS-specific styles only on this page

// We MUST dynamically import the root App component with SSR disabled
// because the OS simulator heavily relies on window, document, Howler, and localStorage
const OSEntry = dynamic(
    () => import('@/components/os/App').then((mod) => mod.default),
    { ssr: false, loading: () => <div style={{ width: '100vw', height: '100vh', backgroundColor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'white', fontFamily: 'monospace' }}>Booting BEC VORTEX OS Kernel...</p></div> }
);

export const metadata = {
    title: 'BEC VORTEX OS',
    description: 'High-fidelity OS hacking simulator',
};

export default function OSPage() {
    return (
        <main className="w-screen h-screen overflow-hidden bg-black text-white m-0 p-0">
            <OSEntry />
        </main>
    );
}
