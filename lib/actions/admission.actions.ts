"use server"

import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import { getSession } from '../auth/session';
import { revalidatePath } from 'next/cache';

// Data strictly follows the BEC Regulations format
export type AdmissionData = {
    studentName: string;
    email?: string;
    phone?: string;
    permanentAddress?: string;
    department: string; // Branch from ['CV', 'ME', 'EE', 'CS', 'EC', 'IP', 'IS', 'BT', 'AI', 'AU', 'UE']
    semester: string;   // '1' or '3' based on entryType
    degree: string;     // Usually 'B.E.'
    stdType: string;    // 'Regular'
    casteCat: string;
    entryType: 'Regular 1st Year' | 'Lateral Entry - Diploma' | 'Lateral Entry - B.Sc.';
    paymentCategory: 'KCET' | 'COMEDK' | 'Management' | 'NRI';
    entranceExamRank?: string;
    previousCollegeName?: string;
    previousMarks?: string;
    idNo?: string;
    admissionID?: string;
};

function generateCSN(year: string, progCode: string, sequence: number): string {
    // Format: Year (4) + Prog (1) + Serial (3) = 8 digits (e.g., 20240001)
    const paddedSequence = sequence.toString().padStart(3, '0');
    return `${year}${progCode}${paddedSequence}`;
}

export async function registerStudent(data: AdmissionData) {
    try {
        // 1. Session Verification (Security & RBAC Check)
        const session = await getSession();

        if (!session || session.userType !== 'staff' || session.role !== 'OFFICER' || session.department !== 'ADMISSION') {
            return { success: false, error: 'Unauthorized: Only Admission Officers can register students.' };
        }

        await connectToDatabase();

        // 2. Generate CSN (College Serial Number)
        // Find the current highest serial for the year to increment
        const currentYear = new Date().getFullYear().toString();
        const progCode = '0'; // Assuming '0' is for B.E. UG

        const lastStudent = await Student.findOne({
            csn: { $regex: `^${currentYear}${progCode}` }
        }).sort({ csn: -1 }).select('csn').lean();

        let nextSequence = 1;
        if (lastStudent && lastStudent.csn) {
            const lastSequence = parseInt(lastStudent.csn.slice(-3), 10);
            nextSequence = lastSequence + 1;
        }

        const csn = generateCSN(currentYear, progCode, nextSequence);

        // 3. Assemble complete student record
        // usn is explicitly omitted because it isn't assigned yet by VTU
        const newStudent = new Student({
            studentName: data.studentName,
            email: data.email?.toLowerCase(),
            phone: data.phone,
            permanentAddress: data.permanentAddress,
            department: data.department,
            semester: data.entryType.includes('Lateral') ? '3' : '1', // Enforce regulation logic
            degree: data.degree || 'B.E.',
            stdType: data.stdType || 'Regular',
            casteCat: data.casteCat,
            csn: csn,
            idNo: data.idNo || csn,
            admissionID: data.admissionID || `ADM-${csn}`,
            paymentCategory: data.paymentCategory,
            entryType: data.entryType,
            entranceExamRank: data.entranceExamRank,
            previousCollegeName: data.previousCollegeName,
            previousMarks: data.previousMarks,
            isRegistered: false, // They must complete onboarding later
            paidFees: []
        });

        await newStudent.save();

        revalidatePath('/'); // Only if UI needs invalidation

        return {
            success: true,
            studentId: newStudent._id.toString(),
            csn: newStudent.csn,
            message: `Student registered successfully. Assigned CSN: ${newStudent.csn}`
        };

    } catch (error: any) {
        console.error('Admission error:', error);
        // Trap unique constraint errors if email is somehow duplicated early
        if (error.code === 11000) {
            return { success: false, error: 'A student with this Email or identifier already exists.' };
        }
        return { success: false, error: error.message || 'Failed to complete admission process.' };
    }
}
