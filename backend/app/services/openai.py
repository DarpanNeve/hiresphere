import logging
import json
from openai import OpenAI
from app.core.config import settings
import re
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(
    base_url=settings.OPENAI_API_BASE_URL,
    api_key=settings.OPENAI_API_KEY
)

def fallback_questions(topic: str, count: int) -> List[str]:
    """Return a fallback list of interview questions."""
    fallback = [
        f"Can you explain your experience with {topic}?",
        f"What are the core concepts of {topic}?",
        f"Describe a challenging problem you solved using {topic}?",
        f"What are the best practices when working with {topic}?",
        f"How would you handle a complex {topic} implementation?"
    ]
    return fallback[:count]

async def generate_questions(topic: str, position: str = None, seniority: str = None) -> List[str]:
    """
    Generate diverse interview questions based on topic, position, and seniority level.
    Returns a list of question strings.
    """
    logger.info(f"Generating questions for topic: {topic}, position: {position}, seniority: {seniority}")

    system_prompt = f"""You are an expert technical interviewer. Generate exactly {settings.DEFAULT_QUESTION_COUNT} interview questions following these guidelines:

1. Question Types (create a balanced mix):
   - Technical knowledge questions
   - Problem-solving scenarios
   - System design questions (for senior roles)
   - Behavioral questions
   - Experience-based questions

2. Difficulty Distribution:
   - 30% Easy questions (fundamental concepts)
   - 50% Medium questions (practical applications)
   - 20% Hard questions (complex scenarios)

3. Question Structure:
   - Clear and concise wording
   - Real-world context when applicable
   - Progressive complexity
   - Include follow-up questions to probe deeper

4. Coverage Areas:
   - Core concepts of the topic
   - Best practices and patterns
   - Common pitfalls and challenges
   - Industry standards and trends
   - Practical application scenarios

Return the questions in a valid JSON array format where each question is a string.
"""

    user_prompt = f"""Generate {settings.DEFAULT_QUESTION_COUNT} interview questions for:
Topic: {topic}
Position: {position or 'Not specified'}
Seniority Level: {seniority or 'Not specified'}

Ensure questions are:
1. Relevant to the specific position and seniority level.
2. Progressive in difficulty.
3. Cover both theoretical knowledge and practical experience.
4. Include scenario-based questions.
"""

    try:
        logger.info("Making API call to OpenAI for question generation")
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )

        content = response.choices[0].message.content

        # Try to parse as JSON first
        try:
            questions = json.loads(content)
            if isinstance(questions, list) and questions:
                return [str(q).strip() for q in questions][:settings.DEFAULT_QUESTION_COUNT]
        except json.JSONDecodeError:
            logger.warning("JSON parsing failed for question generation; attempting regex extraction.")

        # Fallback: use regex extraction if JSON parsing fails
        question_pattern = r'(?:\d+\.|[-•*]\s)(.+?)(?=(?:\d+\.|[-•*]\s)|$)'
        matches = re.findall(question_pattern, content, re.DOTALL)
        if matches:
            questions = [q.strip() for q in matches if q.strip()]
            if questions:
                return questions[:settings.DEFAULT_QUESTION_COUNT]

        # Fallback: split by newline and look for question-like sentences
        lines = content.split('\n')
        questions = [
            line.strip() for line in lines
            if line.strip() and ('?' in line or line.strip().lower().startswith(('describe', 'explain')))
        ]
        if questions:
            return questions[:settings.DEFAULT_QUESTION_COUNT]

        logger.warning("Using fallback questions due to parsing issues")
        return fallback_questions(topic, settings.DEFAULT_QUESTION_COUNT)

    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}", exc_info=True)
        return fallback_questions(topic, settings.DEFAULT_QUESTION_COUNT)


async def analyze_response(response_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze interview responses and return analysis in the old code's format.
    The returned dictionary contains:
      - knowledge_score (mapped from technical_score)
      - communication_score
      - confidence_score (mapped from problem_solving_score)
      - feedback (combined detailed feedback, including the original question)
    If the answer is blank, the function returns a fallback analysis without calling OpenAI.
    """
    question = response_data.get("response", {}).get("question", "")
    interview_response = response_data.get("response", {}).get("response", "")

    # If the candidate's answer is blank, do not call OpenAI and return fallback analysis
    if not interview_response.strip():
        logger.info("Interview response is blank. Skipping OpenAI analysis and returning fallback analysis.")
        fallback_feedback = f"Question: {question}\nNo answer was provided for analysis."
        return {
            "knowledge_score": 0,
            "communication_score": 0,
            "confidence_score": 0,
            "feedback": fallback_feedback
        }

    logger.info("Starting response analysis")

    system_prompt = """You are an expert at analyzing interview responses. Provide detailed, actionable feedback in JSON format with the following structure:
{
    "technical_score": <0-100>,
    "communication_score": <0-100>,
    "problem_solving_score": <0-100>,
    "strengths": ["strength1", "strength2", ...],
    "improvements": ["improvement1", "improvement2", ...],
    "recommendations": ["recommendation1", "recommendation2", ...],
    "overall_summary": "detailed summary"
}
"""

    user_prompt = f"""Analyze this interview response:

Question: "{question}"
Response: "{interview_response}"

Evaluate:
1. Technical Knowledge (0-100)
2. Communication Skills (0-100)
3. Problem-Solving (0-100)

Provide detailed feedback including strengths, areas for improvement, and recommendations.
Return the analysis in valid JSON format.
"""

    try:
        logger.info("Making API call to OpenAI for response analysis")
        completion = client.chat.completions.create(
            model=settings.OPENAI_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        content = completion.choices[0].message.content

        try:
            analysis = json.loads(content)
            # Validate required fields in the new analysis response
            required_fields = [
                'technical_score',
                'communication_score',
                'problem_solving_score',
                'strengths',
                'improvements',
                'recommendations',
                'overall_summary'
            ]
            if not all(field in analysis for field in required_fields):
                raise ValueError("Incomplete analysis response")

            # Normalize scores within 0-100
            technical_score = min(100, max(0, int(analysis.get('technical_score', 0))))
            communication_score = min(100, max(0, int(analysis.get('communication_score', 0))))
            problem_solving_score = min(100, max(0, int(analysis.get('problem_solving_score', 0))))

            # Combine strengths, improvements, and recommendations into a single feedback string
            feedback = (
                f"Overall Summary: {analysis.get('overall_summary', '')}\n"
                f"Strengths: {', '.join(analysis.get('strengths', []))}\n"
                f"Improvements: {', '.join(analysis.get('improvements', []))}\n"
                f"Recommendations: {', '.join(analysis.get('recommendations', []))}"
            )

            # Map new metrics to old response keys
            return {
                "knowledge_score": technical_score,
                "communication_score": communication_score,
                "confidence_score": problem_solving_score,
                "feedback": feedback
            }

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Error parsing analysis response: {str(e)}")
            # Fallback to default analysis response
            return {
                "knowledge_score": 70,
                "communication_score": 70,
                "confidence_score": 70,
                "feedback": ("Average performance with room for improvement. Technical knowledge demonstrated, "
                             "but response could be more structured. Practice more mock interviews.")
            }

    except Exception as e:
        logger.error(f"Error analyzing response: {str(e)}", exc_info=True)
        return {
            "knowledge_score": 0,
            "communication_score": 0,
            "confidence_score": 0,
            "feedback": "Analysis failed. Please try again."
        }
