import logging
from openai import OpenAI
from app.core.config import settings
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_questions(topic: str) -> list:
    logger.info(f"Generating interview questions for topic: {topic}")
    try:
        logger.info("Making API call to OpenAI for question generation")
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

        logger.info("Successfully received response from OpenAI")
        logger.debug(f"Raw OpenAI response: {response}")

        raw_questions = response.choices[0].message.content.split('\n')
        logger.info(f"Extracted {len(raw_questions)} raw questions")

        questions = [q.strip() for q in raw_questions if q.strip()]
        logger.info(f"Cleaned up to {len(questions)} non-empty questions")

        cleaned_questions = [q for q in questions if any(q.startswith(f"{i}.") for i in range(1, 6))]
        logger.info(f"Final question count: {len(cleaned_questions)}")

        final_questions = cleaned_questions[:5] if len(cleaned_questions) >= 5 else questions[:5]
        logger.info("Final questions generated successfully")
        for i, q in enumerate(final_questions, 1):
            logger.debug(f"Question {i}: {q}")

        return final_questions

    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}", exc_info=True)
        raise Exception(f"Failed to generate questions: {str(e)}")


async def analyze_response(response_data: dict) -> dict:
    question = response_data["response"]["question"]
    response = response_data["response"]["response"]

    logger.info("Starting response analysis")
    logger.info(f"Analyzing response for question: {question[:100]}...")
    logger.info(f"Response length: {len(response)} characters")

    prompt = f"""
    Analyze the following interview response to the question: "{question}"

    Response: "{response}"

    Please provide your analysis in the following format:

    Knowledge Score: [0-100]
    Communication Score: [0-100]
    Confidence Score: [0-100]

    Feedback:
    [Detailed feedback covering:
    1. Knowledge and understanding of the topic
    2. Verbal communication (clarity, grammar, tone)
    3. Specific improvement suggestions]
    """

    try:
        logger.info("Making API call to OpenAI for response analysis")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at analyzing interview responses. Provide detailed feedback on knowledge and communication."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        logger.info("Successfully received analysis from OpenAI")
        logger.debug(f"Raw OpenAI response: {response}")

        analysis = response.choices[0].message.content
        logger.debug(f"Extracted analysis text: {analysis}")

        knowledge_match = re.search(r'Knowledge Score: (\d+)', analysis)
        communication_match = re.search(r'Communication Score: (\d+)', analysis)
        confidence_match = re.search(r'Confidence Score: (\d+)', analysis)

        feedback_match = re.search(r'Feedback:\s*(.*)', analysis, re.DOTALL)

        knowledge_score = int(knowledge_match.group(1)) if knowledge_match else 0
        communication_score = int(communication_match.group(1)) if communication_match else 0
        confidence_score = int(confidence_match.group(1)) if confidence_match else 0
        feedback = feedback_match.group(1).strip() if feedback_match else analysis

        logger.info(
            f"Extracted scores - Knowledge: {knowledge_score}, Communication: {communication_score}, Confidence: {confidence_score}")
        logger.debug(f"Extracted feedback length: {len(feedback)} characters")

        result = {
            "knowledge_score": knowledge_score,
            "communication_score": communication_score,
            "confidence_score": confidence_score,
            "feedback": feedback
        }

        logger.info("Successfully completed response analysis")
        return result

    except Exception as e:
        logger.error(f"Error analyzing response: {str(e)}", exc_info=True)
        raise Exception(f"Failed to analyze response: {str(e)}")