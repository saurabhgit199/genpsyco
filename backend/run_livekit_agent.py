#!/usr/bin/env python3
"""
LiveKit Agent Runner

This script starts the LiveKit agent worker that handles voice interactions.
Run this as a separate process alongside your FastAPI backend.

Usage:
    python run_livekit_agent.py

Or with environment variables:
    LIVEKIT_URL=wss://your-livekit-server.com \
    LIVEKIT_API_KEY=your-api-key \
    LIVEKIT_API_SECRET=your-api-secret \
    GEMINI_API_KEY=your-gemini-key \
    python run_livekit_agent.py
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.livekit_agent import entrypoint
from app.config import settings
from livekit.agents.worker import WorkerOptions, AgentServer

if __name__ == "__main__":
    if not settings.livekit_url or not settings.livekit_api_key or not settings.livekit_api_secret:
        print("ERROR: LiveKit configuration missing!")
        print("Please set the following environment variables:")
        print("  - LIVEKIT_URL")
        print("  - LIVEKIT_API_KEY")
        print("  - LIVEKIT_API_SECRET")
        print("  - GEMINI_API_KEY (for voice interactions)")
        sys.exit(1)
    
    if not settings.gemini_api_key:
        print("ERROR: Gemini API key missing!")
        print("Please set GEMINI_API_KEY in your environment variables.")
        sys.exit(1)
    
    print("Starting LiveKit Agent...")
    print(f"LiveKit URL: {settings.livekit_url}")
    print(f"Gemini Model: {settings.gemini_model_id}")
    
    # Build server from WorkerOptions and run directly (avoids CLI missing command issue)
    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        api_key=settings.livekit_api_key,
        api_secret=settings.livekit_api_secret,
        ws_url=settings.livekit_url,
    )
    server = AgentServer.from_server_options(options)
    server.run(devmode=True)

