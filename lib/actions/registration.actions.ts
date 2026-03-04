'use server';

import { connectToDatabase } from '@/database/mongoose';
import RegistrationRequest from '@/database/models/RegistrationRequest';
import Student from '@/database/models/Student';
import Subject from '@/database/models/Subject';
import { getSession } from '../auth/session';
import { revalidatePath } from 'next/cache';

// --- Security Helpers ---
async function verifyStudentSession() {
    const session = await getSession();
    if (!session || session.userType !== 'student') {
        throw new Error('Unauthorized Access: Only Students can perform this action.');
    }
    return session;
}

async function verifySubjectRegistrationOfficer() {
    const session = await getSession();
    // We allow any Officer to access this, as filtering to their specific branch happens in the query logic.
    if (!session || session.userType !== 'staff' || session.role !== 'OFFICER') {
        throw new Error('Unauthorized Access: Only Subject Registration Officers can perform this action.');
    }
    return session;
}

// ==========================================
// STUDENT ACTIONS
// ==========================================

export async function submitRegistrationRequest({ regularSubjects, requestedBacklogs, semester, branch }: { regularSubjects: string[], requestedBacklogs: string[], semester: number, branch: string }) {
    try {
        const session = await verifyStudentSession();
        await connectToDatabase();

        // Server-Side Strict Validation: Max 2 Backlogs
        if (requestedBacklogs.length > 2) {
            return { success: false, error: 'A maximum of 2 backlog subjects can be submitted per semester request.' };
        }

        const student = await Student.findById(session.userId);
        if (!student) return { success: false, error: 'Student record not found.' };

        // Ensure the student hasn't already submitted a pending request
        const existingRequest = await RegistrationRequest.findOne({
            studentId: session.userId,
            semester: semester,
            status: 'PENDING'
        });

        if (existingRequest) {
            return { success: false, error: 'You already have a pending registration request for this semester.' };
        }

        const newRequest = new RegistrationRequest({
            studentId: student._id,
            branch: student.department.toUpperCase(), // Directing purely to their department
            semester: semester,
            regularSubjects: regularSubjects,
            requestedBacklogs: requestedBacklogs,
            status: 'PENDING'
        });

        await newRequest.save();
        revalidatePath('/');

        return { success: true, message: 'Registration request submitted successfully to your Department Officer.' };
    } catch (e: any) {
        console.error('Submit Registration Error:', e);
        return { success: false, error: e.message || 'Failed to submit registration request.' };
    }
}

export async function getMyRegistrationRequests() {
    try {
        const session = await verifyStudentSession();
        await connectToDatabase();

        const requests = await RegistrationRequest.find({ studentId: session.userId }).sort({ createdAt: -1 }).lean();
        return { success: true, requests: JSON.parse(JSON.stringify(requests)) };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to fetch your requests.' };
    }
}

export async function getMyEnrolledSubjects() {
    try {
        const session = await verifyStudentSession();
        await connectToDatabase();

        const student = await Student.findById(session.userId)
            .select('studentName usn department currentSemester registeredSubjects backlogs')
            .lean() as any;

        if (!student) return { success: false, error: 'Student record not found.' };

        // If there are registered subjects, fetch their full details
        let enrolledSubjectDetails: any[] = [];
        if (student.registeredSubjects && student.registeredSubjects.length > 0) {
            enrolledSubjectDetails = await Subject.find({
                subjectCode: { $in: student.registeredSubjects }
            }).lean() as any[];
        }

        return {
            success: true,
            student: {
                name: student.studentName,
                usn: student.usn,
                department: student.department,
                currentSemester: student.currentSemester,
            },
            registeredSubjects: JSON.parse(JSON.stringify(enrolledSubjectDetails)),
            registeredCodes: student.registeredSubjects || [],
            backlogs: student.backlogs || [],
        };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to fetch enrolled subjects.' };
    }
}


// ==========================================
// OFFICER ACTIONS
// ==========================================

export async function getOfficerPendingRequests() {
    try {
        const session = await verifySubjectRegistrationOfficer();
        await connectToDatabase();

        // Read branch from the VERIFIED JWT session - not from the client
        const officerBranch = session.department?.toUpperCase();
        if (!officerBranch) {
            return { success: false, error: 'Your account does not have a branch assigned.' };
        }

        // Pure Branch Verification Routing Rule
        const requests = await RegistrationRequest.find({
            branch: officerBranch,
            status: 'PENDING'
        }).populate('studentId', 'studentName usn currentSemester backlogs').sort({ createdAt: -1 }).lean();

        return { success: true, requests: JSON.parse(JSON.stringify(requests)), officerBranch };
    } catch (e: any) {
        console.error('Fetch officer requests error:', e);
        return { success: false, error: e.message || 'Failed to fetch branch requests.' };
    }
}

export async function processRegistrationRequest(requestId: string, action: 'APPROVED' | 'REJECTED', officerRemarks?: string) {
    try {
        await verifySubjectRegistrationOfficer();
        await connectToDatabase();

        const request = await RegistrationRequest.findById(requestId);
        if (!request) return { success: false, error: 'Request not found.' };
        if (request.status !== 'PENDING') return { success: false, error: 'Request is already processed.' };

        request.status = action;
        if (officerRemarks) request.officerRemarks = officerRemarks;

        // If APPROVED, we fulfill the action by injecting the registered subjects back into the Student record
        if (action === 'APPROVED') {
            const student = await Student.findById(request.studentId);
            if (student) {
                // Combine regulars and backlogs chosen by the student into their active registered list
                const allSubjects = [...request.regularSubjects, ...request.requestedBacklogs];

                // Assign to student
                student.registeredSubjects = allSubjects;

                // OPTIONAL but standard: Remove the approved backlogs from their "pending backlogs" array
                student.backlogs = student.backlogs.filter(b => !request.requestedBacklogs.includes(b));

                await student.save();
            }
        }

        await request.save();
        revalidatePath('/'); // Refresh dashboard

        return { success: true, message: `Request successfully ${action.toLowerCase()}.` };
    } catch (e: any) {
        return { success: false, error: e.message || 'Failed to process request.' };
    }
}
