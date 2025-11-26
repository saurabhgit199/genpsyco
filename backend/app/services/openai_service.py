from openai import OpenAI
from app.config import settings
import random

class OpenAIService:
    def __init__(self):
        self.client = None
        if settings.openai_api_key:
            self.client = OpenAI(api_key=settings.openai_api_key)
    
    def generate_therapy_text(self, user_input: str, language: str = "English") -> str:
        """
        Generate personalized, varied therapy text based on user's mental health concerns.
        
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
            # Analyze the input to determine condition type
            user_input_lower = user_input.lower()
            condition_keywords = {
                "anxiety": ["anxious", "anxiety", "worried", "worry", "panic", "nervous", "fear", "afraid"],
                "depression": ["depressed", "depression", "sad", "sadness", "hopeless", "empty", "down", "low"],
                "stress": ["stressed", "stress", "overwhelmed", "pressure", "burnout", "exhausted"],
                "grief": ["grief", "loss", "mourning", "bereavement", "died", "death", "passed"],
                "trauma": ["trauma", "traumatic", "abuse", "violence", "ptsd", "flashback"],
                "relationship": ["relationship", "partner", "spouse", "friend", "conflict", "argument", "breakup"],
                "self-esteem": ["self-esteem", "confidence", "worth", "value", "inadequate", "failure"]
            }
            
            detected_condition = "general"
            for condition, keywords in condition_keywords.items():
                if any(keyword in user_input_lower for keyword in keywords):
                    detected_condition = condition
                    break
            
            # Select a therapy structure for variety
            therapy_structures = [
                "narrative_journey",
                "guided_exploration", 
                "mindful_presence",
                "cognitive_reframing",
                "compassionate_dialogue",
                "strength_based"
            ]
            selected_structure = random.choice(therapy_structures)
            
            # Create condition-specific therapy approaches
            condition_approaches = {
                "anxiety": "Focus on grounding techniques, thought challenging, and anxiety management strategies. Include progressive muscle relaxation or breathing exercises.",
                "depression": "Focus on behavioral activation, self-compassion practices, and values-based actions. Include gentle movement or gratitude exercises.",
                "stress": "Focus on stress management, boundary-setting, and time management reframing. Include stress inoculation techniques.",
                "grief": "Focus on grief processing, meaning-making, and continuing bonds. Include gentle remembrance practices.",
                "trauma": "Focus on safety-building, resource installation, and gentle processing. Include grounding and containment exercises.",
                "relationship": "Focus on communication skills, attachment awareness, and boundary work. Include perspective-taking exercises.",
                "self-esteem": "Focus on self-compassion, strength identification, and reframing self-criticism. Include self-affirmation practices.",
                "general": "Focus on emotional validation, coping strategies, and resilience-building. Include mindfulness and self-care practices."
            }
            
            approach_guidance = condition_approaches.get(detected_condition, condition_approaches["general"])
            
            language_instruction = f"Generate the entire response in {language}." if language and language != "English" else ""
            
            prompt = f"""You are an experienced, compassionate mental health therapist. A patient has shared the following concerns:

"{user_input}"

ANALYSIS:
- Detected Condition Focus: {detected_condition}
- Therapy Structure: {selected_structure}
- Recommended Approach: {approach_guidance}

Create a UNIQUE, PERSONALIZED therapeutic audio session {language_instruction} that:

PERSONALIZATION:
1. Directly references specific concerns, feelings, or situations mentioned in their input
2. Uses their words or phrases when appropriate to show understanding
3. Addresses their specific emotional experience (not generic advice)
4. Tailors all strategies and exercises to their mentioned concerns

VARIETY & UNIQUENESS:
5. Uses the {selected_structure} format - make it different from generic therapy scripts
6. Includes unique therapeutic techniques: {approach_guidance}
7. Varies pacing with moments of reflection, active exercises, and gentle guidance
8. Uses creative metaphors or examples relevant to their situation
9. Includes 2-3 specific, actionable exercises (not just general advice)

CONTENT REQUIREMENTS:
10. Deeply acknowledges and validates their specific feelings
11. Provides personalized coping strategies tailored to their concern
12. Includes a guided exercise (breathing, visualization, body scan, or cognitive exercise)
13. Offers perspective shifts relevant to their condition
14. Includes personalized affirmations addressing their specific concerns
15. Ends with hope and forward movement specific to their journey
16. Maintains warm, supportive, professional tone
17. Suitable for audio narration (8-10 minutes when read aloud, 600-900 words)

IMPORTANT: Make this feel like it was created specifically for THIS patient based on THEIR unique concerns. Avoid generic, repetitive content. Each therapy session should feel fresh and personally tailored.

Format as a continuous, flowing narrative that would be comforting and healing to listen to. {language_instruction}"""

            system_message = f"""You are a highly skilled mental health therapist with expertise in multiple therapeutic modalities (CBT, ACT, mindfulness, narrative therapy, trauma-informed care). 

You specialize in creating deeply personalized, varied therapy content that:
- Is tailored to each patient's specific condition and concerns
- Uses different therapeutic approaches and structures to avoid repetition
- Feels authentic, personal, and directly relevant to the patient's experience
- Incorporates evidence-based techniques appropriate for their condition

Always respond in {language}.""" if language and language != "English" else """You are a highly skilled mental health therapist with expertise in multiple therapeutic modalities (CBT, ACT, mindfulness, narrative therapy, trauma-informed care). 

You specialize in creating deeply personalized, varied therapy content that:
- Is tailored to each patient's specific condition and concerns
- Uses different therapeutic approaches and structures to avoid repetition
- Feels authentic, personal, and directly relevant to the patient's experience
- Incorporates evidence-based techniques appropriate for their condition"""

            response = self.client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.85,  # Higher temperature for more variety and creativity
                max_tokens=2000  # Allow for more comprehensive, varied content
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

