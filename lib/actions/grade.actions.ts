'use server';

import { connectToDatabase } from '@/database/mongoose';
import Grade from '@/database/models/Grade';
import Student from '@/database/models/Student';
import Subject from '@/database/models/Subject';
import { getSession } from '../auth/session';

async function verifyFaculty() {
    const session = await getSession();
    if (!session || session.userType !== 'staff' || session.role !== 'FACULTY') {
        throw new Error('Unauthorized: Only Faculty can perform grading.');
    }
    return session;
}

/**
 * Get all students enrolled in a specific subject and semester.
 * Also fetches their existing grades for that subject if they exist.
 */
export async function getStudentsForSubjectGrade(subjectCode: string, semester: number) {
    try {
        const session = await verifyFaculty();
        await connectToDatabase();

        const upperSubjectCode = subjectCode.toUpperCase();

        // 1. Find all students registered for this subject (via currentSemester or registeredSubjects if implemented)
        // For now, we fetch students whose semester matches and department matches the subject's applicable branches
        // Or strictly if they have it in their registeredSubjects array.

        // Find the subject to know its branches
        const subjectResult = await Subject.findOne({ subjectCode: upperSubjectCode, semester }).lean() as any;
        if (!subjectResult) {
            return { success: false, error: 'Subject not found.' };
        }

        let studentQuery: any = {
            semester: semester.toString(),
            isRegistered: true
        };

        // Enforce department integrity: Faculty can only evaluate students from their own department
        studentQuery.department = session.department;

        // We assume students have `registeredSubjects` populated via Course Registration.
        // If not, we fallback to just their semester and department.
        const students = await Student.find({
            ...studentQuery,
            $or: [
                { registeredSubjects: upperSubjectCode },
                // Fallback: If registeredSubjects isn't fully populated yet, at least show students of the right sem/dept
                { registeredSubjects: { $exists: false } },
                { registeredSubjects: { $size: 0 } }
            ]
        }).sort({ usn: 1 }).lean();

        // 2. Fetch existing grades for these students
        const studentIds = students.map(s => s._id);
        const grades = await Grade.find({
            subjectCode: upperSubjectCode,
            semester,
            studentId: { $in: studentIds }
        }).lean();

        const gradeMap: Record<string, any> = {};
        grades.forEach((g: any) => {
            gradeMap[g.studentId.toString()] = g;
        });

        // 3. Merge data
        const enrichedStudents = students.map(s => ({
            _id: s._id,
            usn: s.usn,
            name: s.studentName,
            grade: gradeMap[s._id.toString()] || null
        }));

        return { success: true, students: JSON.parse(JSON.stringify(enrichedStudents)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Save marks for a specific exam type for a student.
 * Auto-calculates conversions and total grade.
 */
export async function saveStudentMarks(
    studentId: string,
    subjectCode: string,
    semester: number,
    examType: 'cie1' | 'cie2' | 'assignment' | 'see',
    rawMarks: number,
    questionMarks?: Record<string, number>
) {
    try {
        await verifyFaculty();
        await connectToDatabase();

        const upperSubjectCode = subjectCode.toUpperCase();

        // Perform safe conversions based on VTU rules
        let convertedMarks = 0;
        if (examType === 'cie1' || examType === 'cie2') {
            rawMarks = Math.min(Math.max(0, rawMarks), 40); // clamp 0-40
            convertedMarks = Math.ceil(rawMarks / 2); // max 20
        } else if (examType === 'assignment') {
            rawMarks = Math.min(Math.max(0, rawMarks), 20); // clamp 0-20
            convertedMarks = Math.ceil(rawMarks / 2); // max 10
        } else if (examType === 'see') {
            rawMarks = Math.min(Math.max(0, rawMarks), 100); // clamp 0-100
            convertedMarks = Math.ceil(rawMarks / 2); // max 50
        }

        // Find or create Grade document
        let gradeRecord = await Grade.findOne({
            studentId,
            subjectCode: upperSubjectCode,
            semester
        });

        if (!gradeRecord) {
            gradeRecord = new Grade({
                studentId,
                subjectCode: upperSubjectCode,
                semester,
            });
        }

        // Update the specific component
        gradeRecord[examType] = {
            rawMarks,
            convertedMarks,
            questionMarks: questionMarks || {}
        };

        // Recalculate Totals
        const cie1 = gradeRecord.cie1?.convertedMarks || 0;
        const cie2 = gradeRecord.cie2?.convertedMarks || 0;
        const assmt = gradeRecord.assignment?.convertedMarks || 0;
        const see = gradeRecord.see?.convertedMarks || 0;

        const totalMerged = cie1 + cie2 + assmt + see;
        gradeRecord.totalMarks = Math.min(totalMerged, 100);

        // Grade Point calculation (VTU Table 6.5)
        let gp = 0;
        let lg = 'F';

        if (totalMerged >= 90) { gp = 10; lg = 'O'; }
        else if (totalMerged >= 80) { gp = 9; lg = 'A+'; }
        else if (totalMerged >= 70) { gp = 8; lg = 'A'; }
        else if (totalMerged >= 60) { gp = 7; lg = 'B+'; }
        else if (totalMerged >= 55) { gp = 6; lg = 'B'; }
        else if (totalMerged >= 50) { gp = 5; lg = 'C'; }
        else if (totalMerged >= 40) { gp = 4; lg = 'P'; }

        // Failsafe for SEE minimums (Table 8.1 says SEE must be >= 35%)
        // Raw SEE must be >= 35 out of 100
        if (gradeRecord.see && gradeRecord.see.rawMarks < 35) {
            gp = 0;
            lg = 'F';
        }

        gradeRecord.gradePoint = gp;
        gradeRecord.letterGrade = lg;

        await gradeRecord.save();

        return { success: true, message: 'Marks saved successfully.' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Bulk save marks (optional helper for the UI to save entire class table at once)
 */
export async function bulkSaveMarks(
    subjectCode: string,
    semester: number,
    examType: 'cie1' | 'cie2' | 'assignment' | 'see',
    marksData: Array<{ studentId: string; rawMarks: number; questionMarks?: Record<string, number> }>
) {
    try {
        await verifyFaculty();
        await connectToDatabase();

        const results = [];
        for (const data of marksData) {
            const res = await saveStudentMarks(data.studentId, subjectCode, semester, examType, data.rawMarks, data.questionMarks);
            results.push(res);
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return { success: false, error: `${failed.length} marks failed to save.`, details: failed };
        }

        return { success: true, message: 'All marks saved successfully.' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
