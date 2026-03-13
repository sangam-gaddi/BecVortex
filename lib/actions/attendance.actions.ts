'use server';

import { connectToDatabase } from '@/database/mongoose';
import AttendanceRecord from '@/database/models/AttendanceRecord';
import Student from '@/database/models/Student';
import { getSession } from '../auth/session';
import Subject from '@/database/models/Subject';

async function verifyFaculty() {
    const session = await getSession();
    if (!session || session.userType !== 'staff' || session.role !== 'FACULTY') {
        throw new Error('Unauthorized: Only Faculty can take attendance.');
    }
    return session;
}

/**
 * Fetch all students enrolled in a specific class to prepare for attendance.
 */
export async function getStudentsForAttendance(subjectCode: string, semester: number) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const upperSubjectCode = subjectCode.toUpperCase();

        const subjectResult = await Subject.findOne({ subjectCode: upperSubjectCode, semester }).lean() as any;
        if (!subjectResult) {
            return { success: false, error: 'Subject not found.' };
        }

        let studentQuery: any = {
            semester: semester.toString(),
        };

        // Enforce department integrity: Faculty can only see students from their own department
        studentQuery.department = session.department;

        const students = await Student.find({
            ...studentQuery,
            $or: [
                { registeredSubjects: upperSubjectCode },
                { registeredSubjects: { $exists: false } },
                { registeredSubjects: { $size: 0 } }
            ]
        }).select('_id usn studentName').sort({ usn: 1 }).lean();

        return { success: true, students: JSON.parse(JSON.stringify(students)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Submit rapid attendance.
 * Takes the array of ABSENT student IDs, automatically marks the rest as PRESENT.
 */
export async function submitRapidAttendance({
    subjectCode,
    semester,
    topicTaught,
    date,
    timeSlot,
    absentStudentIds
}: {
    subjectCode: string;
    semester: number;
    topicTaught: string;
    date: Date;
    timeSlot: string;
    absentStudentIds: string[];
}) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const upperSubjectCode = subjectCode.toUpperCase();

        // Get all enrolled students
        const allStudentsRes = await getStudentsForAttendance(subjectCode, semester);
        if (!allStudentsRes.success) throw new Error(allStudentsRes.error);

        const allStudents = allStudentsRes.students || [];
        const allStudentIds = allStudents.map((s: any) => s._id.toString());

        // Validate that absent IDs are actually enrolled
        const validAbsentIds = absentStudentIds.filter(id => allStudentIds.includes(id));

        // Calculate present students (All - Absent)
        const presentStudentIds = allStudentIds.filter((id: string) => !validAbsentIds.includes(id));

        // Create the record
        const record = await AttendanceRecord.create({
            facultyId: session.userId,
            subjectCode: upperSubjectCode,
            semester,
            department: session.department || 'UNKNOWN',
            topicTaught,
            date,
            timeSlot,
            presentStudents: presentStudentIds,
            absentStudents: validAbsentIds
        });

        return {
            success: true,
            message: `Attendance logged. ${presentStudentIds.length} Present, ${validAbsentIds.length} Absent.`
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Get history of attendance records for a specific class,
 * including full absent/present student name+USN breakdowns per session.
 */
export async function getAttendanceHistory(subjectCode: string, semester: number) {
    try {
        await verifyFaculty();
        await connectToDatabase();

        const records = await AttendanceRecord.find({
            subjectCode: subjectCode.toUpperCase(),
            semester
        })
            .populate('facultyId', 'fullName')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        // Collect all unique student IDs across all records
        const allStudentIds = new Set<string>();
        records.forEach((r: any) => {
            (r.presentStudents || []).forEach((id: any) => allStudentIds.add(id.toString()));
            (r.absentStudents || []).forEach((id: any) => allStudentIds.add(id.toString()));
        });

        // Fetch student info in bulk
        const studentMap = new Map<string, any>();
        if (allStudentIds.size > 0) {
            const students = await Student.find({ _id: { $in: [...allStudentIds] } })
                .select('_id usn studentName')
                .lean();
            students.forEach((s: any) => studentMap.set(s._id.toString(), s));
        }

        const toStudentDto = (id: any) => {
            const s = studentMap.get(id.toString());
            return { _id: id.toString(), usn: s?.usn || '?', name: s?.studentName || 'Unknown' };
        };

        const formatted = records.map((r: any) => ({
            _id: r._id.toString(),
            date: r.date,
            topicTaught: r.topicTaught,
            timeSlot: r.timeSlot,
            facultyName: (r.facultyId as any)?.fullName || 'Unknown',
            presentCount: r.presentStudents?.length || 0,
            absentCount: r.absentStudents?.length || 0,
            totalCount: (r.presentStudents?.length || 0) + (r.absentStudents?.length || 0),
            presentStudents: (r.presentStudents || []).map(toStudentDto)
                .sort((a: any, b: any) => a.usn.localeCompare(b.usn)),
            absentStudents: (r.absentStudents || []).map(toStudentDto)
                .sort((a: any, b: any) => a.usn.localeCompare(b.usn)),
        }));

        return { success: true, history: JSON.parse(JSON.stringify(formatted)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Get data for the Overall Attendance Book:
 * - all enrolled students (sorted by USN)
 * - all attendance sessions (chronological) with presentIds / absentIds arrays
 */
export async function getOverallAttendanceBook(subjectCode: string, semester: number) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const upperCode = subjectCode.toUpperCase();

        // Get enrolled students ordered by USN
        const enrolledStudents = await Student.find({
            semester: semester.toString(),
            department: session.department,
            $or: [
                { registeredSubjects: upperCode },
                { registeredSubjects: { $exists: false } },
                { registeredSubjects: { $size: 0 } },
            ],
        }).select('_id usn studentName').sort({ usn: 1 }).lean();

        // Get all sessions in chronological order
        const records = await AttendanceRecord.find({ subjectCode: upperCode, semester })
            .sort({ date: 1, createdAt: 1 })
            .lean();

        const sessions = records.map((r: any) => ({
            _id: r._id.toString(),
            date: r.date,
            timeSlot: r.timeSlot,
            topicTaught: r.topicTaught,
            presentIds: (r.presentStudents || []).map((id: any) => id.toString()),
            absentIds: (r.absentStudents || []).map((id: any) => id.toString()),
        }));

        const students = enrolledStudents.map((s: any) => ({
            _id: s._id.toString(),
            usn: s.usn,
            name: s.studentName,
        }));

        return { success: true, students: JSON.parse(JSON.stringify(students)), sessions: JSON.parse(JSON.stringify(sessions)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
