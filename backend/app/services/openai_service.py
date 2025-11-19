from openai import OpenAI
from app.config import settings

class OpenAIService:
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            self.client = OpenAI(api_key=settings.openai_api_key)
    
    def generate_therapy_text(self, user_input: str, language: str = "English") -> str:
        """
        Generate therapy text based on user's mental health concerns.
        
        Args:
            user_input: The patient's mental health concerns
            language: The language in which to generate the therapy text (default: English)
        """
        if not self.client:
            # Return placeholder text if API key is not set
            return f"""Based on your concerns about: {user_input}

I understand that you're going through a challenging time, and I want you to know that your feelings are valid and important. 

Let's work through this together with some guided affirmations and therapeutic insights:

1. **Acknowledgment**: It takes courage to recognize and express what you're feeling. You've already taken an important step by sharing your concerns.

2. **Understanding**: What you're experiencing is a natural response to the challenges you're facing. Your mind and body are working to process these experiences.

3. **Self-Compassion**: Be gentle with yourself during this time. You deserve the same kindness and understanding that you would offer to a loved one.

4. **Growth Mindset**: This moment, as difficult as it may feel, is also an opportunity for growth and healing. Every step forward, no matter how small, is meaningful.

5. **Support**: Remember that you don't have to navigate this alone. There are people who care about you and resources available to support you.

Take a deep breath. Inhale slowly, hold for a moment, and exhale gently. As you breathe, imagine releasing tension and welcoming peace.

You have the strength within you to work through this. Trust in your ability to heal and grow. Each day brings new possibilities, and you're moving forward, even when it doesn't feel like it.

[Note: This is placeholder content. Please configure your OpenAI API key to generate personalized therapy content.]"""

        try:
            language_instruction = f"Generate the entire response in {language}." if language and language != "English" else ""
            
            prompt = f"""You are a compassionate and professional mental health therapist. A patient has shared the following concerns:

"{user_input}"

Please create a guided affirmative therapy session text that:
1. Acknowledges their feelings with empathy
2. Provides therapeutic insights relevant to their concerns
3. Includes positive affirmations
4. Offers practical coping strategies
5. Maintains a warm, supportive, and professional tone
6. Is appropriate for audio therapy (clear, conversational, and easy to listen to)
7. Is approximately 500-800 words
{language_instruction}

Format the response as a natural, flowing therapy session that would be comforting to listen to. {language_instruction}"""

            system_message = f"You are a compassionate mental health therapist specializing in creating therapeutic content for audio therapy sessions. Always respond in {language}." if language and language != "English" else "You are a compassionate mental health therapist specializing in creating therapeutic content for audio therapy sessions."

            response = self.client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"Error generating therapy text: {str(e)}")
    
    def revise_therapy_text_with_prompt(self, base_text: str, prompt_instructions: str) -> str:
        """
        Revise or regenerate therapy text based on psychologist-provided prompt/instructions.
        """
        if not self.client:
            # Fallback: concatenate prompt and base for local/dev
            return f"{base_text}\n\n[Revised per instructions]: {prompt_instructions}"
        try:
            messages = [
                {"role": "system", "content": "You are a compassionate clinical therapist helping to refine therapy scripts for audio delivery. Keep content ethical, supportive, and clinically safe."},
                {"role": "user", "content": f"Here is the current therapy script to revise:\n\n'''{base_text}'''\n\nPlease revise it following these instructions:\n\n{prompt_instructions}\n\nConstraints:\n- Keep warm, supportive tone\n- Keep 500-800 words unless otherwise specified\n- Suitable for audio narration\n- Do not include private data, sensitive identifiers, or diagnostic claims"}
            ]
            response = self.client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                temperature=0.7,
                max_tokens=1500
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"Error revising therapy text: {str(e)}")

openai_service = OpenAIService()

