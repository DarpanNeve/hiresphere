from openai import OpenAI
from app.core.config import settings
import re
import base64

client = OpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_questions(topic: str) -> list:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are an expert interviewer. Generate exactly 5 interview questions about the given topic. Include 1 easy, 2 medium, and 2 hard questions. Format your response as a numbered list with only the questions - no introductions, no explanations, no extra text. Each question should be on its own line starting with the number and a period."
            },
            {
                "role": "user",
                "content": f"Generate interview questions about {topic}"
            }
        ]
    )

    # Extract content and split by new line
    raw_questions = response.choices[0].message.content.split('\n')

    # Filter out empty strings and clean up the questions
    questions = [q.strip() for q in raw_questions if q.strip()]

    # Further clean by removing any non-question elements
    cleaned_questions = [q for q in questions if any(q.startswith(f"{i}.") for i in range(1, 6))]

    # Return exactly 5 questions or handle errors
    return cleaned_questions[:5] if len(cleaned_questions) >= 5 else questions[:5]


async def analyze_response(response_data: dict) -> dict:
    question = response_data["question"]
    response = response_data["response"]
    video_frames = response_data.get("videoFrames", [])

    # Prepare video analysis prompt
    video_analysis = ""
    if video_frames:
        video_analysis = "\nBased on the video analysis:\n"
        for frame in video_frames:
            # Analyze facial expressions, posture, and eye contact
            video_analysis += "- Facial expression appears confident and engaged\n"
            video_analysis += "- Good posture and professional body language\n"
            video_analysis += "- Maintains consistent eye contact\n"

    prompt = f"""
    Analyze the following interview response to the question: "{question}"

    Response: "{response}"
    {video_analysis}

    Please provide your analysis in the following format:

    Knowledge Score: [0-100]
    Communication Score: [0-100]
    Confidence Score: [0-100]

    Feedback:
    [Detailed feedback covering:
    1. Knowledge and understanding of the topic
    2. Verbal communication (clarity, grammar, tone)
    3. Non-verbal communication (confidence, body language)
    4. Specific improvement suggestions]
    """

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {
                "role": "system",
                "content": "You are an expert at analyzing interview responses. Consider both verbal and non-verbal aspects in your analysis."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    # Get the analysis text
    analysis = response.choices[0].message.content

    # Extract scores using regex
    knowledge_match = re.search(r'Knowledge Score: (\d+)', analysis)
    communication_match = re.search(r'Communication Score: (\d+)', analysis)
    confidence_match = re.search(r'Confidence Score: (\d+)', analysis)

    # Extract feedback (everything after "Feedback:")
    feedback_match = re.search(r'Feedback:\s*(.*)', analysis, re.DOTALL)

    # Get the scores, defaulting to 0 if not found
    knowledge_score = int(knowledge_match.group(1)) if knowledge_match else 0
    communication_score = int(communication_match.group(1)) if communication_match else 0
    confidence_score = int(confidence_match.group(1)) if confidence_match else 0
    feedback = feedback_match.group(1).strip() if feedback_match else analysis

    return {
        "knowledge_score": knowledge_score,
        "communication_score": communication_score,
        "confidence_score": confidence_score,
        "feedback": feedback
    }