"""
BEC BillDesk Voice Agent

AI-powered voice assistant for the BEC BillDesk college fee payment portal.
Uses LiveKit for real-time voice, Deepgram for STT, Google Gemini for LLM,
and Cartesia for TTS.

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

# Enable logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("billdesk-agent")

# Verify API keys are loaded
logger.info(f"LIVEKIT_URL: {os.getenv('LIVEKIT_URL', 'NOT SET')}")
logger.info(f"DEEPGRAM_API_KEY: {'SET' if os.getenv('DEEPGRAM_API_KEY') else 'NOT SET'}")
logger.info(f"GOOGLE_API_KEY: {'SET' if os.getenv('GOOGLE_API_KEY') else 'NOT SET'}")
logger.info(f"CARTESIA_API_KEY: {'SET' if os.getenv('CARTESIA_API_KEY') else 'NOT SET'}")


SYSTEM_INSTRUCTIONS = """You are ARIA, the AI assistant for BEC BillDesk - a college fee payment portal.

Your role is to help students:
1. Check their pending and paid fees
2. Understand fee breakdowns and due dates
3. Select fees for payment
4. Choose payment methods (Crypto/UPI/Net Banking/Cash)
5. Connect their crypto wallet (MetaMask, WalletConnect)
6. Complete payments

IMPORTANT GUIDELINES:
- Be friendly, professional, and concise
- Always confirm before taking actions that affect payments
- When the student asks about fees, tell them about: Tuition (₹75,000), Development (₹15,000), Hostel (₹45,000), Examination (₹5,000)
- Speak amounts in Indian Rupees (₹)
- Use simple language, avoid technical jargon

Available fee types: Tuition Fee (₹75,000), Development Fee (₹15,000), Hostel Fee (₹45,000), Examination Fee (₹5,000)

Payment methods available:
- Crypto: Sepolia ETH (testnet) via MetaMask or WalletConnect
- UPI: Manual transfer with ID copy
- Net Banking: Bank transfer flow
- Cash: Counter payment with receipt

Be proactive in offering help and always confirm important actions.
"""


class BillDeskAgent(Agent):
    """BEC BillDesk Voice Agent"""
    
    def __init__(self):
        super().__init__(instructions=SYSTEM_INSTRUCTIONS)


async def entrypoint(ctx: agents.JobContext):
    """Main entry point for the voice agent"""
    
    logger.info("🚀 Agent entrypoint called!")
    logger.info(f"📍 Room: {ctx.room.name if ctx.room else 'No room'}")
    
    # Wait for room to be connected
    await ctx.connect()
    logger.info(f"✅ Connected to room: {ctx.room.name}")
    
    # Initialize the agent
    agent = BillDeskAgent()
    
    # Set up LLM with Cerebras (via OpenAI plugin)
    llm = openai.LLM(
        base_url="https://api.cerebras.ai/v1",
        api_key=os.getenv("CEREBRAS_API_KEY"),
        model="llama3.1-8b"
    )
    
    # Create the agent session
    logger.info("📦 Creating agent session...")
    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="en"),
        llm=llm,
        tts=cartesia.TTS(
            model="sonic-2",
            voice="f786b574-daa5-4673-aa0c-cbe3e8534c02",
        ),
        vad=silero.VAD.load(),
    )
    
    logger.info("▶️ Starting agent session...")
    
    # Start the agent session
    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(
            noise_cancellation=True,
        ),
    )
    
    logger.info("🎤 Agent session started! Generating greeting...")
    
    # Generate initial greeting
    await session.generate_reply(
        instructions="Greet the student warmly! Say: Hello! I'm ARIA, your BEC BillDesk assistant. How can I help you with your college fees today?"
    )
    
    logger.info("✅ Greeting sent! Agent is now listening...")
    
    # Keep the agent running
    await asyncio.Future()


if __name__ == "__main__":
    logger.info("🏁 Starting BillDesk Voice Agent...")
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
