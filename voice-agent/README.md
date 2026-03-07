# ARIA — BEC Vortex Voice Agent

ARIA is the voice AI assistant for BEC Vortex OS. She uses LiveKit for real-time audio, Deepgram for speech-to-text, Cerebras (Llama 3.1) as the LLM, and Cartesia for text-to-speech — the same stack as BEC BillDesk.

## Setup

```bash
cd voice-agent
pip install -r requirements.txt
```

## Run

```bash
python agent.py dev
```

The agent picks up API keys from `../.env.local` (the BEC Vortex root `.env.local`).  
Required keys:
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `DEEPGRAM_API_KEY`
- `CEREBRAS_API_KEY`
- `CARTESIA_API_KEY`

## How it works

1. A user opens the **ARIA Voice Assistant** app in BEC Vortex OS
2. The frontend calls `/api/aria/connection-details` (POST)  
   - The API fetches the user's full profile, grades, fees, and attendance from MongoDB
   - Encodes everything as room metadata
   - Returns a LiveKit room token
3. The frontend connects to LiveKit; the agent room dispatches to this Python worker
4. ARIA reads the metadata and builds a role-specific context (student / faculty / officer / HOD / master)
5. ARIA greets the user and listens

## Role contexts

| Role    | Context provided |
|---------|-----------------|
| Student | Standard + custom fees, grades per subject, payment history, navigation guide |
| Faculty | Assigned classes, attendance stats, marks upload guides, CIE workflow, CRs |
| Officer | Fee management, admissions, subject tools |
| HOD     | Account creation, teaching assignment |
| Master  | Everything |
