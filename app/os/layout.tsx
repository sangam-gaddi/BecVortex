export default function OSLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="os-wrapper w-full h-full m-0 p-0 overflow-hidden">
            {/* 
        This layout intentionally HAS NO Navbar or Footer.
        It isolates the OS completely from the rest of the website. 
      */}
            {children}
        </div>
    );
}
