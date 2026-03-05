'use server';

import { connectToDatabase } from '@/database/mongoose';
import Faculty from '@/database/models/Faculty';
import User from '@/database/models/User';
import Subject from '@/database/models/Subject';
import Student from '@/database/models/Student';
import { getSession } from '../auth/session';

// --- Security Helpers ---

async function verifyHOD() {
    const session = await getSession();
    if (!session || session.userType !== 'staff' || session.role !== 'HOD') {
        throw new Error('Unauthorized: Only HODs can perform this action.');
    }
    return session;
}

async function verifyFaculty() {
    const session = await getSession();
    if (!session || session.userType !== 'staff' || session.role !== 'FACULTY') {
        throw new Error('Unauthorized: Only Faculty can access this.');
    }
    return session;
}

// --- HOD Actions ---

/**
 * Get all Faculty profiles in the HOD's department.
 * Auto-creates Faculty documents for FACULTY users who don't have one yet.
 */
export async function getDepartmentFaculties() {
    try {
        const session = await verifyHOD();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();
        if (!dept) return { success: false, error: 'No department assigned to your account.' };

        // Find all FACULTY users in this department
        const facultyUsers = await User.find({
            role: 'FACULTY',
            department: dept,
            isActive: true,
        }).lean();

        // Auto-create missing Faculty profiles
        for (const user of facultyUsers) {
            const exists = await Faculty.findOne({ userId: user._id });
            if (!exists) {
                await Faculty.create({
                    userId: user._id,
                    employeeId: `FAC-${dept}-${String(user._id).slice(-4).toUpperCase()}`,
                    name: user.fullName,
                    department: dept,
                    assignedClasses: [],
                });
            }
        }

        // Return all faculty profiles for this department
        const faculties = await Faculty.find({ department: dept })
            .sort({ name: 1 })
            .lean();

        return { success: true, faculties: JSON.parse(JSON.stringify(faculties)), department: dept };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Assign a subject to a faculty member.
 */
export async function assignSubjectToFaculty(
    facultyId: string,
    subjectCode: string,
    semester: number,
    section?: string
) {
    try {
        const session = await verifyHOD();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();

        // Validate faculty belongs to the same department
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) return { success: false, error: 'Faculty not found.' };
        if (faculty.department !== dept) return { success: false, error: 'Faculty is not in your department.' };

        // Validate subject exists
        const subject = await Subject.findOne({ subjectCode: subjectCode.toUpperCase() });
        if (!subject) return { success: false, error: `Subject ${subjectCode} does not exist in the database.` };

        // Check for duplicate assignment
        const alreadyAssigned = faculty.assignedClasses.some(
            (c) => c.subjectCode === subjectCode.toUpperCase() && c.semester === semester && (c.section || '') === (section || '')
        );
        if (alreadyAssigned) return { success: false, error: 'This subject is already assigned to this faculty for this semester/section.' };

        // Push the assignment
        faculty.assignedClasses.push({
            subjectCode: subjectCode.toUpperCase(),
            semester,
            section: section || undefined,
        });
        await faculty.save();

        return {
            success: true,
            message: `Assigned ${subject.title} (${subjectCode}) to ${faculty.name} for Sem ${semester}${section ? ` Section ${section}` : ''}.`,
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Remove a subject assignment from a faculty member.
 */
export async function removeSubjectFromFaculty(
    facultyId: string,
    subjectCode: string,
    semester: number
) {
    try {
        const session = await verifyHOD();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();

        const faculty = await Faculty.findById(facultyId);
        if (!faculty) return { success: false, error: 'Faculty not found.' };
        if (faculty.department !== dept) return { success: false, error: 'Faculty is not in your department.' };

        const beforeCount = faculty.assignedClasses.length;
        faculty.assignedClasses = faculty.assignedClasses.filter(
            (c) => !(c.subjectCode === subjectCode.toUpperCase() && c.semester === semester)
        ) as any;
        const afterCount = faculty.assignedClasses.length;

        if (beforeCount === afterCount) {
            return { success: false, error: 'Assignment not found.' };
        }

        await faculty.save();
        return { success: true, message: `Removed ${subjectCode} Sem ${semester} from ${faculty.name}.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Faculty fetches their own profile with full subject details.
 */
export async function getMyFacultyProfile() {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        let faculty = await Faculty.findOne({ userId: session.userId }).lean() as any;

        if (!faculty) {
            // Auto-create profile if it doesn't exist yet
            const user = await User.findById(session.userId).lean() as any;
            if (!user) return { success: false, error: 'User not found.' };

            faculty = await Faculty.create({
                userId: user._id,
                employeeId: `FAC-${(user.department || 'XX').toUpperCase()}-${String(user._id).slice(-4).toUpperCase()}`,
                name: user.fullName,
                department: (user.department || '').toUpperCase(),
                assignedClasses: [],
            });
            faculty = faculty.toObject();
        }

        // Fetch full subject details for each assigned class
        const subjectCodes = (faculty.assignedClasses || []).map((c: any) => c.subjectCode);
        const subjects = subjectCodes.length > 0
            ? await Subject.find({ subjectCode: { $in: subjectCodes } }).lean()
            : [];

        const subjectMap: Record<string, any> = {};
        subjects.forEach((s: any) => { subjectMap[s.subjectCode] = s; });

        // Merge full subject info into each assigned class
        const enrichedClasses = (faculty.assignedClasses || []).map((c: any) => ({
            ...c,
            subjectDetails: subjectMap[c.subjectCode] || null,
        }));

        return {
            success: true,
            faculty: {
                _id: faculty._id,
                employeeId: faculty.employeeId,
                name: faculty.name,
                department: faculty.department,
            },
            assignedClasses: JSON.parse(JSON.stringify(enrichedClasses)),
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Fetch available subjects that can be assigned (for the modal).
 * Returns subjects applicable to the HOD's department.
 */
export async function getAssignableSubjects() {
    try {
        const session = await verifyHOD();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();
        if (!dept) return { success: false, error: 'No department assigned.' };

        const subjects = await Subject.find({
            $or: [
                { applicableBranches: { $in: ['ALL'] } },
                { applicableBranches: { $in: [dept] } },
            ]
        }).sort({ semester: 1, subjectCode: 1 }).lean();

        return { success: true, subjects: JSON.parse(JSON.stringify(subjects)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- Class Representative (CR) Management Actions ---

/**
 * Fetch students for a specific semester in the faculty's department to assign a CR.
 */
export async function getStudentsBySemesterForCR(semester: number) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();
        if (!dept) return { success: false, error: 'No department assigned.' };

        // Find students in this department and semester
        const students = await Student.find({
            department: dept,
            currentSemester: semester
        }).select('_id usn studentName isCR crForSemester').sort({ usn: 1 }).lean();

        return { success: true, students: JSON.parse(JSON.stringify(students)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Assign a student as the Class Representative (CR) for a semester.
 * Ensures only one CR exists per semester in the department.
 */
export async function assignCR(studentId: string, semester: number) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();
        if (!dept) return { success: false, error: 'No department assigned.' };

        // 1. Remove existing CR for this semester and department
        await Student.updateMany(
            { department: dept, crForSemester: semester, isCR: true },
            { $set: { isCR: false, crForSemester: null } }
        );

        // 2. Assign the new CR
        const updated = await Student.findOneAndUpdate(
            { _id: studentId, department: dept },
            { $set: { isCR: true, crForSemester: semester } },
            { new: true }
        );

        if (!updated) return { success: false, error: 'Student not found or mismatch in department.' };

        return { success: true, message: `${updated.studentName} is now the CR for Semester ${semester}.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Revoke CR privileges from a student.
 */
export async function removeCR(studentId: string) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const dept = session.department?.toUpperCase();

        const updated = await Student.findOneAndUpdate(
            { _id: studentId, department: dept, isCR: true },
            { $set: { isCR: false, crForSemester: null } },
            { new: true }
        );

        if (!updated) return { success: false, error: 'Student is not a CR or mismatch in department.' };

        return { success: true, message: `${updated.studentName} is no longer a CR.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
