import requests
import os
from app.config import settings

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.elevenlabs_api_key
        self.voice_id = settings.elevenlabs_voice_id
        self.model_id = settings.elevenlabs_model_id
        self.base_url = "https://api.elevenlabs.io/v1"
        
    def text_to_speech(self, text: str, output_path: str, voice_id: str | None = None) -> str:
        """
        Convert text to speech using Eleven Labs API and save to file.
        Returns the path to the saved audio file.
        """
        if not self.api_key:
            raise Exception("Eleven Labs API key is not configured. Please set ELEVENLABS_API_KEY in your environment variables.")
        
        use_voice_id = voice_id or self.voice_id
        if not use_voice_id:
            raise Exception("No ElevenLabs voice_id is configured or provided.")
        
        url = f"{self.base_url}/text-to-speech/{use_voice_id}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        data = {
            "text": text,
            "model_id": self.model_id,  # Configurable model (default: eleven_turbo_v2_5)
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=60)
            try:
                response.raise_for_status()
            except requests.exceptions.RequestException as e:
                # Include ElevenLabs API error body for easier debugging
                detail = None
                try:
                    detail = response.json()
                except Exception:
                    detail = response.text
                # Detect subscription/payment issues and raise a specific error
                try:
                    if isinstance(detail, dict):
                        detail_obj = detail.get("detail") or {}
                        status_code = getattr(response, "status_code", None)
                        if (isinstance(detail_obj, dict) and detail_obj.get("status") == "payment_issue") or status_code == 402:
                            message = detail_obj.get("message") or "Payment required to use ElevenLabs API."
                            raise ElevenLabsPaymentIssueError(message)
                except Exception:
                    # Fallback to generic error if parsing fails
                    pass
                raise Exception(f"Eleven Labs API error: {detail}") from e
            
            # Ensure output directory exists
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Save audio file
            with open(output_path, "wb") as f:
                f.write(response.content)
            
            return output_path
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error generating audio: {str(e)}")
    
    def list_voices(self) -> list[dict]:
        """
        Fetch available voices with preview audio URLs from ElevenLabs.
        Returns a list of dicts: { id, name, preview_url }
        """
        if not self.api_key:
            raise Exception("Eleven Labs API key is not configured. Please set ELEVENLABS_API_KEY in your environment variables.")
        
        url = f"{self.base_url}/voices"
        headers = {
            "Accept": "application/json",
            "xi-api-key": self.api_key
        }
        resp = requests.get(url, headers=headers, timeout=30)
        try:
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise Exception(f"Failed to fetch voices from ElevenLabs: {detail}") from e
        
        payload = resp.json() or {}
        voices = payload.get("voices") or []
        result = []
        for v in voices:
            preview_url = None
            samples = v.get("samples") or []
            if samples and isinstance(samples, list):
                preview_url = samples[0].get("preview_url") or samples[0].get("file_url")
            result.append({
                "id": v.get("voice_id") or v.get("voice_id") or v.get("id"),
                "name": v.get("name"),
                "preview_url": preview_url
            })
        return result
    
class ElevenLabsPaymentIssueError(Exception):
    pass

elevenlabs_service = ElevenLabsService()

