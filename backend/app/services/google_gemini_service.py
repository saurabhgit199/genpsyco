import base64
import os
from typing import List, Dict
import requests
from app.config import settings
import io
import wave

VOICE_INSTRUCTION = (
    "Read aloud in a slow, calming, meditative female voice.\n"
    "Keep the tone warm, gentle, and soothing, as if guiding someone through a healing therapy session.\n"
    "Maintain soft pauses and relaxed breathing throughout."
)

DEFAULT_VOICES = [
    {"id": "kore", "name": "Kore (Warm & Calming)", "voice_name": "Kore"},
    {"id": "achernar", "name": "Achernar (Gentle)", "voice_name": "Achernar"},
    {"id": "solaria", "name": "Solaria (Narrative)", "voice_name": "Solaria"},
]


class GoogleGeminiService:
    def __init__(self):
        self.api_key = settings.gemini_api_key
        self.tts_model_id = settings.gemini_tts_model_id
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.tts_model_id}:generateContent"

    def list_voices(self) -> List[Dict[str, str]]:
        return DEFAULT_VOICES

    def text_to_speech(self, text: str, output_path: str, voice_id: str | None = None, instruction: str | None = None) -> str:
        if not self.api_key:
            raise Exception("Gemini API key is not configured. Please set GEMINI_API_KEY.")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        selected_voice = voice_id or DEFAULT_VOICES[0]["id"]
        voice_name = next((v["voice_name"] for v in DEFAULT_VOICES if v["id"] == selected_voice), "Kore")

        directive = instruction.strip() if instruction and instruction.strip() else VOICE_INSTRUCTION

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "text": directive
                        },
                        {
                            "text": text
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {
                            "voiceName": voice_name
                        }
                    }
                }
            }
        }

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }

        response = requests.post(self.base_url, headers=headers, json=payload, timeout=120)
        if response.status_code != 200:
            raise Exception(f"Google Gemini API error: {response.text}")

        data = response.json()
        audio_b64 = None
        candidates = data.get("candidates", [])
        for candidate in candidates:
            parts = candidate.get("content", {}).get("parts", [])
            for part in parts:
                inline_data = part.get("inline_data") or part.get("inlineData")
                if inline_data and inline_data.get("mime_type", inline_data.get("mimeType", "")).startswith("audio/"):
                    audio_b64 = inline_data.get("data")
                    break
            if audio_b64:
                break

        if not audio_b64:
            raise Exception("Google Gemini API did not return audio data.")

        audio_bytes = base64.b64decode(audio_b64)
        
        if not audio_bytes:
            raise Exception("Google Gemini API returned empty audio data.")

        # Ensure .wav extension
        if not output_path.lower().endswith(".wav"):
            output_path = os.path.splitext(output_path)[0] + ".wav"

        # Ensure we save a valid WAV file even if the model returned raw PCM
        # If it is already WAV (RIFF header present), write as-is.
        if len(audio_bytes) >= 4 and audio_bytes[:4] == b"RIFF":
            with open(output_path, "wb") as f:
                f.write(audio_bytes)
        else:
            # Wrap raw PCM 16-bit mono at 24kHz into a WAV container
            # These defaults align with typical Gemini TTS raw output; adjust if needed.
            sample_rate_hz = 24000
            num_channels = 1
            sample_width = 2  # 16-bit PCM
            
            try:
                with io.BytesIO() as wav_io:
                    with wave.open(wav_io, "wb") as wf:
                        wf.setnchannels(num_channels)
                        wf.setsampwidth(sample_width)
                        wf.setframerate(sample_rate_hz)
                        wf.writeframes(audio_bytes)
                    wav_data = wav_io.getvalue()
                
                # Verify the WAV file was created correctly
                if len(wav_data) < 12 or wav_data[:4] != b"RIFF":
                    raise Exception("Failed to create valid WAV file from PCM data.")
                
                with open(output_path, "wb") as f:
                    f.write(wav_data)
            except Exception as e:
                raise Exception(f"Error wrapping PCM data into WAV format: {str(e)}")

        # Verify the saved file is a valid WAV
        with open(output_path, "rb") as f:
            header = f.read(4)
            if header != b"RIFF":
                raise Exception(f"Saved file does not have valid WAV header. Got: {header}")

        return output_path


google_gemini_service = GoogleGeminiService()

