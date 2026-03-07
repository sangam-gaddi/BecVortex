"""
ARIA - BEC Vortex AI Voice Assistant

Role-aware voice assistant for BEC Vortex OS.
- Students: fee info, marks, navigation guidance
- Faculty: class schedule, marks entry, attendance, CIE workflow
- Officers: fee management guidance
- HOD/Master: system overview

Uses: LiveKit (rooms), Deepgram STT, Cerebras LLM, Cartesia TTS

Run with:
    python agent.py dev
"""

import asyncio
import json
import os
import logging
import pathlib
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    cartesia,
    deepgram,
    silero,
    openai,
)

# ──────────────────────────────────────────────────────────────
# Load env — try local .env first (robust on Windows multiprocessing
# spawns), then fall back to parent .env.local
# ──────────────────────────────────────────────────────────────
script_dir = pathlib.Path(__file__).parent.absolute()
local_env  = script_dir / ".env"
parent_env = script_dir.parent / ".env.local"

# override=True ensures spawned child processes get the values too
if local_env.exists():
    load_dotenv(str(local_env), override=True)
if parent_env.exists():
    load_dotenv(str(parent_env), override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aria-vortex")

logger.info(f"LIVEKIT_URL      : {os.getenv('LIVEKIT_URL', 'NOT SET')}")
logger.info(f"DEEPGRAM_API_KEY : {'SET' if os.getenv('DEEPGRAM_API_KEY') else 'NOT SET'}")
logger.info(f"CEREBRAS_API_KEY : {'SET' if os.getenv('CEREBRAS_API_KEY') else 'NOT SET'}")
logger.info(f"CARTESIA_API_KEY : {'SET' if os.getenv('CARTESIA_API_KEY') else 'NOT SET'}")


# ──────────────────────────────────────────────────────────────
# Context builders — one per role
# ──────────────────────────────────────────────────────────────

ABOUT_BEC_VORTEX = """
ABOUT BEC VORTEX OS:
BEC Vortex is a macOS-inspired campus OS for Bangalore Engineering College (BEC).
It runs at http://localhost:3001 in a browser.

Key features of the OS:
- Desktop with draggable app icons (left side of screen)
- Double-click an icon to open an app
- Each app opens in a resizable, draggable window
- Role-based access: each role sees only their apps
- Dock at the bottom for quick app launch

Apps available per role:
  STUDENT  → BEC Portal, BEC Billdesk (fees), Course Registration, Fee Verify, My Receipts
  FACULTY  → Faculty Dashboard, Marks Upload, Attendance Upload, CR Assigner, BEC Chat
  OFFICER  → Admit, Subject Directory, Subject Assigner, Re-Registration, Fees Checker, Edit Fee
  HOD      → Account Manager, Teaching Assigner
  MASTER   → All apps + DevCenter

What is VORA?
Vora is a separate AI text chat agent in BEC Vortex powered by a local Ollama LLM.
Vora can answer general questions, explain features, and assist with text-based queries.
I, ARIA, am the *voice* assistant — I speak to you directly. Vora types; I talk.
You can open Vora by clicking the chat bubble icon in the bottom-right corner of the OS.
"""

PAYMENT_METHODS = """
Available payment methods in BEC Billdesk:
1. Crypto (Sepolia ETH testnet) — Uses MetaMask/WalletConnect, sends 0.0001 ETH
2. UPI — Enter UPI ID, confirm payment
3. Net Banking — Select bank, enter credentials
4. Cash — Generates a challan to pay at the accounts counter

After any payment, a PDF receipt is automatically generated with BEC letterhead.
"""

STANDARD_FEES = [
    {"id": "tuition",     "name": "Tuition Fee",     "amount": 75000},
    {"id": "development", "name": "Development Fee",  "amount": 15000},
    {"id": "hostel",      "name": "Hostel Fee",       "amount": 45000},
    {"id": "examination", "name": "Examination Fee",  "amount": 5000},
]


def _fmt_inr(n):
    return f"₹{int(n):,}"


def _build_student_context(data: dict) -> str:
    name          = data.get("studentName", "Student")
    usn           = data.get("usn", "")
    dept          = data.get("department", "")
    sem           = data.get("semester", "")
    paid_ids      = data.get("paidFees", [])
    grades        = data.get("grades", [])        # list of {subjectName, subjectCode, semester, cie1, cie2, assignment, totalMarks, letterGrade}
    custom_fees   = data.get("customFees", [])    # list of {name, amount, isPaid, dueDate, description}
    payment_hist  = data.get("paymentHistory", []) # list of {amount, paymentMethod, createdAt, feeIds}

    # Standard fees
    pending_std = [f for f in STANDARD_FEES if f["id"] not in paid_ids]
    paid_std    = [f for f in STANDARD_FEES if f["id"] in paid_ids]

    # Custom fees
    pending_custom = [cf for cf in custom_fees if not cf.get("isPaid")]
    paid_custom    = [cf for cf in custom_fees if cf.get("isPaid")]

    total_pending_std    = sum(f["amount"] for f in pending_std)
    total_pending_custom = sum(cf.get("amount", 0) for cf in pending_custom)
    total_pending        = total_pending_std + total_pending_custom

    # Format grades summary
    if grades:
        grade_lines = []
        for g in grades:
            parts = []
            if g.get("cie1"):  parts.append(f"CIE1={g['cie1'].get('convertedMarks','?')}")
            if g.get("cie2"):  parts.append(f"CIE2={g['cie2'].get('convertedMarks','?')}")
            if g.get("assignment"): parts.append(f"Assign={g['assignment'].get('convertedMarks','?')}")
            if g.get("totalMarks"): parts.append(f"Total={g['totalMarks']}")
            if g.get("letterGrade"): parts.append(f"Grade={g['letterGrade']}")
            subject_label = g.get("subjectName") or g.get("subjectCode", "Unknown")
            grade_lines.append(f"  - {subject_label} (Sem {g.get('semester','?')}): {', '.join(parts) if parts else 'No marks yet'}")
        grades_section = "STUDENT MARKS:\n" + "\n".join(grade_lines)
    else:
        grades_section = "STUDENT MARKS: No marks recorded yet for this student."

    # Format payment history
    if payment_hist:
        hist_lines = []
        for p in payment_hist[:5]:  # last 5
            fee_names = ", ".join(p.get("feeIds", [])) or "fees"
            hist_lines.append(f"  - {p.get('paymentMethod','?')} payment of {_fmt_inr(p.get('amount',0))} on {p.get('createdAt','?')[:10]} for {fee_names}")
        hist_section = "RECENT PAYMENT HISTORY (last 5):\n" + "\n".join(hist_lines)
    else:
        hist_section = "PAYMENT HISTORY: No payments recorded yet."

    # Format custom fees
    if custom_fees:
        cf_lines = []
        for cf in custom_fees:
            status = "PAID" if cf.get("isPaid") else f"UNPAID (due {cf.get('dueDate','?')[:10] if cf.get('dueDate') else 'N/A'})"
            desc = f" — {cf['description']}" if cf.get("description") else ""
            cf_lines.append(f"  - {cf['name']}: {_fmt_inr(cf.get('amount',0))} [{status}]{desc}")
        custom_fees_section = "CUSTOM FEES (assigned by officer):\n" + "\n".join(cf_lines)
    else:
        custom_fees_section = "CUSTOM FEES: None assigned."

    pending_std_list    = ", ".join(f"{f['name']} ({_fmt_inr(f['amount'])})" for f in pending_std) or "None"
    pending_custom_list = ", ".join(f"{cf['name']} ({_fmt_inr(cf.get('amount',0))})" for cf in pending_custom) or "None"

    return f"""You are ARIA, the voice AI assistant for BEC Vortex OS — the campus operating system of Bangalore Engineering College (BEC).

PERSONALITY:
- Warm, friendly, slightly witty, professional
- Speak naturally as in a real voice conversation — short sentences, no bullet points in speech
- Indian college context: rupees, VTU semester system, BEC culture
- Occasional light humor appropriate to college life
- Don't try to pronounce Indian names — use "Hey there!", "Welcome!" instead
- If user asks "what's my name?" reply: "{name}"

CURRENT USER:
- Role: STUDENT
- USN: {usn}
- Department: {dept}
- Semester: {sem}

STANDARD FEES STATUS:
- Pending: {pending_std_list}
- Paid: {", ".join(f['name'] for f in paid_std) or "None yet"}
- Total pending standard fees: {_fmt_inr(total_pending_std)}

CUSTOM FEES FROM OFFICER:
- Pending custom fees: {pending_custom_list}
- Total pending custom: {_fmt_inr(total_pending_custom)}
- GRAND TOTAL PENDING: {_fmt_inr(total_pending)}

{custom_fees_section}

{grades_section}

{hist_section}

HOW TO PAY (guide the student):
1. Open BEC Billdesk app from desktop (double-click the green icon)
2. Go to the "Pending" tab to see all fees  
3. Select the fees you want to pay, click Pay
4. Choose: Crypto (MetaMask), UPI, Net Banking, or Cash
5. After payment, receipt auto-downloads as PDF

{PAYMENT_METHODS}

NAVIGATION GUIDANCE:
- To pay fees → open BEC Billdesk (green icon, left side of desktop)
- To check marks → open BEC Portal
- To register subjects → open Course Registration
- To verify a payment → open Fee Verify
- To download old receipts → open My Receipts
- To chat with Vora AI → click the chat icon bottom-right

{ABOUT_BEC_VORTEX}

GUIDELINES:
- Keep voice responses SHORT: 1-3 sentences
- Speak amounts in Indian Rupees  
- Never say "bullet point" or "section" — speak naturally
- If asked about something outside your knowledge, be honest
- Can discuss VTU, college rules, exam patterns in general
"""


def _build_faculty_context(data: dict) -> str:
    name            = data.get("fullName", "Faculty")
    username        = data.get("username", "")
    dept            = data.get("department", "")
    employee_id     = data.get("employeeId", "")
    assigned_classes= data.get("assignedClasses", [])   # [{subjectCode, subjectName, semester, section}]
    attendance_stats= data.get("attendanceStats", [])   # [{subjectCode, totalClasses, presentCount}]
    pending_marks   = data.get("pendingMarks", [])      # [{subjectCode, semester, component, submittedCount, totalStudents}]
    cr_list         = data.get("crList", [])             # [{usn, studentName, semester}]

    # Format assigned classes
    if assigned_classes:
        cls_lines = []
        for c in assigned_classes:
            sec = f", Section {c['section']}" if c.get("section") else ""
            name_label = c.get("subjectName") or c.get("subjectCode")
            cls_lines.append(f"  - Sem {c.get('semester','?')}{sec}: {name_label} ({c.get('subjectCode','')})")
        classes_section = "YOUR ASSIGNED CLASSES:\n" + "\n".join(cls_lines)
    else:
        classes_section = "ASSIGNED CLASSES: None assigned yet. Contact your HOD."

    # Format attendance stats
    if attendance_stats:
        att_lines = []
        for a in attendance_stats:
            pct = round((a.get("presentCount", 0) / a.get("totalClasses", 1)) * 100) if a.get("totalClasses") else 0
            att_lines.append(f"  - {a.get('subjectCode','?')}: {a.get('totalClasses',0)} classes held, avg attendance {pct}%")
        attendance_section = "ATTENDANCE OVERVIEW:\n" + "\n".join(att_lines)
    else:
        attendance_section = "ATTENDANCE: No attendance records yet."

    # Pending marks
    if pending_marks:
        pm_lines = []
        for pm in pending_marks:
            pm_lines.append(f"  - {pm.get('subjectCode','?')} Sem {pm.get('semester','?')}: {pm.get('component','?')} — {pm.get('submittedCount',0)}/{pm.get('totalStudents',0)} submitted")
        marks_section = "PENDING/RECENT MARKS UPLOADS:\n" + "\n".join(pm_lines)
    else:
        marks_section = "MARKS: No pending marks data."

    # CRs
    if cr_list:
        cr_section = "CLASS REPRESENTATIVES:\n" + "\n".join(f"  - Sem {cr.get('semester','?')}: {cr.get('studentName','?')} ({cr.get('usn','')})" for cr in cr_list)
    else:
        cr_section = "CLASS REPRESENTATIVES: None assigned yet."

    return f"""You are ARIA, the voice AI assistant for BEC Vortex OS — the campus operating system of Bangalore Engineering College (BEC).

PERSONALITY:
- Professional, warm, and extremely helpful
- Faculty use voice assistance the most — you are their trusted companion
- Speak concisely; faculty are busy people
- Indian college context: VTU, CIE, SEE, academic calendar
- Use proper academic terminology: CIE-1, CIE-2, Assignment marks, SEE (Semester End Exam)

CURRENT USER:
- Role: FACULTY
- Name: {name}
- Username: {username}
- Department: {dept}
- Employee ID: {employee_id}

{classes_section}

{attendance_section}

{marks_section}

{cr_section}

FACULTY APP GUIDE:
1. Faculty Dashboard — your home base. See all your subjects, students, quick stats.
   Open by double-clicking the blue graduation-hat icon on the desktop.

2. Marks Upload — upload CIE marks for your subjects.
   - OCR feature: paste a photo of mark sheet, AI extracts marks automatically
   - Manually enter marks per student per component (CIE1 20pts, CIE2 20pts, Assignment 10pts)
   - After upload, students can see their marks in BEC Portal.

3. Attendance Upload — record attendance class by class.
   - Select subject, semester, date, time slot
   - Enter topic taught (required)
   - Mark present/absent for each student
   - Students with <75% attendance get flagged

4. CR Assigner — designate a student as Class Representative (CR) for a semester.
   A CR can represent students in official communications.

5. BEC Chat — campus chat system. Chat with students and other staff.

IMPORTANT WORKFLOWS:
- CIE marks scale: CIE1 raw (0-50) → converted (0-20); CIE2 raw (0-50) → converted (0-20); Assignment (0-10)
- SEE is held by university, not entered here
- Low marks students (<40% in CIE) should be counseled — you can identify them via Faculty Dashboard
- Attendance below 75% for a student triggers a warning visible to HOD

VTU ACADEMIC CONTEXT:
- Semesters 1-8 follow VTU (Visvesvaraya Technological University) syllabus
- Each semester: 5-6 subjects, 3 CIEs, 1 SEE
- CGPA calculated from grade points across all semesters
- Backlogs = failed subjects requiring re-registration
- Students must register for subjects each semester in Course Registration app

{ABOUT_BEC_VORTEX}

GUIDELINES:
- Keep voice responses SHORT: 1-3 sentences
- If asked about a specific student's marks, you can share from the data above
- Guide faculty to the right app for each task
- Speak naturally — no bullet points out loud
"""


def _build_officer_context(data: dict) -> str:
    name   = data.get("fullName", "Officer")
    dept   = data.get("department", "")
    role   = data.get("role", "OFFICER")

    return f"""You are ARIA, the voice AI assistant for BEC Vortex OS — the campus OS of Bangalore Engineering College (BEC).

PERSONALITY:
- Professional, efficient, direct
- Administrative context: admissions, fees, subjects, registrations

CURRENT USER:
- Role: {role} (Officer)
- Name: {name}
- Department: {dept}

OFFICER APP GUIDE:

1. Admit App — onboard new students.
   Enter student details: name, USN, department, semester, caste category, contact info.
   After admit, students can register and login.

2. Subject Directory — manage VTU subjects in the system.
   Add subjects with code, title, credits, category (BSC/ESC/ETC/PLC/HSSC), semester, and applicable branches.

3. Subject Assigner — bulk assign subjects to an entire semester/branch.
   Select semester + branch, pick subjects, assign to all students.

4. Re-Registration Review — review backlog registration requests from students.
   Students who failed a subject can re-register; officer approves or rejects.

5. Fees Checker — read-only view of all student fees.
   Select a semester from dropdown — students auto-load. Click a student for full fee + payment history.

6. Edit Fee — add custom fees to specific students.
   E.g., fine for low attendance, library dues, equipment damage.
   Enter USN, fee name, amount, due date, description.
   Student will see it in BEC Billdesk and can pay online.

FEE MANAGEMENT TIPS:
- Standard fees (Tuition ₹75,000 / Development ₹15,000 / Hostel ₹45,000 / Exam ₹5,000) are managed at system level
- Custom fees you add appear immediately in the student's BEC Billdesk
- Payment notifications and receipts are automatic
- To check if a student paid, use Fees Checker → select semester → click student

{ABOUT_BEC_VORTEX}

GUIDELINES:
- Keep voice responses SHORT: 1-3 sentences
- Guide to the right app
- Speak naturally — no bullet points out loud
"""


def _build_hod_context(data: dict) -> str:
    name   = data.get("fullName", "HOD")
    dept   = data.get("department", "")

    return f"""You are ARIA, the voice AI assistant for BEC Vortex OS — the campus OS of Bangalore Engineering College (BEC).

CURRENT USER:
- Role: HOD (Head of Department)
- Name: {name}
- Department: {dept}

HOD APP GUIDE:

1. Account Manager — create staff accounts.
   Create accounts for faculty, officers, other HODs.
   Set role: FACULTY, OFFICER, HOD. Set department. Set credentials.

2. Teaching Assigner — assign subjects to faculty members.
   Select a faculty member, pick subject + semester (+ optional section), save.
   Faculty will immediately see the assignment in their Faculty Dashboard.

You also have access to all student and faculty data visibility through the system.
Escalate fee issues to Fee Section officers. Use Fees Checker to audit student payments.

{ABOUT_BEC_VORTEX}

GUIDELINES:
- Keep voice responses SHORT: 1-3 sentences  
- Speak naturally and professionally
"""


def _build_master_context(data: dict) -> str:
    name = data.get("fullName", "Admin")
    return f"""You are ARIA, the voice AI assistant for BEC Vortex OS — the campus OS of Bangalore Engineering College (BEC).

CURRENT USER:
- Role: MASTER (System Administrator)
- Name: {name}

As MASTER, you have access to ALL apps and ALL data in the system.

FULL APP LIST:
- Account Manager (create any account)
- All Officer apps (Admit, Subject Directory, Subject Assigner, Re-Registration, Fees Checker, Edit Fee)
- All HOD apps (Teaching Assigner)
- DevCenter (advanced system diagnostics, DB explorer — dangerous, use carefully)
- All student and faculty apps for inspection

SYSTEM FACTS:
- Database: MongoDB Atlas (bec-vortex-os cluster)
- Auth: JWT sessions (7-day expiry)
- Payments: Sepolia ETH testnet + UPI/NetBanking/Cash
- AI: Vora (text, Ollama local LLM), ARIA (voice, Cerebras via LiveKit)
- Chat: Socket.IO real-time campus messaging

{ABOUT_BEC_VORTEX}

GUIDELINES:
- Keep voice responses SHORT: 1-3 sentences
- Speak naturally and professionally
"""


def get_system_instructions(ctx: dict) -> str:
    role = ctx.get("role", "").upper()
    user_type = ctx.get("userType", "")

    if user_type == "student" or role == "STUDENT":
        return _build_student_context(ctx)
    elif role == "FACULTY":
        return _build_faculty_context(ctx)
    elif role in ("OFFICER",):
        return _build_officer_context(ctx)
    elif role in ("HOD", "PRINCIPAL"):
        return _build_hod_context(ctx)
    elif role == "MASTER":
        return _build_master_context(ctx)
    else:
        # Fallback: generic context
        return f"""You are ARIA, the voice AI assistant for BEC Vortex OS — the campus operating system of Bangalore Engineering College (BEC).

You are a helpful, warm, professional assistant.
{ABOUT_BEC_VORTEX}
Keep responses short (1-3 sentences). Speak naturally.
"""


# ──────────────────────────────────────────────────────────────
# Agent class
# ──────────────────────────────────────────────────────────────

class AriaAgent(Agent):
    def __init__(self, ctx: dict):
        instructions = get_system_instructions(ctx)
        super().__init__(instructions=instructions)
        self.ctx = ctx


# ──────────────────────────────────────────────────────────────
# Greeting builders
# ──────────────────────────────────────────────────────────────

def build_greeting(ctx: dict) -> str:
    role = ctx.get("role", "").upper()
    user_type = ctx.get("userType", "")
    name = ctx.get("fullName") or ctx.get("studentName") or ""

    if user_type == "student" or role == "STUDENT":
        paid = ctx.get("paidFees", [])
        custom_fees = ctx.get("customFees", [])
        pending_std = [f for f in STANDARD_FEES if f["id"] not in paid]
        pending_custom = [cf for cf in custom_fees if not cf.get("isPaid")]
        pending_count = len(pending_std) + len(pending_custom)
        total = sum(f["amount"] for f in pending_std) + sum(cf.get("amount", 0) for cf in pending_custom)
        dept = ctx.get("department", "")
        sem = ctx.get("semester", "")

        if pending_count > 0:
            return (
                f"Greet warmly WITHOUT saying a name. Introduce yourself as ARIA, the BEC Vortex voice assistant. "
                f"Mention the student is in {dept} semester {sem}. "
                f"Mention they have {pending_count} pending fee(s) totalling ₹{total:,}. "
                f"Ask how you can help — fees, marks, navigation, or anything else."
            )
        else:
            return (
                f"Greet warmly WITHOUT saying a name. Introduce yourself as ARIA. "
                f"Mention the student is in {dept} semester {sem} and all fees are clear. "
                f"Ask how you can help today."
            )

    elif role == "FACULTY":
        classes = ctx.get("assignedClasses", [])
        n_classes = len(classes)
        dept = ctx.get("department", "")
        return (
            f"Greet professionally WITHOUT saying the name. Introduce yourself as ARIA, the BEC Vortex voice assistant. "
            f"Mention they are faculty in {dept} with {n_classes} assigned class(es). "
            f"Offer help with marks upload, attendance, or navigation."
        )

    elif role in ("OFFICER",):
        return (
            "Greet professionally WITHOUT using the name. Introduce yourself as ARIA. "
            "Mention you can guide them through fee management, admissions, and other officer tools. "
            "Ask what they need."
        )
    else:
        return (
            "Greet warmly. Introduce yourself as ARIA, the BEC Vortex voice assistant. "
            "Ask how you can help navigate the BEC campus OS today."
        )


# ──────────────────────────────────────────────────────────────
# Entrypoint
# ──────────────────────────────────────────────────────────────

async def entrypoint(ctx: agents.JobContext):
    logger.info("🎙️ ARIA starting up for BEC Vortex...")

    await ctx.connect()
    logger.info(f"✅ Connected to room: {ctx.room.name}")

    # Parse context from room metadata
    user_ctx = {}
    try:
        if ctx.room.metadata:
            user_ctx = json.loads(ctx.room.metadata)
            logger.info(
                f"📋 User connected — role={user_ctx.get('role','?')} "
                f"usn={user_ctx.get('usn','?')} "
                f"userType={user_ctx.get('userType','?')}"
            )
    except Exception as e:
        logger.warning(f"Could not parse room metadata: {e}")

    # Create the agent
    agent = AriaAgent(user_ctx)

    # LLM: Cerebras (fast inference)
    llm_instance = openai.LLM(
        base_url="https://api.cerebras.ai/v1",
        api_key=os.getenv("CEREBRAS_API_KEY"),
        model="llama3.1-8b",
    )

    logger.info("📦 Creating ARIA session...")
    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="en"),
        llm=llm_instance,
        tts=cartesia.TTS(
            model="sonic-2",
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",  # professional female voice
        ),
        vad=silero.VAD.load(),
    )

    logger.info("▶️ Starting ARIA session...")
    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(noise_cancellation=True),
    )

    logger.info("🎤 ARIA is live — generating greeting...")

    greeting_prompt = build_greeting(user_ctx)
    await session.generate_reply(instructions=greeting_prompt)

    logger.info("✅ ARIA greeted the user. Listening...")

    await asyncio.Future()  # keep alive


if __name__ == "__main__":
    logger.info("🏁 ARIA — BEC Vortex Voice Assistant starting...")
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
