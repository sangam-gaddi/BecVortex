import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Types for the data we need
interface ReceiptData {
    receiptNo: string;
    transactionId: string; // Blockchain Hash or Bank Ref ID
    paymentDate: Date;
    amount: number;
    paymentMethod: string; // 'crypto' | 'cash' | 'upi'
    feeItems: Array<{ name: string; amount: number }>;
    channel: 'ONLINE' | 'CASH';
}

interface StudentData {
    usn: string;
    name: string;
    branch: string; // Dept/Sem
    degree: string; // B.E.
    category: string; // GM/SC/ST
}

export const generateReceipt = (data: ReceiptData, student: StudentData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Helper for centered text
    const centerText = (text: string, y: number, fontSize: number = 10, font: string = 'helvetica', style: string = 'normal') => {
        doc.setFont(font, style);
        doc.setFontSize(fontSize);
        const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
    };

    // --- Header Section ---
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, 35); // Main Header Box

    // Top Line: A/C No
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('A/C No: 37550100002932 BANK OF BARODA', 15, 16);
    doc.line(10, 18, pageWidth - 10, 18);

    // College Details
    // Logo placeholder (Left) - Replacing with text if image not available, or drawing a circle
    doc.circle(25, 30, 8);
    doc.setFontSize(6);
    doc.text('BEC LOGO', 21, 30);

    // Center Text
    centerText('Basaveshwar Engineering College', 24, 14, 'helvetica', 'bold');
    centerText('(Autonomous)', 29, 11, 'helvetica', 'normal');
    centerText('Bagalkot-587102, Karnataka, India', 34, 11, 'helvetica', 'normal');

    // "Student Copy"
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('MF', 15, 42);
    doc.text('Student Copy', pageWidth - 45, 42);

    doc.line(10, 45, pageWidth - 10, 45); // Separator

    // --- Student Details Grid ---
    const startY = 45;
    const col1X = 15;
    const col2X = 100; // Second column start
    const rowHeight = 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Row 1
    doc.text('Receipt No:', col1X, startY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(data.receiptNo, col1X + 25, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.text('USN:', col2X, startY + 6);
    doc.setFont('helvetica', 'bold');
    doc.text(student.usn, col2X + 25, startY + 6);

    // Row 2
    doc.setFont('helvetica', 'normal');
    doc.text('CSN:', col1X, startY + 12);
    doc.text('2023010329', col1X + 25, startY + 12); // Hardcoded/Placeholder?

    doc.text('Id.No:', col2X, startY + 12);
    doc.text('12182', col2X + 25, startY + 12); // Placeholder

    // Row 3 (Payment Category / Caste)
    doc.text('Payment Cat:', col1X, startY + 18);
    doc.text('COMEDK UnAided', col1X + 25, startY + 18);

    doc.text('Caste Cat:', col2X, startY + 18);
    doc.text(student.category, col2X + 25, startY + 18);

    // Row 4 (Degree / Branch)
    doc.text('Degree:', col1X, startY + 24);
    doc.text(student.degree, col1X + 25, startY + 24);

    doc.text('Dept/Sem:', col2X, startY + 24);
    doc.text(student.branch, col2X + 25, startY + 24);

    // Row 5 (StdType / Date)
    doc.text('StdType:', col1X, startY + 30);
    doc.text('Regular', col1X + 25, startY + 30);

    doc.text('Date:', col2X, startY + 30);
    doc.text(data.paymentDate.toLocaleDateString(), col2X + 25, startY + 30);

    // Row 6 (Name)
    doc.line(10, startY + 32, pageWidth - 10, startY + 32);
    doc.text('Student Name:', col1X, startY + 37);
    doc.setFont('helvetica', 'bold');
    doc.text(student.name.toUpperCase(), col1X + 30, startY + 37);
    doc.line(10, startY + 40, pageWidth - 10, startY + 40);

    // --- Particulars Table ---
    // @ts-ignore
    autoTable(doc, {
        startY: startY + 42,
        head: [['Sl.No.', 'Particulars', 'Amount']],
        body: data.feeItems.map((item, index) => [
            index + 1,
            item.name,
            item.amount.toFixed(2)
        ]),
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 15 },
            2: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 10, right: 10 }
    });

    // Get extraction point from autoTable
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY || 150;

    // --- Total & Words ---
    doc.line(10, finalY + 5, pageWidth - 10, finalY + 5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rupees ${numberToWords(data.amount)} Only`, 15, finalY + 10);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.paymentMethod === 'cash' ? 'Cash' : 'Total'} Amount: ${data.amount.toFixed(1)}`, 15, finalY + 18);

    doc.rect(10, finalY + 22, pageWidth - 20, 15);
    doc.setFontSize(8);
    doc.text('DD/Cheque No.', 15, finalY + 26);
    doc.text('Date', 60, finalY + 26);
    doc.text('Issuing Bank', 100, finalY + 26);
    doc.text('Amt.', 150, finalY + 26);

    // Fill if applicable
    if (data.paymentMethod === 'crypto') {
        doc.text(data.transactionId.substring(0, 15) + '...', 15, finalY + 32);
        doc.text('ETH/Sepolia', 100, finalY + 32);
    } else if (data.paymentMethod === 'cash') {
        doc.text(data.transactionId, 15, finalY + 32); // Bank Ref
        doc.text('Bank of Baroda', 100, finalY + 32);
    }

    // --- Stamp & Signature ---
    // Stamp
    doc.setDrawColor(128, 0, 128); // Purple
    doc.setLineWidth(0.5);
    doc.circle(45, finalY + 60, 15);
    doc.setFontSize(8);
    doc.setTextColor(128, 0, 128);
    doc.text('BANK OF BARODA', 35, finalY + 55);
    doc.text('PAID', 40, finalY + 61);
    doc.text(data.paymentDate.toLocaleDateString(), 38, finalY + 65);

    // Date Stamp (User's style: "7 OCT 2025")
    doc.setFontSize(14);
    doc.setFont('courier', 'bold');
    doc.text(data.paymentDate.getDate() + ' ' + data.paymentDate.toLocaleString('default', { month: 'short' }).toUpperCase() + ' ' + data.paymentDate.getFullYear(), 40, finalY - 10, { angle: 10 });

    doc.setTextColor(0, 0, 0); // Reset black

    // Signatures
    doc.line(10, finalY + 80, pageWidth - 10, finalY + 80); // Bottom line

    doc.setFontSize(7);
    doc.text(`This report is generated by System ID ${data.transactionId.substring(0, 8)} for Academic Year 2025-2026`, 15, finalY + 75);

    doc.text('Sign A/C Asst.', 15, finalY + 85);
    doc.text('Sign of Remitter', 80, finalY + 85);
    doc.text('Sign of Cashier', 150, finalY + 85);

    // Digital Sig
    doc.setFont('times', 'italic');
    doc.text('DigitalSig', 155, finalY + 80);

    // Save the PDF
    doc.save(`Receipt_${data.receiptNo}.pdf`);
};

// Helper to convert number to words (Simplified)
// Helper to convert number to words (Robust)
function numberToWords(amount: number): string {
    const a = [
        '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
        'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const num = Math.floor(amount);
    if (!num) return 'Zero';

    const convert = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 ? 'and ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 ? convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 ? convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 ? convert(n % 10000000) : '');
    };

    return convert(num).trim();
}
