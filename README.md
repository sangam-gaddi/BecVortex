![BEC Vortex Banner](readme%20images/main%20starting%20banner%20new.png)

<div align="center">



### A full-stack, ARCH LINUX-inspired campus management operating system for Basaveshwar Engineering College, Bagalkot

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-46e3b7?logo=render)](https://becvortex.onrender.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socket.io)](https://socket.io/)
[![LiveKit](https://img.shields.io/badge/LiveKit-Realtime%20Voice-orange)](https://livekit.io/)

**[Live Demo →](https://becvortex.onrender.com)**

</div>

---

## 📖 Table of Contents

<ul>
  <li><a href="#what-is-bec-vortex"><font color="yellow">What is BEC Vortex?</font></a></li>
  <li><a href="#the-os-interface"><font color="yellow">The OS Interface</font></a></li>
  <li><a href="#role-based-hierarchy"><font color="yellow">Role-Based Hierarchy</font></a></li>
  <li><a href="#applications"><font color="yellow">Applications</font></a>
    <ul>
      <li><a href="#student-apps"><font color="yellow">Student Apps</font></a></li>
      <li><a href="#faculty-apps"><font color="yellow">Faculty Apps</font></a></li>
      <li><a href="#officer-apps"><font color="yellow">Officer Apps</font></a></li>
      <li><a href="#hod-apps"><font color="yellow">HOD Apps</font></a></li>
      <li><a href="#masteradmin-apps"><font color="yellow">Master/Admin Apps</font></a></li>
    </ul>
  </li>
  <li><a href="#ai-systems"><font color="yellow">AI Systems</font></a>
    <ul>
      <li><a href="#vora--text-ai-assistant"><font color="yellow">VORA — Text AI Assistant</font></a></li>
      <li><a href="#aria--voice-ai-assistant"><font color="yellow">ARIA — Voice AI Assistant</font></a></li>
      <li><a href="#vision-ocr--answer-sheet-scanner"><font color="yellow">Vision OCR — Answer Sheet Scanner</font></a></li>
    </ul>
  </li>
  <li><a href="#payment-system"><font color="yellow">Payment System</font></a></li>
  <li><a href="#bec-chat--real-time-messaging"><font color="yellow">BEC Chat — Real-Time Messaging</font></a></li>
  <li><a href="#authentication--security"><font color="yellow">Authentication &amp; Security</font></a></li>
  <li><a href="#database-schema"><font color="yellow">Database Schema</font></a></li>
  <li><a href="#api-routes"><font color="yellow">API Routes</font></a></li>
  <li><a href="#tech-stack"><font color="yellow">Tech Stack</font></a></li>
  <li><a href="#environment-variables"><font color="yellow">Environment Variables</font></a></li>
  <li><a href="#local-development"><font color="yellow">Local Development</font></a></li>
  <li><a href="#deployment"><font color="yellow">Deployment</font></a></li>
</ul>

---

## What is BEC Vortex?

BEC Vortex is a **browser-based campus operating system** — a full Next.js application that emulates a macOS-style desktop environment inside the browser. Every feature of a college's administrative workflow — from student admissions to fee payments to AI-assisted marks entry — is accessible as a windowed application on a draggable, animated desktop.

It is not a dashboard. It is not a portal. It is an **OS**.

- Draggable, resizable windows for every app
- Role-based desktop — each user sees only their permitted apps
- Dock at the bottom for quick app launching
- Live clock in the menu bar
- Fully responsive, dark-themed, glassmorphic UI
- Real-time AI assistant (VORA) and live voice agent (ARIA)
- Real-time college-wide chat with Socket.IO

![Homepage](readme%20images/homepage.png)

---

## The OS Interface

```
┌──────────────────────────────────────────────────────────────────────┐
│  🍎  BEC Vortex     File  Edit  View            Mon 10 Mar  14:32   │  ← Menu Bar
│──────────────────────────────────────────────────────────────────────│
│                                                                      │
│  🖥️  BEC Portal                                                       │
│  💳  BEC Billdesk     ┌──────────────────────────────┐               │
│  📚  Course Reg       │  BEC Portal — Student View   │               │
│  ✅  Fee Verify       │  ────────────────────────────│               │
│  🧾  My Receipts      │  USN: 2BA26CS002             │               │
│                       │  Dept: Computer Science      │  ← App Window │
│                       │  Sem: 6  CGPA: 8.4           │               │
│                       │                              │               │
│                       │  [Grades] [Attendance] [Fees]│               │
│                       └──────────────────────────────┘               │
│                                                 ┌────────────────┐   │
│                                                 │ 🤖 VORA        │   │
│                                                 │ Ask me anything│   │ ← VORA Island
│                                                 └────────────────┘   │
│──────────────────────────────────────────────────────────────────────│
│  [📁] [🪪] [🌐] [⊞] [>_] [⚙️] [🗑️]                    [🎙️ ARIA]    │  ← Dock
└──────────────────────────────────────────────────────────────────────┘
```

![Desktop View 1](readme%20images/desktop%201.png)

![Desktop View 2](readme%20images/desktop%202.png)

![Desktop View 3](readme%20images/desktop%203.png)

---

## Role-Based Hierarchy

BEC Vortex implements a strict **5-tier role hierarchy** enforced at every layer — database, server actions, API routes, and UI.

```
MASTER
  └── PRINCIPAL
        └── HOD (per-department)
              ├── OFFICER (per-department)
              └── FACULTY (per-department)

STUDENT (separate auth flow via USN + password)
```

### Role Capabilities

| Role | Can Create | Key Permissions |
|---|---|---|
| **MASTER** | PRINCIPAL accounts | All apps, DevCenter, full system override |
| **PRINCIPAL** | HOD accounts | College-wide oversight, account management |
| **HOD** | OFFICER + FACULTY accounts | Dept faculty management, CR assignment, teaching assignment |
| **OFFICER** | — | Student admission, subject assignment, fee editing, registration approval |
| **FACULTY** | — | Marks upload, attendance marking, CR designation |
| **STUDENT** | — | View own grades/attendance, register courses, pay fees |

### Departments

| Code | Name |
|---|---|
| CS | Computer Science |
| IS | Information Science |
| EC | Electronics & Communication |
| AI | AI & Machine Learning |
| EE | Electrical Engineering |
| ME | Mechanical Engineering |
| CV | Civil Engineering |
| IP | Industrial & Production Engineering |
| BT | Biotechnology |
| AU | Automobile Engineering |
| UE | Electronics & Computer Engineering |
| EXAMINATION | Examination Department |
| FEE_SECTION | Fee Section |
| ADMISSION | Admission Office |
| SCHOLARSHIP | Scholarship Office |

### Account Creation Chain

```
MASTER  →  creates  →  PRINCIPAL
PRINCIPAL  →  creates  →  HOD
HOD  →  creates  →  OFFICER, FACULTY
```

No role can create an account of equal or higher level. This is enforced server-side via `canCreateRole()`.

---

## Applications

### Student Apps

#### 🖥️ BEC Portal
The student's primary information dashboard.

- **Profile Card** — USN, name, department, semester, admission ID, CSN, ID number, payment category, entry type
- **Grades Viewer** — Full academic transcript with CIE1, CIE2, Assignment, SEE breakdown per subject
  - VTU grade scale: O / A+ / A / B+ / B / C / P / F with color-coded badges
  - Per-question mark breakdown where uploaded by faculty
  - Progress bars for each component
  - CGPA calculation across all semesters
- **Attendance Tracker** — Subject-wise attendance percentage with VTU 75% threshold indicator
- **Registered Subjects** — Current semester subject list with codes
- **Backlog Status** — Outstanding backlogs highlighted in red

#### 💳 BEC Billdesk (Fee Payment)
Complete fee payment suite with 4 payment channels:

- **UPI** — QR code generation + manual UTR entry
- **Net Banking** — Challan generation + bank reference ID upload
- **Crypto** — Web3 wallet connect (WalletConnect + MetaMask) via Wagmi
- **Cash** — Challan generation for counter payment

See [Payment System](#payment-system) for full details.

#### 📚 Course Registration
Semester registration workflow:

- View available subjects for the upcoming semester
- Select regular subjects + up to 2 backlog subjects (VTU rule enforced)
- Submit registration request → OFFICER reviews and approves/rejects
- View status of pending/approved/rejected requests

#### ✅ Fee Verify
Public fee verification utility:

- Enter any USN to look up fee payment status
- Returns paid fees, amount, method, transaction ID
- No login required — designed for parents/guardians

#### 🧾 My Receipts
Payment receipt centre:

- View all historical payments with full details
- Download PDF receipts (auto-generated with college letterhead)
- Filter by year, method, status

---

### Faculty Apps

#### 📊 Faculty Dashboard
- Teaching schedule — subjects assigned per semester
- Student list per subject with attendance summary
- Quick stats: total periods taken, average attendance

#### 📝 Marks Upload
Manual marks entry interface:

- Select subject → student → exam type (CIE1 / CIE2 / Assignment / SEE)
- VTU conversion applied automatically:
  - CIE1/CIE2: entered out of 40 → stored as /20
  - Assignment: entered out of 20 → stored as /10
  - SEE: out of 100, stored as-is
- Per-question mark entry (Q1–Q10) for detailed breakdown
- View + edit previously submitted marks

#### 📷 Marks Sheet Scanner (Vision OCR)
AI-powered answer booklet scanner:

- Upload a photo of any CIE answer booklet cover page
- AI vision model extracts: **USN**, **Subject Code**, **Raw Marks**, **Converted Marks**
- Supports both **local Ollama** (qwen3-vl:8b) and **OpenRouter cloud** (Nemotron Nano 12B VL)
- Smart fallback: if the model returns prose instead of JSON, regex-based extraction recovers the values
- One-click "Save to Grade Record" button post-extraction
- Processes entire stacks of answer sheets one by one

#### 📅 Attendance Upload
Period-by-period attendance recorder:

- Select subject, date, time slot
- Enter topic taught (required field)
- Tick absent students — all others auto-marked present
- Full attendance history per subject
- Download attendance CSV

#### 🎖️ CR Assigner
Class Representative management:

- View current CRs per semester
- Assign/revoke CR status for students
- CRs gain the ability to create chat groups

---

### Officer Apps

#### 🎓 Admit Student
New student admission form:

- Full admission details: name, department, semester, entry type (Regular/Lateral Entry - Diploma/Lateral Entry - B.Sc.), payment category (KCET/COMEDK/Management/NRI)
- Auto-generates USN in BEC format (`2BA26CS001`)
- Sends welcome credentials to student
- Triggers subject auto-assignment for the admitted semester

#### 📘 Subject Directory
Master subject catalogue:

- View all VTU subjects by department + semester
- Add/edit/disable subjects
- Subject-code, name, credits, type (theory/lab)

#### 🔗 Subject Assigner
Bulk subject allocation:

- Assign standard VTU subjects to all unregistered students in a semester in one click
- Individual override per student

#### 🔄 Re-Registration Review
Registration request management:

- View all pending semester registration requests
- Approve or reject with remarks
- See student profile + backlog history inline

#### 💰 Fees Checker
Institutional fee oversight:

- Search any student's complete fee payment history
- Filter by payment method, status, date range
- Export to CSV

#### ✏️ Edit Fee
Custom fee management:

- Add custom one-time fees for individual students (e.g. lab breakage, late fine)
- Edit standard fee structures per payment category
- Set semester-specific fee amounts

---

### HOD Apps

#### 👥 Account Manager
Staff account lifecycle:

- Create OFFICER and FACULTY accounts for their department
- Set/reset passwords
- Activate/deactivate accounts
- View full list of department staff

#### 🏫 Teaching Assigner
Faculty-subject mapping:

- Assign subjects to faculty members for a given semester
- Set section identifiers
- View current teaching load per faculty
- Reassign as needed

---

### Master/Admin Apps

#### 🛠️ DevCenter
System administration panel (MASTER only):

- System configuration editor
- Database health check
- VORA URL management (set Cloudflare tunnel URL)
- Audit log viewer — all VORA tool calls logged with timestamp, user, parameters, result
- Seed/reset subjects

---

## AI Systems

### VORA — Text AI Assistant

VORA (Virtual Operations & Resource Assistant) is an embedded AI assistant with **tool-calling capability** — it can actually perform administrative actions, not just answer questions.

#### Architecture

```
User input → /api/agent/chat (Next.js server action)
          → Role detection from session
          → System prompt with role-specific tool list
          → LLM call (Ollama or OpenRouter)
          → Tool call detected → execute server action
          → Result fed back to LLM → final response
          → Audit log entry written
```

#### LLM Providers

| Provider | Models | When Used |
|---|---|---|
| **Local Ollama** | qwen3:8b (default), any Ollama model | When `VORA_AGENT_URL` is set (Cloudflare tunnel to local machine) |
| **OpenRouter** | Nemotron 30B, Llama 3.3 70B, Gemma 3 27B, Trinity Mini/Large | Cloud fallback, works on Render.com free tier |

The provider is selectable per-session in the VORA island UI. The status endpoint tries Ollama first (3s timeout), then falls back to OpenRouter.

#### VORA Tool Registry (Role-Gated)

| Tool | Role | Description |
|---|---|---|
| `upload_marks` | FACULTY | Upload CIE/SEE marks for a student with VTU conversion |
| `mark_absent` | FACULTY | Record attendance for a class period |
| `submit_registration` | STUDENT | Submit semester course registration |
| `list_pending_registrations` | OFFICER | List all pending semester registrations |
| `approve_registration` | OFFICER | Approve a registration request |
| `reject_registration` | OFFICER | Reject a registration request |
| `admit_student` | OFFICER (ADMISSION dept) | Register a new student admission |
| `bulk_assign_subjects` | OFFICER | Assign VTU subjects to an entire semester in bulk |
| `list_department_faculty` | HOD | List all faculty in your department |
| `assign_teaching` | HOD | Assign a subject to a faculty member |
| `assign_cr` | HOD | Designate a student as Class Representative |
| `revoke_cr` | HOD | Remove CR designation from a student |
| `create_account` | HOD / PRINCIPAL / MASTER | Create a staff account (hierarchy enforced) |

Every tool call is logged to `AgentAuditLog` with: user, role, tool name, parameters, result, timestamp.

#### VORA Island UI

- Floating bottom-right widget, draggable anywhere on screen
- Provider switcher: Ollama ↔ OpenRouter
- Model selector (when OpenRouter is active)
- Status dot: Online (green) / Thinking (amber) / Error (red)
- Full conversation history with clear button
- Responds in English or Kannada

---

### ARIA — Voice AI Assistant

ARIA is a **real-time voice assistant** powered by LiveKit, running as a Python process.

#### Stack

| Component | Technology |
|---|---|
| Real-time transport | **LiveKit** (WebRTC rooms) |
| Speech-to-Text | **Deepgram** Nova-2 |
| LLM | **Cerebras** (ultra-low latency inference) |
| Text-to-Speech | **Cartesia** Sonic |
| VAD | **Silero** WebRTC VAD |

#### Role-Aware Contexts

ARIA adapts its system prompt based on the logged-in user's role:

| Role | ARIA Persona |
|---|---|
| STUDENT | Fee queries, grade lookups, navigation help |
| FACULTY | Class schedule, marks entry workflow, CIE guidance |
| OFFICER | Fee management, admission guidance |
| HOD/MASTER | Department overview, system navigation |

#### ARIA Dynamic Island

- Top-center macOS-style dynamic island in the BEC Vortex menu bar
- Expands to show live voice waveform when active
- Push-to-talk or continuous listening modes
- LiveKit room token fetched from `/api/aria/token`

---

### Vision OCR — Answer Sheet Scanner

An AI vision pipeline that reads exam answer booklet cover pages and auto-extracts marks.

#### Pipeline

```
Upload image → /api/vision/extract-marks
           → Try local Ollama VL model (compact prompt)
           → If response is prose → regex fallback extraction
           → If Ollama unavailable → OpenRouter Nemotron Nano 12B VL
           → Return: { usn, subjectCode, rawTotalMarks, convertedMarks }
```

#### What It Extracts

| Field | Location on Booklet | Notes |
|---|---|---|
| USN | Top-right, 10-char boxes | Handles 0/O, 5/S, 1/I confusions |
| Subject Code | Top-left, "Course Code" label | Alphanumeric, e.g. 22UCS119C |
| Raw Total Marks | Bottom of marks grid | Max 40 for CIE |
| Converted Marks | Next to total | Auto-calculates as `ceil(raw/2)` if missing |

Accuracy features:
- Two-level prompt strategy: ultra-compact for Ollama, detailed for cloud
- Prose fallback: regex extracts values even when the model explains instead of outputting JSON
- "UNKNOWN" placeholder when a field is completely illegible

---

## Payment System

BEC Vortex implements a multi-channel fee payment system tightly integrated with the college fee structure.

### Payment Methods

#### 💸 UPI
- Dynamic QR code generated with payment amount + reference ID
- Student enters UTR number after payment
- Admin verifies via `/api/payments/verify`

#### 🏦 Net Banking / Cash Challan
- System generates a printable challan with challan ID
- Student deposits at bank or counter
- Student enters bank reference ID
- Status updated by officer after verification
- State machine: `pending` → `pending_bank_verification` → `completed`

#### 🔐 Crypto (Web3)
- WalletConnect + MetaMask via Wagmi
- EVM-compatible wallet connection
- On-chain transaction hash stored as proof
- Supports: MetaMask, WalletConnect-compatible wallets

### Fee Categories

| Category | Description |
|---|---|
| KCET | Karnataka CET quota |
| COMEDK | COMEDK quota |
| Management | Management quota |
| NRI | NRI quota |

### Custom Fees

Officers can add custom one-time fees per student (lab breakage, fine, etc.) via the `CustomFee` collection. These appear in the student's Billdesk alongside standard fees.

### Payment Record

Every payment stores:
- USN, fee IDs paid, amount
- Transaction hash (crypto), challan ID (cash), bank reference ID (net banking)
- Method, channel (ONLINE/CASH), status
- Snapshot of receipt data at time of payment (immutable record)

### PDF Receipt Generation

Auto-generated PDF receipts with:
- College letterhead
- Student details
- Itemized fee breakdown
- Transaction reference
- Digital timestamp

---

## BEC Chat — Real-Time Messaging

A full-featured internal messaging system with real-time delivery via Socket.IO.

### Architecture

```
Client (BECChat.tsx)
  ↕ Socket.IO (polling transport, /api/socket)
  ↕ pages/api/socket.ts → lib/socket/server.ts
  ↕ MongoDB (ChatMessage, ChatGroup collections)
  
+ 3-second polling fallback for missed events
```

### Features

| Feature | Details |
|---|---|
| **Global Channel** | College-wide broadcast; messages auto-delete after **1 minute** |
| **Private DMs** | 1-to-1 encrypted messages; auto-delete after **5 days** |
| **Group Channels** | Named groups with bulk USN invite; HOD/OFFICER/FACULTY/CR can create |
| **Hierarchy Directory** | Left sidebar lists all staff grouped by role (PRINCIPAL, HOD, OFFICER, FACULTY) |
| **Unread Badges** | Red unread count on each conversation entry |
| **Real-time delivery** | Socket.IO `broadcast-message` pushes to recipient room instantly |
| **Online presence** | Green dot on active users via Socket.IO user tracking |
| **Message grouping** | Consecutive messages from same sender grouped (no repeated avatars) |

### Who Can Create Groups

- PRINCIPAL, HOD, OFFICER, FACULTY: always
- STUDENT: only if `isCR = true` (Class Representative)

### Message TTL

MongoDB TTL index auto-expires messages:
- Global: 60 seconds
- Private/Group: 5 days

No manual cleanup needed.

---

## Authentication & Security

### Dual Auth System

BEC Vortex has two entirely separate authentication flows:

#### Staff Auth (Session-based)
- Login at `/login`
- bcrypt password hashing
- Server-side session stored in HTTP-only cookie (`session`)
- Session invalidated on logout or new login from different device
- `activeSessionId` field in User model enables single-device enforcement

#### Student Auth (JWT-based)
- Login at `/login` (auto-detected by USN format)
- JWT stored in HTTP-only cookie (`auth-token`)
- Payload: `{ studentId, usn }`
- 30-day expiry
- Recovery phrase for password reset (bcrypt hashed)

### USN Verification

Students verify their USN via `/api/verify-usn` before account activation:
- Cross-checks against the Student collection
- Ensures only admitted students can register

### RBAC Enforcement

Every server action and API route runs `verifyAuth()` / `requireRole()`:
```ts
// Example: only OFFICER can admit students
requireRole(session.role, 'OFFICER');
if (session.department !== 'ADMISSION') throw new Error('Forbidden');
```

### OWASP Hardening

- All user inputs trimmed and validated server-side
- MongoDB ObjectId validation before queries
- No raw query construction (Mongoose always used)
- JWT verified with `jose` library (not `jsonwebtoken`)
- HTTP-only, SameSite cookies (no JS access)
- Role + department double-check for sensitive operations

---

## Database Schema

```
MongoDB (Atlas)
├── users              → Staff accounts (MASTER/PRINCIPAL/HOD/OFFICER/FACULTY)
├── students           → Student records + auth + academic tracking
├── subjects           → VTU subject catalogue (code, name, credits, semester, dept)
├── grades             → CIE1/CIE2/Assignment/SEE marks per student per subject
├── attendancerecords  → Period-level attendance (topic, date, timeslot, present/absent arrays)
├── payments           → Fee payment records (all channels)
├── customfees         → Per-student custom fee entries
├── chatmessages       → All messages with TTL expiry index
├── chatgroups         → Group channel definitions + member lists
├── registrationrequests → Semester registration workflow
├── agentauditlogs     → VORA tool call audit trail
└── systemconfigs      → Key-value config (e.g. VORA_AGENT_URL)
```

### Key Indexes

| Collection | Index | Purpose |
|---|---|---|
| students | `usn` (unique, sparse) | USN lookup |
| grades | `(studentId, subjectCode, semester)` (unique) | Prevent duplicate grade records |
| chatmessages | `expiresAt` (TTL) | Auto-delete expired messages |
| payments | `usn` | Fast fee history lookup |
| attendancerecords | `(subjectCode, semester, date)` | Period deduplication |

---

## API Routes

```
/api/
├── auth/
│   ├── login/         → Staff + student login (POST)
│   ├── logout/        → Session invalidation (POST)
│   └── signup/        → Student account creation (POST)
├── agent/
│   ├── chat/          → VORA LLM + tool execution (POST)
│   ├── status/        → Ollama/OpenRouter health check (GET)
│   └── set-url/       → Update VORA_AGENT_URL in DB (POST, MASTER only)
├── aria/
│   └── token/         → LiveKit room token for ARIA voice (GET)
├── grades/            → Grade CRUD (GET/POST/PATCH)
├── payments/
│   ├── create/        → Initiate payment (POST)
│   ├── verify/        → Verify payment (POST)
│   ├── history/       → Student payment history (GET)
│   ├── crypto/        → Crypto transaction webhook (POST)
│   ├── admin/         → Admin fee management (GET/POST)
│   ├── my-custom-fees/ → Student's custom fees (GET)
│   └── lookup/        → USN fee lookup (GET)
├── verify-usn/        → Student USN verification (POST)
├── vision/
│   └── extract-marks/ → Answer sheet OCR (POST, multipart)
├── admin/             → Admin operations (role-gated)
└── chat/              → Chat actions (server actions preferred)

/pages/api/
└── socket.ts          → Socket.IO server initialization
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router + Pages Router hybrid) |
| **Language** | TypeScript 5 |
| **Database** | MongoDB Atlas + Mongoose 8 |
| **Styling** | Tailwind CSS 3 + custom OS CSS |
| **Authentication** | Custom session (staff) + JWT via `jose` (students) |
| **Real-time** | Socket.IO 4 (polling transport) |
| **AI Text** | Ollama (local) + OpenRouter API (cloud) |
| **AI Voice** | LiveKit + Deepgram STT + Cerebras LLM + Cartesia TTS |
| **AI Vision** | Ollama VL (local) + OpenRouter Nemotron Nano VL (cloud) |
| **Web3 Payments** | Wagmi + WalletConnect |
| **PDF Generation** | Custom receipt generator (`utils/receiptGenerator.ts`) |
| **Animation** | Motion (Framer Motion) |
| **Icons** | Lucide React |
| **Toasts** | React Hot Toast |
| **Voice Agent** | Python 3.11 + LiveKit Agents SDK |
| **Tunnel** | Cloudflare Tunnel (for local Ollama exposure) |
| **Deployment** | Render.com (free tier) |

---

## Environment Variables

### Next.js App (`.env.local`)

```env
# MongoDB
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=your-32-char-secret-key-here
NEXTAUTH_SECRET=your-nextauth-secret

# App URL
NEXT_PUBLIC_APP_URL=https://becvortex.onrender.com

# VORA AI
VORA_AGENT_URL=http://localhost:11434         # or your Cloudflare tunnel URL
VORA_MODEL=qwen3:8b
OLLAMA_API_KEY=                               # optional, if Ollama has auth
OPENROUTER_API_KEY=sk-or-...                  # get free at openrouter.ai
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free

# ARIA Voice Agent
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud

# Payments (Web3)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### Python Voice Agent (`voice-agent/.env`)

```env
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
DEEPGRAM_API_KEY=...
CEREBRAS_API_KEY=...
CARTESIA_API_KEY=...
NEXT_PUBLIC_APP_URL=https://becvortex.onrender.com
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+ (for ARIA voice agent)
- MongoDB Atlas account (or local MongoDB)
- Ollama installed locally (optional, for local AI)

### 1. Clone and install

```bash
git clone https://github.com/your-username/bec-vortex.git
cd bec-vortex
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Seed the database

```bash
# Seed RBAC roles
npx tsx scripts/seed-rbac.ts

# Seed VTU subjects
node scripts/seed-subjects.js
```

### 4. Run the development server

```bash
npm run dev
# → http://localhost:3000
```

### 5. Run ARIA voice agent (optional)

```bash
cd voice-agent
pip install -r requirements.txt
python agent.py dev
```

### 6. Expose local Ollama via Cloudflare Tunnel (optional)

```bash
# Install cloudflared
winget install --id Cloudflare.cloudflared

# Quick tunnel (temporary URL)
cloudflared tunnel --url http://localhost:11434

# Paste the printed URL into VORA_AGENT_URL in .env.local
```

---

## Deployment

BEC Vortex is deployed on **Render.com** free tier.

### Required Render environment variables

All variables from the [Environment Variables](#environment-variables) section above, plus:

```env
NODE_ENV=production
```

### Cold start behaviour

Render free tier spins down after 15 minutes of inactivity. On first request after sleep:
- Next.js restarts (~30s)
- MongoDB connection re-established on first DB call
- Socket.IO server re-initializes on first `/api/socket` hit

The BEC Chat 3-second polling loop will re-establish the Socket.IO connection automatically.

### Connecting local Ollama to deployed Render app

1. Install `cloudflared` locally
2. Start Ollama: `ollama serve`
3. Run tunnel: `cloudflared tunnel --url http://localhost:11434`
4. Copy the `https://xxxx.trycloudflare.com` URL
5. On Render → Environment → set `VORA_AGENT_URL=https://xxxx.trycloudflare.com`
6. VORA will now use your local GPU for inference

---

## Project Structure

```
bec-vortex/
├── app/                       # Next.js App Router
│   ├── api/                   # API routes
│   │   ├── agent/             # VORA AI endpoints
│   │   ├── aria/              # LiveKit token
│   │   ├── grades/            # Grade management
│   │   ├── payments/          # Full payment suite
│   │   ├── verify-usn/        # USN verification
│   │   └── vision/            # OCR marks extraction
│   ├── os/                    # The OS itself (protected route)
│   ├── login/                 # Login page
│   ├── signup/                # Student registration
│   └── payment/               # Standalone payment page
├── components/
│   ├── os/                    # All OS components
│   │   ├── components/
│   │   │   ├── apps/          # Every windowed application
│   │   │   │   ├── BECChat.tsx
│   │   │   │   ├── BECPortal.tsx
│   │   │   │   ├── BECPay.tsx
│   │   │   │   ├── MarksUploadApp.tsx
│   │   │   │   ├── AttendanceUploadApp.tsx
│   │   │   │   ├── CourseRegistrationApp.tsx
│   │   │   │   ├── FacultyDashboardApp.tsx
│   │   │   │   ├── AdmitApp.tsx
│   │   │   │   ├── AccountManager.tsx
│   │   │   │   └── ... (20+ apps)
│   │   │   ├── Desktop.tsx
│   │   │   ├── Dock.tsx
│   │   │   ├── MenuBar.tsx
│   │   │   ├── Window.tsx
│   │   │   └── OS.tsx
│   │   ├── aria/              # ARIA voice island
│   │   └── vora/              # VORA chat island
│   └── payment/               # Payment method components
├── database/
│   ├── mongoose.ts            # Connection singleton
│   └── models/                # All Mongoose schemas
├── lib/
│   ├── actions/               # Server actions
│   │   └── chat.actions.ts
│   ├── agent/                 # VORA AI engine
│   │   ├── tools.ts           # Tool registry
│   │   ├── rbac.ts            # Tool access control
│   │   ├── executor.ts        # Tool execution
│   │   ├── systemPrompt.ts    # Role-aware prompts
│   │   └── auditLog.ts        # Audit trail
│   ├── auth/                  # Auth utilities
│   └── socket/                # Socket.IO server
├── pages/api/
│   └── socket.ts              # Socket.IO init endpoint
├── voice-agent/
│   ├── agent.py               # ARIA LiveKit agent
│   └── requirements.txt
└── scripts/                   # DB seed + migration scripts
```

---

<div align="center">

Built with ❤️ for **Basaveshwar Engineering College**, Bagalkot, Karnataka

*Established 1964 — VTU Affiliated*

</div>
