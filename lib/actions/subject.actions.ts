'use server';

import { connectToDatabase } from '@/database/mongoose';
import Subject from '@/database/models/Subject';
import Student from '@/database/models/Student';
import { getSession } from '../auth/session';
import { revalidatePath } from 'next/cache';

// --- Types ---
export type SubjectData = {
    _id?: string;
    subjectCode: string;
    title: string;
    credits: number;
    category: string;
    semester: number;
    applicableBranches: string[];
};

// --- Security Helpers ---
async function verifySubjectRegistrationOfficer() {
    const session = await getSession();
    // We allow any Officer to access this, as filtering to their specific branch happens in the query logic.
    if (!session || session.userType !== 'staff' || session.role !== 'OFFICER') {
        throw new Error('Unauthorized Access: Only Subject Registration Officers can perform this action.');
    }
    return session;
}

// --- Public action to let the UI know who the Officer is (reads from JWT server-side) ---
export async function getOfficerSessionInfo() {
    try {
        const session = await verifySubjectRegistrationOfficer();
        return { success: true, department: session.department || '', role: session.role };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- CRUD Operations for Subject Directory ---

export async function createSubject(data: Omit<SubjectData, '_id'>) {
    try {
        await verifySubjectRegistrationOfficer();
        await connectToDatabase();

        const exists = await Subject.findOne({ subjectCode: data.subjectCode.toUpperCase() });
        if (exists) {
            return { success: false, error: 'A subject with this Subject Code already exists.' };
        }

        const subject = new Subject({
            ...data,
            subjectCode: data.subjectCode.toUpperCase(),
            category: data.category.toUpperCase(),
        });

        await subject.save();
        revalidatePath('/'); // or specific paths if routing is complex

        return { success: true, message: 'Subject added permanently to the directory.', subject: JSON.parse(JSON.stringify(subject)) };
    } catch (e: any) {
        console.error('Error creating subject:', e);
        return { success: false, error: e.message || 'Failed to create subject' };
    }
}

export async function getSubjects() {
    try {
        await connectToDatabase();
        // Allow anyone authenticated to view subjects, no strict officer-only check here.
        const subjects = await Subject.find({}).sort({ semester: 1, subjectCode: 1 }).lean();
        return { success: true, subjects: JSON.parse(JSON.stringify(subjects)) };
    } catch (e: any) {
        return { success: false, error: 'Database error fetching subjects' };
    }
}

export async function deleteSubject(subjectId: string) {
    try {
        await verifySubjectRegistrationOfficer();
        await connectToDatabase();

        await Subject.findByIdAndDelete(subjectId);
        revalidatePath('/');
        return { success: true, message: 'Subject deleted successfully.' };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to delete' };
    }
}

// --- Bulk Branch Operations ---

// This satisfies the 1st Year Overlap Rule and Sem 3+ Uniqueness rule.
export async function getBranchSubjectsForSemester(branch: string, semester: number) {
    try {
        await connectToDatabase();

        // Find subjects matching the semester AND where applicableBranches includes "ALL" or the specific branch.
        const subjects = await Subject.find({
            semester: semester,
            $or: [
                { applicableBranches: { $in: ['ALL'] } },
                { applicableBranches: { $in: [branch.toUpperCase()] } }
            ]
        }).lean();

        return JSON.parse(JSON.stringify(subjects)) as SubjectData[];
    } catch (e) {
        throw new Error('Could not fetch branch subjects');
    }
}

// Officer assigning all standard subjects to students in their assigned branch
export async function getStudentsForBranch(targetSemester: number) {
    try {
        const session = await verifySubjectRegistrationOfficer();
        await connectToDatabase();

        // Read branch from the VERIFIED JWT session - not from the client
        const officerBranch = session.department?.toUpperCase();
        if (!officerBranch) {
            return { success: false, error: 'Your account does not have a branch assigned. Please contact the HOD.' };
        }

        // Find students in this branch and this specific semester
        const students = await Student.find({
            department: officerBranch,
            currentSemester: targetSemester
        }).select('studentName usn csn backlogs registeredSubjects currentSemester').lean();

        return { success: true, students: JSON.parse(JSON.stringify(students)), officerBranch };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// Bulk assign standard subjects to students WITHOUT backlogs (As requested by Prompt Rule #1/App #1)
export async function bulkAssignSubjectsToCleanStudents(targetSemester: number) {
    try {
        const session = await verifySubjectRegistrationOfficer();
        await connectToDatabase();

        // Read branch from the VERIFIED JWT session - not from the client
        const officerBranch = session.department?.toUpperCase();
        if (!officerBranch) {
            return { success: false, error: 'Your account does not have a branch assigned. Please contact the HOD.' };
        }

        // 1. Get the standard subjects for this branch + semester
        const standardSubjects = await getBranchSubjectsForSemester(officerBranch, targetSemester);
        if (!standardSubjects || standardSubjects.length === 0) {
            return { success: false, error: `No subjects found in the database for Branch ${officerBranch} Sem ${targetSemester}` };
        }

        const standardSubjectCodes = standardSubjects.map(s => s.subjectCode);

        // 2. Find all students in this branch+semester who have NO backlogs AND haven't been registered yet
        const result = await Student.updateMany(
            {
                department: officerBranch,
                currentSemester: targetSemester,
                backlogs: { $size: 0 }, // ONLY clean students
                $expr: { $lt: [{ $size: "$registeredSubjects" }, standardSubjectCodes.length] } // Only update if they don't have all subjects yet
            },
            {
                $set: { registeredSubjects: standardSubjectCodes }
            }
        );

        return {
            success: true,
            message: `Successfully bulk-assigned standard subjects to ${result.modifiedCount} clean students without backlogs.`,
            modifiedCount: result.modifiedCount
        };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message || 'Bulk assignment failed' };
    }
}
