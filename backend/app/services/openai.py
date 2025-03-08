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


async def generate_questions(topic: str, position: str = None, seniority: str = None) -> List[Dict[str, Any]]:
    """
    Generate diverse interview questions based on topic, position, and seniority level.
    Returns a list of structured question objects.
    """
    logger.info(f"Generating questions for topic: {topic}, position: {position}, seniority: {seniority}")

    system_prompt = """You are an expert technical interviewer. Generate a diverse set of interview questions following these guidelines:

    1. Question Types (create a balanced mix):
       - Technical knowledge questions
       - Problem-solving scenarios
       - System design questions (for senior roles)
       - Behavioral questions
       - Experience-based questions

    2. Difficulty Distribution:
       - 2 Easy questions (fundamental concepts)
       - 4 Medium questions (practical applications)
       - 2 Hard questions (complex scenarios)

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

    Format each question as a JSON object with:
    {
        "question": "Main question text",
        "type": "technical|behavioral|problem-solving|system-design|experience",
        "difficulty": "easy|medium|hard",
        "category": "Specific area within the topic",
        "follow_up": ["Follow-up question 1", "Follow-up question 2"],
        "expected_topics": ["Key points to cover in the answer"],
        "evaluation_criteria": ["Specific aspects to evaluate"]
    }
    """

    user_prompt = f"""Generate interview questions for:
    Topic: {topic}
    Position: {position or 'Not specified'}
    Seniority Level: {seniority or 'Not specified'}

    Ensure questions are:
    1. Relevant to the specific position and seniority level
    2. Progressive in difficulty
    3. Cover both theoretical knowledge and practical experience
    4. Include scenario-based questions
    5. Appropriate for evaluating candidate competency
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

        # Parse and validate response
        questions = json.loads(response.choices[0].message.content)

        # Validate question structure
        validated_questions = []
        required_fields = ['question', 'type', 'difficulty', 'category', 'follow_up', 'expected_topics',
                           'evaluation_criteria']

        for q in questions:
            if all(key in q for key in required_fields):
                # Additional validation
                if not isinstance(q['follow_up'], list) or not isinstance(q['expected_topics'], list):
                    logger.warning(f"Invalid question format: {q}")
                    continue

                # Clean and validate the question text
                q['question'] = q['question'].strip()
                if not q['question']:
                    continue

                validated_questions.append(q)
            else:
                logger.warning(f"Skipping malformed question: {q}")

        if not validated_questions:
            raise ValueError("No valid questions generated")

        logger.info(f"Successfully generated {len(validated_questions)} questions")
        return validated_questions

    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}", exc_info=True)
        # Return a basic set of fallback questions
        return [
            {
                "question": f"Can you explain your experience with {topic}?",
                "type": "experience",
                "difficulty": "easy",
                "category": "Background",
                "follow_up": ["What challenges did you face?", "How did you overcome them?"],
                "expected_topics": ["Relevant experience", "Problem-solving approach"],
                "evaluation_criteria": ["Communication clarity", "Experience depth"]
            },
            {
                "question": f"Describe a complex problem you solved using {topic}",
                "type": "problem-solving",
                "difficulty": "medium",
                "category": "Problem Solving",
                "follow_up": ["What alternatives did you consider?", "How did you measure success?"],
                "expected_topics": ["Problem analysis", "Solution implementation"],
                "evaluation_criteria": ["Technical knowledge", "Decision making"]
            }
        ]


async def analyze_response(response_data: dict) -> dict:
    """
    Analyze interview responses with enhanced criteria and scoring.
    """
    question = response_data["response"]["question"]
    response = response_data["response"]["response"]

    logger.info("Starting response analysis")
    prompt = f"""
    Analyze the following interview response:

    Question: "{question}"
    Response: "{response}"

    Provide a comprehensive analysis covering:

    1. Technical Knowledge (0-100):
       - Understanding of core concepts
       - Accuracy of information
       - Depth of knowledge
       - Use of technical terminology
       - Current industry awareness

    2. Communication Skills (0-100):
       - Clarity of expression
       - Structure and organization
       - Professional language use
       - Ability to explain complex concepts
       - Engagement and confidence

    3. Problem-Solving (0-100):
       - Analytical thinking/in
       - Approach methodology
       - Solution creativity
       - Consideration of alternatives
       - Understanding of trade-offs

    4. Overall Assessment:
       - Strengths demonstrated
       - Areas for improvement
       - Specific recommendations
       - Overall impression

    Format your response as JSON with:
    - Numerical scores for each category
    - Detailed feedback points
    - Specific improvement suggestions
    - Overall evaluation summary
    """

    try:
        logger.info("Making API call to OpenAI for response analysis")
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at analyzing interview responses. Provide detailed, actionable feedback."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )

        # Parse and validate the analysis
        analysis = json.loads(response.choices[0].message.content)

        # Ensure all required fields are present
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

        return {
            "knowledge_score": analysis['technical_score'],
            "communication_score": analysis['communication_score'],
            "problem_solving_score": analysis['problem_solving_score'],
            "strengths": analysis['strengths'],
            "improvements": analysis['improvements'],
            "recommendations": analysis['recommendations'],
            "overall_summary": analysis['overall_summary']
        }

    except Exception as e:
        logger.error(f"Error analyzing response: {str(e)}", exc_info=True)
        return {
            "knowledge_score": 0,
            "communication_score": 0,
            "problem_solving_score": 0,
            "strengths": [],
            "improvements": ["Unable to analyze response"],
            "recommendations": ["Please try again"],
            "overall_summary": "Analysis failed"
        }