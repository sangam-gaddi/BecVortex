"""
BEC BillDesk Voice Agent - ARIA (Friendly Guide)

AI-powered voice assistant that serves as a friendly guide for the 
BEC BillDesk college fee payment portal. Provides helpful information
about fees, the platform, and even some witty college humor!

Uses: LiveKit, Deepgram STT, Cerebras LLM, Cartesia TTS

Run with: python agent.py dev
"""

import asyncio
import json
import os
import logging
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    cartesia,
    deepgram,
    silero,
    openai,
)

# Load environment variables from parent directory
import pathlib
script_dir = pathlib.Path(__file__).parent.absolute()
env_path = script_dir.parent / ".env.local"
load_dotenv(str(env_path))

# Enable logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("billdesk-agent")

# Verify API keys
logger.info(f"LIVEKIT_URL: {os.getenv('LIVEKIT_URL', 'NOT SET')}")
logger.info(f"DEEPGRAM_API_KEY: {'SET' if os.getenv('DEEPGRAM_API_KEY') else 'NOT SET'}")
logger.info(f"CEREBRAS_API_KEY: {'SET' if os.getenv('CEREBRAS_API_KEY') else 'NOT SET'}")
logger.info(f"CARTESIA_API_KEY: {'SET' if os.getenv('CARTESIA_API_KEY') else 'NOT SET'}")


def get_system_instructions(student_data: dict) -> str:
    """Generate system instructions for the friendly guide persona"""
    
    student_name = student_data.get('studentName', 'Student')
    pending_fees = student_data.get('pendingFees', [])
    paid_fees = student_data.get('paidFeesData', [])
    total_pending = student_data.get('totalPending', 0)
    total_paid = student_data.get('totalPaid', 0)
    department = student_data.get('department', 'Computer Science')
    
    # Format fees info
    if pending_fees:
        pending_list = ", ".join([f"{f['name']} at ₹{f['amount']:,}" for f in pending_fees])
    else:
        pending_list = "None! All paid up!"
    
    if paid_fees:
        paid_list = ", ".join([f"{f['name']}" for f in paid_fees])
    else:
        paid_list = "None yet"

    return f"""You are ARIA, a friendly and witty AI guide for BEC BillDesk - the college fee payment portal for BEC (Bangalore Engineering College).

PERSONALITY:
- Warm, friendly, and slightly humorous
- Professional but approachable
- Knowledgeable about everything related to the platform
- Can crack witty jokes about college life (submissions, deadlines, canteen food, etc.)

IMPORTANT NAMING RULES:
- DO NOT try to pronounce the student's name as it may be an Indian name that's hard to pronounce
- Instead, use warm greetings like: "Hello there!", "Hey friend!", "Welcome!", "Hi buddy!"
- ONLY say the name if the user specifically asks "What is my name?" - then say "{student_name}"

CURRENT USER'S DATA:
- Pending Fees: {pending_list}
- Total Pending: ₹{total_pending:,}
- Paid Fees: {paid_list}
- Total Paid: ₹{total_paid:,}
- Department: {department}

ABOUT BEC BILLDESK (Share this when asked):
BEC BillDesk is a modern, macOS-inspired college fee payment portal. Here's the tech stack:

Frontend:
- Next.js 14 with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- macOS-style desktop environment with windows, dock, and launchpad

Backend:
- Next.js API Routes (serverless functions)
- MongoDB with Mongoose ODM
- JWT-based authentication

Payment Systems:
- Crypto: Supports Sepolia ETH testnet via MetaMask or WalletConnect
- Uses RainbowKit and wagmi for Web3 integration
- Also supports UPI, Net Banking, and Cash payments
- PDF receipt generation with jsPDF

Voice Agent (That's me!):
- LiveKit for real-time audio
- Deepgram for speech-to-text (STT)
- Cerebras AI (Llama 3.1) for the brain
- Cartesia for text-to-speech (TTS) - my beautiful voice!

Real-time Features:
- Socket.IO for live chat and presence
- Real-time online user tracking

WITTY COLLEGE JOKES (Use occasionally, not every response):
- "They say college fees are like assignments - they keep piling up!"
- "At least paying fees online is easier than finding a seat in the library during exams!"
- "The only thing faster than our payment system is how quickly canteen samosas disappear!"
- "Fee payment: the one deadline you definitely don't want to miss... unlike that 8 AM class!"
- "Our crypto payment option is for when you want to pay fees AND confuse your parents at the same time!"

HOW TO HELP USERS:
1. Explain their pending fees and amounts
2. Guide them through the payment process (they select fees, click Pay, choose method)
3. Explain different payment methods available
4. Tell them about the platform's features
5. Answer questions about the tech stack
6. Make their experience pleasant with occasional humor

GUIDELINES:
- Keep responses conversational and SHORT (2-3 sentences usually)
- Speak amounts in Indian Rupees (₹)
- Be helpful but don't be pushy
- Add humor occasionally, not in every response
- If asked about something you don't know, admit it honestly
"""


class BillDeskGuide(Agent):
    """ARIA - The friendly BEC BillDesk guide"""
    
    def __init__(self, student_data: dict):
        instructions = get_system_instructions(student_data)
        super().__init__(instructions=instructions)
        self.student_data = student_data


async def entrypoint(ctx: agents.JobContext):
    """Main entry point for the voice agent"""
    
    logger.info("🚀 ARIA Guide starting up!")
    
    # Connect to room
    await ctx.connect()
    logger.info(f"✅ Connected to room: {ctx.room.name}")
    
    # Parse student data from room metadata
    student_data = {}
    try:
        if ctx.room.metadata:
            student_data = json.loads(ctx.room.metadata)
            logger.info(f"📋 Student connected: {student_data.get('studentUsn', 'Unknown')}")
    except Exception as e:
        logger.warning(f"Could not parse room metadata: {e}")
    
    pending_count = len(student_data.get('pendingFees', []))
    total_pending = student_data.get('totalPending', 0)
    
    # Initialize the guide agent
    agent = BillDeskGuide(student_data)
    
    # Set up LLM with Cerebras
    llm_instance = openai.LLM(
        base_url="https://api.cerebras.ai/v1",
        api_key=os.getenv("CEREBRAS_API_KEY"),
        model="llama3.1-8b"
    )
    
    # Create agent session with Cartesia TTS (great voice quality!)
    logger.info("📦 Creating ARIA session with Cartesia TTS...")
    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="en"),
        llm=llm_instance,
        tts=cartesia.TTS(
            model="sonic-2",
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",  # Professional female voice
        ),
        vad=silero.VAD.load(),
    )
    
    logger.info("▶️ Starting ARIA...")
    
    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(
            noise_cancellation=True,
        ),
    )
    
    logger.info("🎤 ARIA is live!")
    
    # Generate warm greeting (without using the name)
    if pending_count > 0:
        greeting = f"""Give a warm greeting WITHOUT using any names. Say something like:
        "Hey there! Welcome to BEC BillDesk! I'm ARIA, your friendly guide. 
        I can see you've got {pending_count} pending fees totaling around ₹{total_pending:,}. 
        How can I help you today? Need info about payments, or just want to chat about how this cool platform works?"""
    else:
        greeting = """Give a warm greeting WITHOUT using any names. Say:
        "Hey there! Welcome to BEC BillDesk! I'm ARIA, your friendly guide.
        Great news - looks like all your fees are paid! You're all set.
        Is there anything I can help you with? Maybe explain how this platform works, or just have a chat?"""
    
    await session.generate_reply(instructions=greeting)
    
    logger.info("✅ ARIA greeted the user!")
    
    # Keep agent running
    await asyncio.Future()


if __name__ == "__main__":
    logger.info("🏁 Starting ARIA - BEC BillDesk Voice Guide...")
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
