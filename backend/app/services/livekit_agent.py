"""
LiveKit Agent Service - Handles voice interactions using Gemini.
"""
import asyncio
import logging
from typing import Annotated
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
    tts,
    stt,
)
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import gemini, openai
from app.config import settings

logger = logging.getLogger(__name__)


async def entrypoint(ctx: JobContext):
    """Entrypoint for LiveKit agent jobs."""
    logger.info(f"Agent connected to room: {ctx.room.name}")
    
    # Wait for participant to connect
    await ctx.wait_for_participant()
    
    # Initialize Gemini STT
    stt_model = gemini.STT(
        api_key=settings.gemini_api_key,
    )
    
    # Initialize Gemini LLM
    llm_model = gemini.LLM(
        api_key=settings.gemini_api_key,
        model=settings.gemini_model_id,
    )
    
    # Initialize Gemini TTS
    tts_model = gemini.TTS(
        api_key=settings.gemini_api_key,
        model=settings.gemini_tts_model_id,
    )
    
    # Create the counselor system prompt
    counselor_prompt = """You are Dr. Sarah Chen, a licensed clinical psychologist with 15 years of experience in mental health counseling. You are conducting a professional therapy session.

Your therapeutic approach:
1. **Validate & Empathize**: Acknowledge the patient's feelings with compassion
2. **Therapeutic Inquiry**: Ask open-ended questions to understand their situation better
3. **Normalize & Support**: Help them understand their feelings are valid and common
4. **Explore Together**: Work collaboratively to understand their concerns
5. **Coping & Resources**: Offer immediate coping strategies when appropriate
6. **Build Hope**: Provide encouragement and support

Keep responses conversational, warm, and professional. Speak naturally as if in a real therapy session. Keep responses concise (2-3 sentences) for voice interactions."""

    # Create agent with Gemini pipeline
    agent = VoicePipelineAgent(
        vad=stt_model.create_vad(),
        stt=stt_model,
        llm=llm_model,
        tts=tts_model,
        chat_ctx=llm.ChatContext().append(
            role="system",
            text=counselor_prompt,
        ),
    )
    
    # Start the agent
    agent.start(ctx.room)
    
    # Say initial greeting
    await agent.say(
        "Hello, I'm Dr. Sarah Chen. I'm here to listen and support you today. How are you feeling?",
        allow_interruptions=True,
    )
    
    # Wait for the agent to finish
    await agent.aclose()


if __name__ == "__main__":
    # Configure worker options
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
            ws_url=settings.livekit_url,
        )
    )

