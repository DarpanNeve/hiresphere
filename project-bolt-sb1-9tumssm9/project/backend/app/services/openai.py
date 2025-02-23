from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)

async def generate_questions(topic: str) -> list:
    response = await client.chat.completions.create(
        model="gpt-4",
        messages=[
            {
                "role": "system",
                "content": "You are an expert interviewer. Generate relevant interview questions for the given topic."
            },
            {
                "role": "user",
                "content": f"Generate 5 interview questions about {topic}"
            }
        ]
    )
    return response.choices[0].message.content.split('\n')

async def analyze_response(response: str, question: str) -> dict:
    prompt = f"""
    Analyze the following interview response to the question: "{question}"
    
    Response: "{response}"
    
    Provide scores and feedback for:
    1. Knowledge (1-100)
    2. Communication clarity (1-100)
    3. Confidence (1-100)
    4. Specific feedback and improvement suggestions
    """
    
    response = await client.chat.completions.create(
        model="gpt-4",
        messages=[
            {
                "role": "system",
                "content": "You are an expert at analyzing interview responses."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    
    # Parse the response and extract scores and feedback
    analysis = response.choices[0].message.content
    
    return {
        "knowledge_score": 85,  # Replace with actual parsed scores
        "communication_score": 80,
        "confidence_score": 75,
        "feedback": analysis
    }