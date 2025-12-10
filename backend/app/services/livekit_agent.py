"""LiveKit Agent Service - Handles voice interactions using Gemini (Google).""" 
import asyncio 
import logging 
import os 
from livekit.agents import JobContext, llm 
from livekit.agents.voice import Agent 
from livekit.plugins import google as google_plugins 
from app.config import settings 
 
logger = logging.getLogger(__name__) 
 
# Ensure Gemini API key is available as environment variable for plugins 
if settings.gemini_api_key and not os.getenv("GEMINI_API_KEY"): 
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key 
 
 
async def entrypoint(ctx: JobContext): 
    """Entrypoint for LiveKit agent jobs.""" 
    logger.info(f"Agent connected to room: {ctx.room.name}") 
 
    # Ensure the room is connected before waiting for participants
    if not ctx.room.is_connected:
        await ctx.connect()

    # Wait for participant to connect
    await ctx.wait_for_participant()
 
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
 
    # Configure Google/Gemini plugins explicitly with API key 
    stt_model = google_plugins.STT(credentials_info=None, credentials_file=None) 
    llm_model = google_plugins.LLM( 
        model=settings.gemini_model_id, 
        api_key=settings.gemini_api_key, 
    ) 
    tts_model = google_plugins.TTS( 
        voice_name=None, 
        language=None, 
        credentials_info=None, 
        credentials_file=None, 
    ) 
 
    agent = Agent( 
        instructions=counselor_prompt, 
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

